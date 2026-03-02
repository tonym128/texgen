import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Mock TexGen properly as a constructor
const mockTexGen = function() {
    this.init = vi.fn();
    this.render = vi.fn();
    this.bake = vi.fn().mockReturnValue('mock-url');
    this.canvas = { toDataURL: () => 'mock-url' };
};
mockTexGen.decompress = vi.fn().mockReturnValue('mock-src');

describe('Solitaire Game Logic', () => {
    let game;
    let window, document;

    beforeEach(async () => {
        const dom = new JSDOM('<!DOCTYPE html><html><body><div id="slots-container"></div><div id="cards-container"></div><canvas id="bg-canvas"></canvas><div id="victory-overlay"></div></body></html>');
        window = dom.window;
        document = window.document;
        global.window = window;
        global.document = document;
        global.Image = window.Image;
        global.TextEncoder = window.TextEncoder;
        global.TexGen = mockTexGen;

        // Load game.js logic
        const gameJs = fs.readFileSync(path.resolve(__dirname, './game.js'), 'utf8');
        eval(gameJs);
        
        // Manually instantiate since we wrapped it in window.onload
        const SolitaireClass = window.Solitaire || Solitaire;
        game = new SolitaireClass();
        window.game = game;
    });

    it('should initialize with a full deck of 52 cards', () => {
        expect(game.deck.length).toBe(52);
    });

    describe('isValidMove', () => {
        const heartAce = { suit: 'hearts', val: 1, color: 'red' };
        const heart2 = { suit: 'hearts', val: 2, color: 'red' };
        const spadeAce = { suit: 'spades', val: 1, color: 'black' };
        const spade2 = { suit: 'spades', val: 2, color: 'black' };
        const diamond7 = { suit: 'diams', val: 7, color: 'red' };
        const club8 = { suit: 'clubs', val: 8, color: 'black' };
        const club7 = { suit: 'clubs', val: 7, color: 'black' };
        const heartKing = { suit: 'hearts', val: 13, color: 'red' };

        it('should allow building foundation with Aces in correct slot', () => {
            game.piles.f1 = [];
            expect(game.isValidMove(heartAce, 'f1', 1)).toBe(true);
            game.piles.f0 = [];
            expect(game.isValidMove(spadeAce, 'f0', 1)).toBe(true);
        });

        it('should NOT allow building foundation with wrong suit', () => {
            game.piles.f1 = [];
            expect(game.isValidMove(spadeAce, 'f1', 1)).toBe(false);
        });

        it('should build up foundations in order', () => {
            game.piles.f1 = [heartAce];
            expect(game.isValidMove(heart2, 'f1', 1)).toBe(true);
            expect(game.isValidMove({ suit: 'hearts', val: 3, color: 'red' }, 'f1', 1)).toBe(false);
        });

        it('should allow alternating colors on tableau', () => {
            game.piles.t0 = [club8];
            expect(game.isValidMove(diamond7, 't0', 1)).toBe(true);
        });

        it('should NOT allow same color on tableau', () => {
            game.piles.t0 = [club8];
            expect(game.isValidMove(club7, 't0', 1)).toBe(false);
        });

        it('should allow moving Kings to empty tableau slots', () => {
            game.piles.t0 = [];
            expect(game.isValidMove(heartKing, 't0', 1)).toBe(true);
        });

        it('should NOT allow moving non-Kings to empty tableau slots', () => {
            game.piles.t0 = [];
            expect(game.isValidMove(club8, 't0', 1)).toBe(false);
        });

        it('should allow moving stacks to empty tableau slots if stack starts with King', () => {
            game.piles.t0 = [];
            const stack = [heartKing, club8, diamond7];
            expect(game.isValidMove(stack[0], 't0', 3)).toBe(true);
        });
    });

    it('should correctly detect victory', () => {
        for (let i = 0; i < 4; i++) {
            game.piles['f' + i] = Array(13).fill({});
        }
        game.checkWin();
        expect(document.getElementById('victory-overlay').style.display).toBe('flex');
    });
});
