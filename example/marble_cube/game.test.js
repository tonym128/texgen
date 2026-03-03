/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
const fs = require('fs');
const path = require('path');

// Mock THREE.js
global.THREE = {
    Scene: class { add() {} remove() {} },
    PerspectiveCamera: class { constructor(){ this.position = { set() {} }; this.quaternion = new global.THREE.Quaternion(); } updateProjectionMatrix() {} add() {} },
    WebGLRenderer: class { setPixelRatio() {} setSize() {} render() {} shadowMap = {} },
    Clock: class { getDelta = () => 0.016; getElapsedTime = () => 0; },
    AmbientLight: class {},
    DirectionalLight: class { constructor() { this.position = { set() {} }; this.shadow = { mapSize: { set() {} }, camera: {} }; } },
    PointLight: class { constructor() { this.position = { set() {}, copy() { return this; }, add() { return this; } }; this.shadow = { mapSize: { set() {} } }; } },
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
                copy() { return this; },
                multiply() { return this; }
            };
            this.matrixWorld = { applyToBufferAttribute() {}, clone() { return this; }, invert() { return this; } };
            this.visible = true;
        }
        add() {} 
        remove() {} 
        updateMatrixWorld() {}
        worldToLocal(v) { return v; }
        localToWorld(v) { return v; }
    },
    Mesh: class { 
        constructor(geometry, material) {
            this.geometry = geometry || { dispose() {} };
            this.material = material || { color: new global.THREE.Color(), emissive: new global.THREE.Color() };
            this.position = new global.THREE.Vector3();
            this.rotation = { set() {} };
            this.quaternion = new global.THREE.Quaternion();
            this.scale = { set() {}, setScalar() {} };
            this.userData = {};
            this.castShadow = false;
            this.receiveShadow = false;
        }
    },
    BoxGeometry: class {},
    PlaneGeometry: class {},
    SphereGeometry: class {},
    CapsuleGeometry: class {},
    TorusGeometry: class {},
    CylinderGeometry: class {},
    OctahedronGeometry: class {},
    BufferGeometry: class { dispose(){} },
    CatmullRomCurve3: class { constructor(pts){ this.points = pts; } getPoint(t){ return new global.THREE.Vector3(); } },
    TubeGeometry: class { constructor(){ this.dispose = () => {}; } dispose(){} },
    ShapeGeometry: class { constructor(){ this.boundingBox = { min: {x:0, y:0}, max: {x:10, y:10}, getCenter: () => {} }; } computeBoundingBox(){} translate(){} },
    Shape: class { lineTo(){} absarc(){} },
    MathUtils: { clamp: (v, min, max) => Math.max(min, Math.min(max, v)) },
    MeshStandardMaterial: class { 
        constructor(params){ 
            this.color = new global.THREE.Color(); 
            this.emissive = new global.THREE.Color(); 
            this.userData = {}; 
            if(params?.color) this.color.set(params.color);
            if(params?.emissive) this.emissive.set(params.emissive);
        } 
        clone() { return new this.constructor({color: this.color, emissive: this.emissive}); } 
    },
    MeshBasicMaterial: class { 
        constructor(params){ 
            this.color = new global.THREE.Color(); 
            this.emissive = new global.THREE.Color(); 
            this.userData = {}; 
            if(params?.color) this.color.set(params.color);
        } 
        clone() { return new this.constructor({color: this.color}); } 
    },
    Color: class { 
        constructor(c) { this.value = c; } 
        copy(c) { this.value = c.value; return this; } 
        set(c) { this.value = c; return this; } 
    },
    Vector2: class { 
        constructor(x,y){this.x=x||0;this.y=y||0;} 
        set(x,y){this.x=x;this.y=y; return this;} 
        multiplyScalar(s){this.x*=s;this.y*=s; return this;} 
        addVectors(a, b){this.x=a.x+b.x;this.y=a.y+b.y; return this;}
        subVectors(a, b){this.x=a.x-b.x;this.y=a.y-b.y; return this;}
        dot(v){return this.x*v.x+this.y*v.y;}
        normalize(){const l=Math.sqrt(this.x*this.x+this.y*this.y); if(l>0){this.x/=l;this.y/=l;} return this;}
        lerpVectors(a, b, t){this.x=a.x+(b.x-a.x)*t;this.y=a.y+(b.y-a.y)*t; return this;}
    },
    Vector3: class { 
        constructor(x,y,z){this.x=x||0;this.y=y||0;this.z=z||0;} 
        set(x,y,z){this.x=x;this.y=y;this.z=z; return this;}
        copy(v){this.x=v.x;this.y=v.y;this.z=v.z; return this;}
        clone(){return new global.THREE.Vector3(this.x,this.y,this.z);}
        sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z; return this;}
        add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z; return this;}
        applyEuler(){return this;}
        applyQuaternion(q){ 
            // Simple fake rotation: if camera is tilted, we add a bit to X/Y
            this.x += 1; this.y += 1; 
            return this; 
        }
        applyMatrix4(m){ return this; }
        distanceTo(v){return Math.sqrt((this.x-v.x)**2+(this.y-v.y)**2+(this.z-v.z)**2);}
        length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z);}
        normalize(){const l=Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z); if(l>0){this.x/=l;this.y/=l;this.z/=l;} return this;}
        multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s; return this;}
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
        multiply(q) { return this; }
        premultiply(q) { return this; }
        multiplyQuaternions() { return this; }
    },
    RepeatWrapping: 1000
};

// Mock CANNON.js
global.CANNON = {
    World: class {
        constructor() {
            this.gravity = new global.THREE.Vector3();
            this.broadphase = {};
            this.solver = { iterations: 10 };
            this.bodies = [];
        }
        addBody(b) { this.bodies.push(b); }
        removeBody(b) { this.bodies = this.bodies.filter(x => x !== b); }
        addContactMaterial() {}
        step(dt) {
            this.bodies.forEach(b => {
                if (b.mass > 0) {
                    b.velocity.x += this.gravity.x * dt;
                    b.velocity.y += this.gravity.y * dt;
                    b.velocity.z += this.gravity.z * dt;
                    b.position.x += b.velocity.x * dt;
                    b.position.y += b.velocity.y * dt;
                    b.position.z += b.velocity.z * dt;
                }
            });
        }
    },
    Body: class {
        constructor(options) {
            this.mass = options.mass || 0;
            this.shape = options.shape;
            this.position = options.position || new global.THREE.Vector3();
            this.velocity = new global.THREE.Vector3();
            this.angularVelocity = new global.THREE.Vector3();
            this.quaternion = options.quaternion || new global.THREE.Quaternion();
            this.userData = {};
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
    static Words = class { parse() { return { shader: 'mock shader' }; } };
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
        // Tilt camera slightly so world gravity has an X component
        game.camera.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.1);
        
        const initialX = game.marble.body.position.x;
        
        // Update physics
        game.updatePhysics(0.1);
        
        expect(game.marble.body.position.x).not.toBe(initialX);
    });

    it('should handle physics update without crashing', async () => {
        const game = new MarbleCubeGame();
        await new Promise(r => setTimeout(r, 100)); 
        game.state = 'PLAYING';
        
        expect(() => game.updatePhysics(0.1)).not.toThrow();
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
        game.marble.body.position.set(hole.x, hole.y, 5);
        
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
