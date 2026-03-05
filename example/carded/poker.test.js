import { describe, it, expect } from 'vitest';
import { evaluatePokerHand, PokerRanks } from './pokerLogic.js';

describe('Poker Hand Evaluator', () => {
    it('should identify a Royal Flush', () => {
        const hole = [{rank: 'A', suit: '♠'}, {rank: 'K', suit: '♠'}];
        const comm = [
            {rank: 'Q', suit: '♠'}, {rank: 'J', suit: '♠'}, {rank: '10', suit: '♠'},
            {rank: '2', suit: '♥'}, {rank: '3', suit: '♦'}
        ];
        const res = evaluatePokerHand(hole, comm);
        expect(res.rankScore).toBe(PokerRanks.ROYAL_FLUSH);
        expect(res.rankName).toBe('Royal Flush');
    });

    it('should identify a Straight Flush', () => {
        const hole = [{rank: '9', suit: '♠'}, {rank: 'K', suit: '♠'}]; // K is extra
        const comm = [
            {rank: '8', suit: '♠'}, {rank: '7', suit: '♠'}, {rank: '6', suit: '♠'},
            {rank: '5', suit: '♠'}, {rank: '3', suit: '♦'}
        ];
        const res = evaluatePokerHand(hole, comm);
        expect(res.rankScore).toBe(PokerRanks.STRAIGHT_FLUSH);
    });

    it('should identify Four of a Kind', () => {
        const hole = [{rank: '8', suit: '♠'}, {rank: '8', suit: '♥'}];
        const comm = [
            {rank: '8', suit: '♦'}, {rank: '8', suit: '♣'}, {rank: 'A', suit: '♠'},
            {rank: '2', suit: '♥'}, {rank: '3', suit: '♦'}
        ];
        const res = evaluatePokerHand(hole, comm);
        expect(res.rankScore).toBe(PokerRanks.FOUR_OF_A_KIND);
    });

    it('should identify a Full House', () => {
        const hole = [{rank: 'K', suit: '♠'}, {rank: 'K', suit: '♥'}];
        const comm = [
            {rank: 'K', suit: '♦'}, {rank: '7', suit: '♣'}, {rank: '7', suit: '♠'},
            {rank: '2', suit: '♥'}, {rank: '3', suit: '♦'}
        ];
        const res = evaluatePokerHand(hole, comm);
        expect(res.rankScore).toBe(PokerRanks.FULL_HOUSE);
    });

    it('should identify a Flush', () => {
        const hole = [{rank: '2', suit: '♠'}, {rank: '4', suit: '♠'}];
        const comm = [
            {rank: '7', suit: '♠'}, {rank: '9', suit: '♠'}, {rank: 'K', suit: '♠'},
            {rank: '2', suit: '♥'}, {rank: '3', suit: '♦'}
        ];
        const res = evaluatePokerHand(hole, comm);
        expect(res.rankScore).toBe(PokerRanks.FLUSH);
    });

    it('should identify a Straight', () => {
        const hole = [{rank: '5', suit: '♠'}, {rank: '6', suit: '♥'}];
        const comm = [
            {rank: '7', suit: '♦'}, {rank: '8', suit: '♣'}, {rank: '9', suit: '♠'},
            {rank: '2', suit: '♥'}, {rank: 'A', suit: '♦'}
        ];
        const res = evaluatePokerHand(hole, comm);
        expect(res.rankScore).toBe(PokerRanks.STRAIGHT);
    });
    
    it('should identify a low Straight (A-2-3-4-5)', () => {
        const hole = [{rank: 'A', suit: '♠'}, {rank: '2', suit: '♥'}];
        const comm = [
            {rank: '3', suit: '♦'}, {rank: '4', suit: '♣'}, {rank: '5', suit: '♠'},
            {rank: 'J', suit: '♥'}, {rank: 'Q', suit: '♦'}
        ];
        const res = evaluatePokerHand(hole, comm);
        expect(res.rankScore).toBe(PokerRanks.STRAIGHT);
    });

    it('should identify Three of a Kind', () => {
        const hole = [{rank: 'Q', suit: '♠'}, {rank: 'Q', suit: '♥'}];
        const comm = [
            {rank: 'Q', suit: '♦'}, {rank: '2', suit: '♣'}, {rank: '5', suit: '♠'},
            {rank: '7', suit: '♥'}, {rank: '9', suit: '♦'}
        ];
        const res = evaluatePokerHand(hole, comm);
        expect(res.rankScore).toBe(PokerRanks.THREE_OF_A_KIND);
    });

    it('should identify Two Pair', () => {
        const hole = [{rank: 'J', suit: '♠'}, {rank: 'J', suit: '♥'}];
        const comm = [
            {rank: '4', suit: '♦'}, {rank: '4', suit: '♣'}, {rank: 'A', suit: '♠'},
            {rank: '7', suit: '♥'}, {rank: '9', suit: '♦'}
        ];
        const res = evaluatePokerHand(hole, comm);
        expect(res.rankScore).toBe(PokerRanks.TWO_PAIR);
    });

    it('should identify a Pair', () => {
        const hole = [{rank: '10', suit: '♠'}, {rank: '8', suit: '♥'}];
        const comm = [
            {rank: '10', suit: '♦'}, {rank: '2', suit: '♣'}, {rank: 'A', suit: '♠'},
            {rank: '7', suit: '♥'}, {rank: '9', suit: '♦'}
        ];
        const res = evaluatePokerHand(hole, comm);
        expect(res.rankScore).toBe(PokerRanks.PAIR);
    });

    it('should identify a High Card', () => {
        const hole = [{rank: 'K', suit: '♠'}, {rank: '8', suit: '♥'}];
        const comm = [
            {rank: '2', suit: '♦'}, {rank: '4', suit: '♣'}, {rank: '7', suit: '♠'},
            {rank: 'J', suit: '♥'}, {rank: '3', suit: '♦'}
        ];
        const res = evaluatePokerHand(hole, comm);
        expect(res.rankScore).toBe(PokerRanks.HIGH_CARD);
    });
    
    it('should resolve ties correctly using tieBreaker', () => {
        const hole1 = [{rank: 'A', suit: '♠'}, {rank: 'K', suit: '♥'}]; // Higher kickers
        const hole2 = [{rank: 'A', suit: '♣'}, {rank: 'Q', suit: '♦'}];
        const comm = [
            {rank: '2', suit: '♦'}, {rank: '2', suit: '♣'}, {rank: '7', suit: '♠'},
            {rank: '8', suit: '♥'}, {rank: '3', suit: '♦'}
        ];
        const res1 = evaluatePokerHand(hole1, comm);
        const res2 = evaluatePokerHand(hole2, comm);
        
        expect(res1.rankScore).toBe(PokerRanks.PAIR);
        expect(res2.rankScore).toBe(PokerRanks.PAIR);
        // A, A, K, 8, 7 > A, A, Q, 8, 7
        expect(res1.tieBreaker > res2.tieBreaker).toBe(true);
    });
});

