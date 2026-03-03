/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
const fs = require('fs');
const path = require('path');

// Mock THREE.js
global.THREE = {
    Scene: class { add() {} remove() {} },
    PerspectiveCamera: class { position = { set() {} }; updateProjectionMatrix() {} add() {} },
    WebGLRenderer: class { setPixelRatio() {} setSize() {} render() {} shadowMap = {} },
    Clock: class { getDelta = () => 0.016; getElapsedTime = () => 0; },
    AmbientLight: class {},
    DirectionalLight: class { constructor() { this.position = { set() {} }; this.shadow = { mapSize: {} }; } },
    Group: class { 
        constructor() {
            this.position = { set() {}, clone() { return new global.THREE.Vector3(); } };
            this.rotation = { set() {}, invert() { return this; } };
            this.quaternion = { 
                setFromEuler() { return this; }, 
                slerpQuaternions() { return this; }, 
                slerp() { return this; },
                clone() { return new global.THREE.Quaternion(); },
                invert() { return this; },
                copy() { return this; }
            };
            this.matrixWorld = { applyToBufferAttribute() {} };
        }
        add() {} 
        remove() {} 
        updateMatrixWorld() {}
        worldToLocal(v) { return v; }
        localToWorld(v) { return v; }
    },
    Mesh: class { 
        constructor() {
            this.position = new global.THREE.Vector3();
            this.rotation = { set() {} };
            this.quaternion = new global.THREE.Quaternion();
            this.scale = { set() {}, setScalar() {} };
            this.userData = {};
            this.castShadow = false;
        }
    },
    BoxGeometry: class {},
    PlaneGeometry: class {},
    SphereGeometry: class {},
    CapsuleGeometry: class {},
    ShapeGeometry: class { constructor(){ this.boundingBox = { min: {x:0, y:0}, max: {x:10, y:10}, getCenter: () => {} }; } computeBoundingBox(){} translate(){} },
    Shape: class {},
    MeshStandardMaterial: class { userData = {}; clone() { return new this.constructor(); } },
    MeshBasicMaterial: class { userData = {}; clone() { return new this.constructor(); } },
    Color: class { constructor() {} copy() { return this; } set() { return this; } },
    Vector2: class { 
        constructor(x,y){this.x=x||0;this.y=y||0;} 
        set(x,y){this.x=x;this.y=y; return this;} 
        multiplyScalar(s){this.x*=s;this.y*=s; return this;} 
    },
    Vector3: class { 
        constructor(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0;} 
        set(x,y,z){this.x=x;this.y=y;this.z=z; return this;}
        copy(v){this.x=v.x;this.y=v.y;this.z=v.z; return this;}
        clone(){return new global.THREE.Vector3(this.x,this.y,this.z);}
        sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z; return this;}
        applyEuler(){return this;}
        applyQuaternion(){return this;}
        applyMatrix4(){return this;}
    },
    Texture: class { repeat = { set() {} }; },
    Euler: class { 
        constructor(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0;}
    },
    Quaternion: class { 
        constructor(){this.x=0;this.y=0;this.z=0;this.w=1;}
        setFromEuler() { return this; } 
        setFromAxisAngle() { return this; }
        setFromRotationMatrix() { return this; }
        slerpQuaternions() { return this; } 
        slerp() { return this; }
        clone() { return new global.THREE.Quaternion(); } 
        invert() { return this; }
        copy(q) { return this; }
        premultiply() { return this; }
        multiplyQuaternions() { return this; }
    },
    RepeatWrapping: 1000
};

// Mock CANNON.js
global.CANNON = {
    World: class {
        constructor() {
            this.gravity = { set() {} };
            this.broadphase = {};
            this.solver = { iterations: 10 };
        }
        addBody() {}
        removeBody() {}
        addContactMaterial() {}
        step() {}
    },
    Body: class {
        constructor(options) {
            this.mass = options.mass;
            this.shape = options.shape;
            this.position = new global.THREE.Vector3();
            this.velocity = new global.THREE.Vector3();
            this.angularVelocity = new global.THREE.Vector3();
            this.quaternion = { copy: () => {} };
        }
    },
    Sphere: class {},
    Box: class {},
    Plane: class {},
    Vec3: class { 
        constructor(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0;} 
        set(x,y,z){this.x=x;this.y=y;this.z=z; return this;}
    },
    Material: class { constructor(name) { this.name = name; } },
    ContactMaterial: class {},
    NaiveBroadphase: class {}
};

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
    static decompress = vi.fn(() => 'decompressed shader');
    Words = class { parse() { return { shader: 'mock shader' }; } };
}

