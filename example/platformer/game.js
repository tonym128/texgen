// game.js - TexGen Ultimate Platformer

const TILE_SIZE = 40;
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const SPEED = 4;

const THEMES = {
    nature: { sky: [0.4, 0.6, 0.9], ground: [0.2, 0.5, 0.1], rock: [0.4, 0.4, 0.45] },
    industrial: { sky: [0.1, 0.1, 0.15], ground: [0.3, 0.3, 0.35], rock: [0.5, 0.2, 0.1] },
    castle: { sky: [0.2, 0.1, 0.3], ground: [0.4, 0.4, 0.45], rock: [0.3, 0.3, 0.35] },
    cyber: { sky: [0.05, 0.05, 0.1], ground: [0.1, 0.4, 0.8], rock: [0.8, 0.1, 0.8] },
    ocean: { sky: [0.1, 0.4, 0.6], ground: [0.8, 0.7, 0.5], rock: [0.1, 0.2, 0.4] }
};

const SHADERS = {
    player: `void main() {
        vec2 st = vUv - 0.5;
        float body = smoothstep(0.45, 0.4, length(st));
        float eye = smoothstep(0.08, 0.07, length(st - vec2(0.15, 0.15))) + 
                    smoothstep(0.08, 0.07, length(st - vec2(-0.15, 0.15)));
        vec3 col = mix(vec3(0.0, 1.0, 0.8), vec3(0.0, 0.5, 0.4), vUv.y);
        gl_FragColor = vec4(mix(col, vec3(0.0), eye), body);
    }`,
    ground: `void main() {
        float n = fbm(vUv * 10.0, 10.0);
        vec3 col = mix(vec3(0.2, 0.5, 0.1), vec3(0.4, 0.6, 0.2), n);
        float grass = step(0.8, vUv.y) * step(0.1, random(vec2(floor(vUv.x * 10.0), 0.0)));
        col = mix(col, vec3(0.1, 0.3, 0.05), grass * 0.5);
        gl_FragColor = vec4(col, 1.0);
    }`,
    rock: `void main() {
        float n = voronoi(vUv * 8.0);
        vec3 col = mix(vec3(0.4), vec3(0.5), n);
        gl_FragColor = vec4(col, 1.0);
    }`,
    enemy: `void main() {
        vec2 st = vUv - 0.5;
        float d = length(st);
        float body = smoothstep(0.4, 0.35, d);
        float spike = step(0.3, fract(atan(st.y, st.x) * 1.5 + u_time * 5.0)) * step(d, 0.5);
        gl_FragColor = vec4(vec3(1.0, 0.2, 0.1), body + spike);
    }`
};

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.tg = new TexGen();
        
        this.player = { x: 100, y: 100, vx: 0, vy: 0, w: 30, h: 30, grounded: false, lives: 10 };
        this.input = { left: false, right: false, up: false };
        this.level = 1;
        this.map = [];
        this.textures = {};
        
        this.init();
    }

    async init() {
        this.setupTouchControls();
        window.addEventListener('resize', () => this.resize());
        this.resize();
        
        // Bake textures
        this.textures.player = this.tg.bake(SHADERS.player, { width: 64, height: 64 });
        this.textures.ground = this.tg.bake(SHADERS.ground, { width: 64, height: 64 });
        this.textures.rock = this.tg.bake(SHADERS.rock, { width: 64, height: 64 });
        this.textures.enemy = this.tg.bake(SHADERS.enemy, { width: 64, height: 64 });

        this.startFirstLevel();
        this.setupInput();
        requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.ctx.scale(dpr, dpr);
        this.renderScale = window.innerHeight / 600;
    }

    setupTouchControls() {
        const bindBtn = (id, key) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.input[key] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); this.input[key] = false; });
        };
        bindBtn('btn-left', 'left');
        bindBtn('btn-right', 'right');
        bindBtn('btn-jump', 'up');
    }

    setupInput() {
        window.addEventListener('keydown', e => this.handleKey(e.code, true));
        window.addEventListener('keyup', e => this.handleKey(e.code, false));
    }

    handleKey(code, isDown) {
        if (code === 'ArrowLeft' || code === 'KeyA') this.input.left = isDown;
        if (code === 'ArrowRight' || code === 'KeyD') this.input.right = isDown;
        if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') this.input.up = isDown;
    }

    startFirstLevel() {
        document.getElementById('screens').style.display = 'none';
        this.generateLevel();
    }

    generateLevel() {
        this.map = [];
        const width = 100 + this.level * 20;
        for (let x = 0; x < width; x++) {
            this.map[x] = [];
            for (let y = 0; y < 15; y++) {
                if (y === 14) this.map[x][y] = 1; // Floor
                else this.map[x][y] = 0;
            }
        }
        this.player.x = 100;
        this.player.y = 400;
    }

    update() {
        if (this.input.left) this.player.vx = -SPEED;
        else if (this.input.right) this.player.vx = SPEED;
        else this.player.vx *= 0.8;

        if (this.input.up && this.player.grounded) {
            this.player.vy = JUMP_FORCE;
            this.player.grounded = false;
        }

        this.player.vy += GRAVITY;
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;

        if (this.player.y > 540) {
            this.player.y = 540;
            this.player.vy = 0;
            this.player.grounded = true;
        }
        
        document.getElementById('progress-fill').style.width = `${Math.min(100, (this.player.x / 4000) * 100)}%`;
    }

    draw() {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this.ctx.save();
        this.ctx.scale(this.renderScale, this.renderScale);
        
        // Simple camera follow
        this.ctx.translate(-this.player.x + 200, 0);

        // Draw Ground
        const groundImg = new Image(); groundImg.src = this.textures.ground;
        for(let i=0; i<100; i++) {
            this.ctx.drawImage(groundImg, i * 64, 570, 64, 64);
        }

        // Draw Player
        const playerImg = new Image(); playerImg.src = this.textures.player;
        this.ctx.drawImage(playerImg, this.player.x, this.player.y, this.player.w, this.player.h);
        
        this.ctx.restore();
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

const game = new Game();
