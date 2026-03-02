/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
const { MarbleRoller, SHADERS } = require('./game.js');

describe('Marble Roller Game', () => {
    let mockTG;
    let mockLib;

    beforeEach(() => {
        // Mock DOM
        document.body.innerHTML = `
            <div id="loading"></div>
            <div id="game-container">
                <span id="score">0</span>
                <canvas id="gameCanvas"></canvas>
            </div>
        `;

        // Mock TexGen Lib
        class MockTexGen {
            constructor(options) {
                this.width = options?.width;
                this.height = options?.height;
                this.canvas = { width: 0, height: 0 };
            }
            bake = vi.fn(() => 'data:image/png;base64,test');
            init = vi.fn();
            render = vi.fn();
        }
        
        // Setup global TexGen for the game.js non-module load if needed, 
        // though we pass it via constructor in a better design. 
        // Current Game class uses 'new TexGen()' directly.
        global.TexGen = MockTexGen;

        // Mock Image
        global.Image = class {
            constructor() {
                setTimeout(() => { if (this.onload) this.onload(); }, 10);
            }
        };

        // Mock requestAnimationFrame
        global.requestAnimationFrame = vi.fn();
    });

    it('should initialize correctly', () => {
        const game = new MarbleRoller();
        expect(game.marble.radius).toBe(20);
        expect(game.score).toBe(0);
        expect(game.state).toBe('LOADING');
    });

    it('should bake all required textures', async () => {
        const game = new MarbleRoller();
        await new Promise(r => setTimeout(r, 100)); // wait for image loads
        expect(Object.keys(game.textures).length).toBe(Object.keys(SHADERS).length);
        expect(game.state).toBe('PLAYING');
    });

    it('should move marble when input is active', async () => {
        const game = new MarbleRoller();
        await new Promise(r => setTimeout(r, 50)); 
        
        game.marble.vx = 0; // Reset any initial velocity
        const initialX = game.marble.x;
        game.input.right = true;
        game.update();
        
        expect(game.marble.vx).toBeGreaterThan(0);
        expect(game.marble.x).toBeGreaterThan(initialX);
    });

    it('should bounce off walls', async () => {
        const game = new MarbleRoller();
        await new Promise(r => setTimeout(r, 50));
        
        // Place marble next to left border wall (x=20)
        game.marble.radius = 20;
        game.marble.x = 35; // overlapping left wall (x=20)
        game.marble.y = 300;
        game.marble.vx = -10;
        
        game.update();
        
        // Should have bounced
        expect(game.marble.vx).toBeGreaterThan(0); 
        expect(game.marble.x).toBeGreaterThanOrEqual(40 - 1); // allow small epsilon
    });

    it('should reset when hitting a hole', async () => {
        const game = new MarbleRoller();
        await new Promise(r => setTimeout(r, 50));
        
        // Move marble into the first hole
        const hole = game.holes[0];
        game.marble.x = hole.x;
        game.marble.y = hole.y;
        
        game.update();
        
        // Should be back at start position
        expect(game.marble.x).toBe(game.startPos.x);
        expect(game.marble.y).toBe(game.startPos.y);
    });

    it('should increase score and generate new level on goal', async () => {
        const game = new MarbleRoller();
        await new Promise(r => setTimeout(r, 50));
        
        // Move marble into the goal
        game.marble.x = game.goal.x;
        game.marble.y = game.goal.y;
        
        game.update();
        
        expect(game.score).toBe(1000);
        expect(document.getElementById('score').innerText).toBe("1000");
    });
});
