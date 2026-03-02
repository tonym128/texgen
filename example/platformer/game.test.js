/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
const { Game, SHADERS } = require('./game.js');

describe('Platformer Game', () => {
    let mockTG;
    let mockLib;

    beforeEach(() => {
        // Mock DOM
        document.body.innerHTML = `
            <div id="loading"></div>
            <div id="game-container">
                <div id="transition-swipe"></div>
                <canvas id="gameCanvas"></canvas>
                <div id="hud">
                    <div id="hud-score"></div>
                    <div id="hud-rings"></div>
                    <div id="hud-lives"></div>
                    <div id="hud-powerup"></div>
                    <div id="progress-bar"></div>
                </div>
                <div id="menu-main" class="overlay"></div>
                <div id="menu-map" class="overlay"><div id="map-container"></div></div>
                <div id="menu-saveload" class="overlay"><div id="slots-container"></div><h1 id="saveload-title"></h1></div>
                <div id="menu-result" class="overlay"><h1 id="result-title"></h1><h2 id="result-score"></h2></div>
                <div id="menu-leaderboard" class="overlay"><div id="leaderboard-body"></div></div>
            </div>
        `;

        // Mock TexGen Lib
        class MockTexGen {
            constructor(options) {
                this.width = options.width;
                this.height = options.height;
                this.canvas = { width: 0, height: 0 };
            }
            bake = vi.fn(() => 'data:image/png;base64,test');
            init = vi.fn();
            render = vi.fn();
        }
        mockLib = MockTexGen;

        // Mock Image
        global.Image = class {
            constructor() {
                setTimeout(() => this.onload(), 10);
            }
        };

        // Mock requestAnimationFrame
        global.requestAnimationFrame = vi.fn();
    });

    it('should initialize with 10 lives', () => {
        const game = new Game(mockLib);
        expect(game.progress.lives).toBe(10);
    });

    it('should load all shaders as textures', async () => {
        const game = new Game(mockLib);
        await new Promise(r => setTimeout(r, 100)); // wait for image loads
        expect(Object.keys(game.textures).length).toBe(Object.keys(SHADERS).length);
    });

    it('should generate a level with exactly 2 chasms for level 0', () => {
        const game = new Game(mockLib);
        const level = game.generateLevel(0);
        
        // A chasm is a hole in the bottom layer
        let chasms = 0;
        let inChasm = false;
        for (let x = 0; x < level.len; x++) {
            const isHole = level.grid[14][x] === 0;
            if (isHole && !inChasm) {
                chasms++;
                inChasm = true;
            } else if (!isHole) {
                inChasm = false;
            }
        }
        expect(chasms).toBe(2);
    });

    it('should move player when input is active', () => {
        const game = new Game(mockLib);
        game.startLevel();
        const initialX = game.player.x;
        
        game.input.right = true;
        game.updatePlayer(0.016);
        
        expect(game.player.x).toBeGreaterThan(initialX);
    });

    it('should handle player death and respawn at safe spot', async () => {
        const game = new Game(mockLib);
        global.game = game;
        game.startLevel();
        const initialLives = game.progress.lives;
        
        // Mock a fall
        game.player.y = 800;
        await game.die();
        
        expect(game.progress.lives).toBe(initialLives - 1);
        expect(game.player.y).toBeLessThan(600); // Should have respawned
    });

    it('should transition to map and draw nodes', () => {
        const game = new Game(mockLib);
        global.game = game; // Make global for UI calls
        game.goToMap();
        expect(game.state).toBe('MAP');
        const nodes = document.querySelectorAll('.map-node');
        expect(nodes.length).toBe(5);
    });
});
