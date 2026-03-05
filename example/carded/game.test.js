import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock Three.js
// Initialize a minimal domElement to avoid appendChild error
const mockCanvas = { nodeType: 1, nodeName: 'CANVAS', style: {}, appendChild: () => {}, removeChild: () => {} };

const mockTHREE = {
    Scene: class { background = {}; fog = {}; add() {} remove() {} },
    PerspectiveCamera: class { position = { set() {} }; lookAt() {} updateProjectionMatrix() {} },
    WebGLRenderer: class { setSize() {} setPixelRatio() {} render() {} domElement = mockCanvas; shadowMap = {} },
    Color: class {},
    FogExp2: class {},
    AmbientLight: class {},
    DirectionalLight: class { position = { set() {} }; shadow = { mapSize: {} }; },
    CylinderGeometry: class {},
    TorusGeometry: class {},
    BoxGeometry: class {},
    MeshStandardMaterial: class {},
    Mesh: class { position = {}; rotation = {}; },
    CanvasTexture: class { repeat = { set() {} }; },
    RepeatWrapping: 1,
    MathUtils: { degToRad: () => 0 },
    DoubleSide: 2,
    AdditiveBlending: 1
};

vi.mock('three', () => mockTHREE);
vi.mock('three/addons/controls/OrbitControls.js', () => ({
    OrbitControls: class { 
        constructor() { this.enableDamping = false; this.maxPolarAngle = 0; this.minDistance = 0; this.maxDistance = 0; this.target = { lerp: vi.fn() }; } 
        addEventListener() {}
        update() {}
    }
}));