import { JSDOM } from 'jsdom';
import { vi, beforeEach } from 'vitest';

// Mock Three.js
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

describe('Poker Game Flow Logic', () => {
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
        game.State.turnIndex = 0;
        game.State.turnOrder = [];
    });

    it('should progress through pre-flop, flop, turn, river, and showdown', () => {
        game.addPlayer('p1', 'Alice');
        game.addPlayer('p2', 'Bob');
        
        game.startGame('poker');
        expect(game.State.gameState).toBe('poker_preflop');
        expect(game.State.pokerState.activePlayers.length).toBe(2);
        
        // Both check pre-flop (simplified logic)
        game.processGameAction('p1', 'CHECK');
        expect(game.State.turnIndex).toBe(1);
        game.processGameAction('p2', 'CHECK');
        
        expect(game.State.gameState).toBe('poker_flop');
        expect(game.State.pokerState.communityCards.length).toBe(3);
        
        // Check flop
        game.processGameAction('p1', 'CHECK');
        game.processGameAction('p2', 'CHECK');
        
        expect(game.State.gameState).toBe('poker_turn');
        expect(game.State.pokerState.communityCards.length).toBe(4);
        
        // P1 Bets, P2 Calls
        game.processGameAction('p1', 'RAISE', { amount: 50 });
        expect(game.State.pokerState.pot).toBe(50);
        game.processGameAction('p2', 'CALL');
        expect(game.State.pokerState.pot).toBe(100);
        
        expect(game.State.gameState).toBe('poker_river');
        expect(game.State.pokerState.communityCards.length).toBe(5);
        
        // P1 Folds on river, P2 wins immediately
        game.processGameAction('p1', 'FOLD');
        expect(game.State.pokerState.activePlayers.length).toBe(1);
        expect(game.State.gameState).toBe('poker_ended');
        // P2 gets pot
        expect(game.State.players['p2'].balance).toBe(1050); 
    });
});