global.TexGen = MockTexGen;

// Require game after mocks are set up
const { MarbleCubeGame, COMPRESSED_SHADERS } = require('./game.js');

describe('Marble Cube Game - Logic', () => {
    beforeEach(() => {
        // Mock DOM for Game
        document.body.innerHTML = `
            <div id="game-container">
                <div id="loading"></div>
                <button id="start-btn" style="display: none;"></button>
                <div id="finish-banner" style="display: none;">
                    <p id="time-display"></p>
                    <ol id="leaderboard-list"></ol>
                    <button id="restart-btn"></button>
                </div>
                <canvas id="webgl-canvas"></canvas>
            </div>
        `;

        global.Image = class {
            constructor() {
                setTimeout(() => { if (this.onload) this.onload(); }, 10);
            }
        };

        global.requestAnimationFrame = vi.fn();
        
        // Mock matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false, // Default to desktop
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    });

    it('should initialize correctly and start on desktop', async () => {
        const game = new MarbleCubeGame();
        expect(game.state).toBe('LOADING');
        expect(game.activeFaceId).toBe(0);
        
        // Wait for init sequence (texture baking)
        await new Promise(r => setTimeout(r, 100)); 
        
        expect(document.getElementById('loading').style.display).toBe('none');
        expect(game.state).toBe('PLAYING');
    });

    it('should show start button on mobile devices', async () => {
        // Force mobile matchMedia
        window.matchMedia = vi.fn().mockImplementation(() => ({ matches: true }));
        
        const game = new MarbleCubeGame();
        await new Promise(r => setTimeout(r, 100)); 
        
        expect(document.getElementById('start-btn').style.display).toBe('block');
        // Game should not start automatically
        expect(game.state).not.toBe('PLAYING');
        
        // Click start button
        document.getElementById('start-btn').click();
        expect(document.getElementById('start-btn').style.display).toBe('none');
        expect(game.state).toBe('PLAYING');
    });

    it('should move marble based on tilt gravity', async () => {
        const game = new MarbleCubeGame();
        await new Promise(r => setTimeout(r, 100)); 
        
        game.state = 'PLAYING';
        game.tilt.y = 0.1; // Tilting on Y makes marble move on X
        game.tilt.x = 0.0;
        
        const initialX = game.marble.pos.x;
        
        // Update physics
        game.updatePhysics(0.1);
        
        expect(game.marble.pos.x).toBeGreaterThan(initialX);
        expect(game.marble.vel.x).toBeGreaterThan(0);
    });

    it('should bounce off walls', async () => {
        const game = new MarbleCubeGame();
        await new Promise(r => setTimeout(r, 100)); 
        game.state = 'PLAYING';
        
        // Setup a simple test environment
        const face = game.facesData[0];
        face.walls = [{ x: 0, y: 0, w: 10, h: 10 }]; // A 10x10 wall at center
        
        // Place marble next to it and moving towards it
        game.marble.pos.set(-10, 0); 
        game.marble.vel.set(100, 0); 
        game.tilt = { x: 0, y: 0 };
        
        game.updatePhysics(0.1); 
        
        // Check bounce (velocity should reverse)
        expect(game.marble.vel.x).toBeLessThan(0);
    });

    it('should handle hole transitions', async () => {
        const game = new MarbleCubeGame();
        await new Promise(r => setTimeout(r, 100)); 
        game.state = 'PLAYING';
        
        const startFaceId = game.activeFaceId;
        const face = game.facesData[startFaceId];
        
        expect(face.holes.length).toBeGreaterThan(0);
        
        const hole = face.holes[0];
        // Move marble into hole
        game.marble.pos.set(hole.x, hole.y);
        
        game.updatePhysics(0.1);
        
        expect(game.isTransitioning).toBe(true);
    });
});

describe('Marble Cube Game - HTML Structure', () => {
    it('should contain required HTML elements', () => {
        const html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
        expect(html).toContain('id="game-container"');
        expect(html).toContain('id="loading"');
        expect(html).toContain('id="start-btn"');
        expect(html).toContain('id="webgl-canvas"');
        expect(html).toContain('texgen.js"');
        expect(html).toContain('game.js"');
    });
});