describe('Blackjack Game Logic', () => {
    let game;
    let window, document;

    beforeEach(async () => {
        vi.useFakeTimers();
        const dom = new JSDOM('<!DOCTYPE html><html><body>' +
            '<div id="lobby"></div><div id="hud"></div>' +
            '<input id="player-name" value="TestPlayer">' +
            '<input id="host-id">' +
            '<div id="room-id-display"></div>' +
            '<div id="players-list"></div>' +
            '<div id="status-text"></div>' +
            '<div id="controls"></div>' +
            '<div id="db-status"></div>' +
            '<div id="notification"></div>' +
            '<div id="history-panel"></div>' +
            '<div id="history-content"></div>' +
            '<button id="btn-view-history"></button>' +
            '<button id="btn-close-history"></button>' +
            '<button id="btn-export-db"></button>' +
            '<button id="btn-import-db"></button>' +
            '<input type="file" id="import-db-file">' +
            '</body></html>', { url: "http://localhost/" });

        window = dom.window;
        document = window.document;
        document.body.appendChild = vi.fn();
        global.window = window;
        global.document = document;
        if (!global.navigator) global.navigator = window.navigator;
        global.HTMLElement = window.HTMLElement;
        global.Node = window.Node;
        global.FileReader = window.FileReader;
        global.Blob = window.Blob;
        global.localStorage = { getItem: () => null, setItem: () => {} };
        global.requestAnimationFrame = vi.fn();

        global.TexGen = { bakeAsync: vi.fn().mockResolvedValue('data:image/png;base64,') };
        global.Peer = class { constructor() { this.on = vi.fn(); } };
        global.initSqlJs = vi.fn().mockResolvedValue({
            Database: class { 
                constructor() {} 
                run() {} 
                exec() { return [{ values: [] }]; }
                export() { return new Uint8Array(); }
            }
        });

        game = await import('./game.js?t=' + Date.now());
        
        // Setup initial Host State
        game.State.isHost = true;
        game.State.db = new (await global.initSqlJs()).Database();
        game.State.players = {};
        game.State.dealer = { hand: [] };
        game.State.turnIndex = 0;
        game.State.turnOrder = [];
    });

    it('should calculate Blackjack hands correctly', () => {
        expect(game.calculateBlackjackHand([{rank:'2'}, {rank:'3'}])).toBe(5);
        expect(game.calculateBlackjackHand([{rank:'J'}, {rank:'Q'}])).toBe(20);
        expect(game.calculateBlackjackHand([{rank:'A'}, {rank:'K'}])).toBe(21);
        expect(game.calculateBlackjackHand([{rank:'A'}, {rank:'A'}, {rank:'9'}])).toBe(21);
        expect(game.calculateBlackjackHand([{rank:'A'}, {rank:'A'}, {rank:'K'}])).toBe(12);
    });

    it('should progress through betting, dealing, and playing phases', () => {
        game.addPlayer('p1', 'Alice');
        game.addPlayer('p2', 'Bob');
        
        game.startGame('blackjack');
        expect(game.State.gameState).toBe('blackjack_betting');

        // Players place bets
        game.processGameAction('p1', 'BET', { amount: 100 });
        game.processGameAction('p2', 'BET', { amount: 50 });

        // Once everyone bets, it auto-progresses to playing
        expect(game.State.gameState).toBe('blackjack_playing');
        expect(game.State.players['p1'].balance).toBe(900); // started with 1000
        expect(game.State.players['p2'].balance).toBe(950);
        
        // Initial dealing check
        expect(game.State.dealer.hand.length).toBe(2);
        expect(game.State.players['p1'].hands[0].cards.length).toBe(2);
        
        // Verify turn order
        expect(game.State.turnOrder[game.State.turnIndex]).toBe('p1');
    });

    it('should handle HIT, STAND, and BUST', () => {
        game.addPlayer('p1', 'Alice');
        game.startGame('blackjack');
        game.processGameAction('p1', 'BET', { amount: 10 });
        
        // Manipulate deck so p1 hits and busts
        game.State.players['p1'].hands[0].cards = [{suit:'♠', rank:'10'}, {suit:'♥', rank:'6'}];
        game.State.players['p1'].hands[0].status = 'playing'; // Make sure status isn't incorrectly blackjack
        game.State.dealer.hand = [{suit:'♠', rank:'10'}, {suit:'♥', rank:'10'}]; // Dealer has 20, stands immediately
        game.State.deck = [{suit:'♦', rank:'10'}]; // Next card to draw for player
        
        game.processGameAction('p1', 'HIT');
        vi.advanceTimersByTime(2000); // 1000ms for initial dealer delay + 1000ms for loop
        expect(game.State.players['p1'].hands[0].status).toBe('bust');
        
        // Since p1 is the only player, dealer turn starts
        expect(game.State.gameState).toBe('blackjack_ended');
    });

    it('should handle SPLIT', () => {
        game.addPlayer('p1', 'Alice');
        game.startGame('blackjack');
        game.processGameAction('p1', 'BET', { amount: 100 });
        
        // Give pair
        game.State.players['p1'].hands[0].cards = [{suit:'♠', rank:'8'}, {suit:'♥', rank:'8'}];
        game.State.players['p1'].hands[0].status = 'playing'; // Must be playing to process action
        
        game.processGameAction('p1', 'SPLIT');
        
        // Now should have 2 hands, 1 card each, then auto-dealt a second card for the first hand
        expect(game.State.players['p1'].hands.length).toBe(2);
        expect(game.State.players['p1'].hands[0].cards.length).toBe(2);
        expect(game.State.players['p1'].hands[1].cards.length).toBe(1); // Wait for its turn
        expect(game.State.players['p1'].balance).toBe(800); // 1000 - 100 (initial) - 100 (split)
    });

    it('dealer should hit on 16 and stand on 17', () => {
        game.addPlayer('p1', 'Alice');
        game.startGame('blackjack');
        game.processGameAction('p1', 'BET', { amount: 10 });
        
        game.State.players['p1'].hands[0].cards = [{suit:'♠', rank:'10'}, {suit:'♥', rank:'10'}];
        game.State.dealer.hand = [{suit:'♠', rank:'10'}, {suit:'♥', rank:'6'}]; // 16
        game.State.deck = [{suit:'♦', rank:'10'}, {suit:'♣', rank:'2'}]; // Dealer will draw 2, making 18

        game.processGameAction('p1', 'STAND');
        vi.advanceTimersByTime(3000); // Enough for initial 1000ms delay + 1000ms per hit
        
        // Dealer plays automatically
        expect(game.State.gameState).toBe('blackjack_ended');
        expect(game.calculateBlackjackHand(game.State.dealer.hand)).toBe(18);
        expect(game.State.players['p1'].balance).toBe(1010); // Won 10 (1000 - 10 + 20)
    });
});
