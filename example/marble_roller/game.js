// game.js - TexGen Marble Roller

const SHADERS = {
    // Polished Marble Ball
    marble: `void main() {
        vec2 st = vUv - 0.5;
        float d = length(st);
        float mask = smoothstep(0.48, 0.45, d);
        
        // Swirly marble pattern
        float n = fbm(vUv * 3.0 + fbm(vUv * 5.0, 5.0), 3.0);
        vec3 color = mix(vec3(0.9, 0.9, 0.95), vec3(0.2, 0.3, 0.5), n);
        
        // Specular highlight
        float spec = smoothstep(0.15, 0.0, length(st - vec2(-0.15, -0.15)));
        color += spec * 0.4;
        
        gl_FragColor = vec4(color, mask);
    }`,
    
    // Floor Tiles
    floor: `void main() {
        vec2 st = vUv * 4.0;
        vec2 ipos = floor(st);
        vec2 fpos = fract(st);
        
        // Hexagonal-ish grid using voronoi
        float v = voronoi(vUv * 8.0);
        vec3 color = mix(vec3(0.1, 0.12, 0.15), vec3(0.15, 0.18, 0.2), v);
        
        // Tile borders
        float border = smoothstep(0.0, 0.05, v);
        color = mix(vec3(0.0, 0.8, 0.7), color, border);
        
        gl_FragColor = vec4(color, 1.0);
    }`,
    
    // Walls
    wall: `void main() {
        float n = fbm(vUv * vec2(1.0, 10.0), 10.0);
        vec3 color = mix(vec3(0.3), vec3(0.4), n);
        float b = max(step(0.9, vUv.x), step(0.9, vUv.y)) + max(step(vUv.x, 0.1), step(vUv.y, 0.1));
        gl_FragColor = vec4(color * (1.0 - b * 0.3), 1.0);
    }`,
    
    // Hole
    hole: `void main() {
        vec2 st = vUv - 0.5;
        float d = length(st);
        float mask = smoothstep(0.5, 0.4, d);
        vec3 color = mix(vec3(0.0), vec3(0.1, 0.0, 0.2), d * 2.0);
        gl_FragColor = vec4(color, mask);
    }`,
    
    // Goal
    goal: `void main() {
        vec2 st = vUv - 0.5;
        float d = length(st);
        float ring = smoothstep(0.5, 0.4, d) - smoothstep(0.3, 0.2, d);
        vec3 col = 0.5 + 0.5 * cos(u_time * 5.0 + vUv.xyx + vec3(0,2,4));
        gl_FragColor = vec4(col, ring);
    }`
};

class MarbleRoller {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.tg = new TexGen();
        this.textures = {};
        
        this.marble = {
            x: 0, y: 0,
            vx: 0, vy: 0,
            radius: 20,
            speed: 0.5,
            friction: 0.98
        };
        
        this.input = { up: false, down: false, left: false, right: false };
        this.score = 0;
        this.state = 'LOADING';
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInput();
        this.init();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.state === 'PLAYING') {
            this.generateLevel();
        }
    }

    async init() {
        await this.bakeTextures();
        this.generateLevel();
        this.state = 'PLAYING';
        document.getElementById('loading').style.display = 'none';
        requestAnimationFrame((t) => this.loop(t));
    }

    async bakeTextures() {
        const bake = (name, shader, size = 64) => {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => { this.textures[name] = img; resolve(); };
                img.src = this.tg.bake(shader, { width: size, height: size });
            });
        };

        await Promise.all([
            bake('marble', SHADERS.marble, 128),
            bake('floor', SHADERS.floor, 256),
            bake('wall', SHADERS.wall, 64),
            bake('hole', SHADERS.hole, 64),
            bake('goal', SHADERS.goal, 128)
        ]);
    }

    setupInput() {
        window.addEventListener('keydown', e => this.handleKey(e.code, true));
        window.addEventListener('keyup', e => this.handleKey(e.code, false));

        // Touch buttons
        const bindBtn = (id, key) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.input[key] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); this.input[key] = false; });
            btn.addEventListener('touchcancel', (e) => { e.preventDefault(); this.input[key] = false; });
        };
        bindBtn('btn-up', 'up');
        bindBtn('btn-down', 'down');
        bindBtn('btn-left', 'left');
        bindBtn('btn-right', 'right');
    }

    handleKey(code, isDown) {
        if (code === 'ArrowUp' || code === 'KeyW') this.input.up = isDown;
        if (code === 'ArrowDown' || code === 'KeyS') this.input.down = isDown;
        if (code === 'ArrowLeft' || code === 'KeyA') this.input.left = isDown;
        if (code === 'ArrowRight' || code === 'KeyD') this.input.right = isDown;
    }

    generateLevel() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.walls = [];
        this.holes = [];

        // Corners are now relative to screen size
        const padding = 100;
        const corners = [
            { start: {x: padding, y: padding}, goal: {x: w - padding, y: h - padding} },
            { start: {x: w - padding, y: h - padding}, goal: {x: padding, y: padding} },
            { start: {x: w - padding, y: padding}, goal: {x: padding, y: h - padding} },
            { start: {x: padding, y: h - padding}, goal: {x: w - padding, y: padding} }
        ];
        const layout = corners[Math.floor(Math.random() * corners.length)];

        this.startPos = layout.start;
        this.goal = layout.goal;
        this.reset();

        // Simple border walls
        const bw = 20;
        this.walls.push({ x: 0, y: 0, w: w, h: bw });
        this.walls.push({ x: 0, y: h - bw, w: w, h: bw });
        this.walls.push({ x: 0, y: 0, w: bw, h: h });
        this.walls.push({ x: w - bw, y: 0, w: bw, h: h });

        const isSafe = (x, y, r) => {
            const dStart = Math.hypot(x - this.startPos.x, y - this.startPos.y);
            const dGoal = Math.hypot(x - this.goal.x, y - this.goal.y);
            return dStart > 120 && dGoal > 120;
        };

        // Level obstacles (scaled based on area)
        const obstacleCount = Math.floor((w * h) / 40000);
        for (let i = 0; i < obstacleCount; i++) {
            let ox = bw + 50 + Math.random() * (w - 2 * bw - 200);
            let oy = bw + 50 + Math.random() * (h - 2 * bw - 100);
            let ow = 40 + Math.random() * 150;
            let oh = 20;
            if (isSafe(ox + ow/2, oy + oh/2, 50)) {
                this.walls.push({ x: ox, y: oy, w: ow, h: oh });
            }
        }

        // Holes
        const holeCount = Math.floor((w * h) / 80000);
        for (let i = 0; i < holeCount; i++) {
            let hx = bw + 50 + Math.random() * (w - 2 * bw - 100);
            let hy = bw + 50 + Math.random() * (h - 2 * bw - 100);
            let hr = 25;
            if (isSafe(hx, hy, hr)) {
                this.holes.push({ x: hx, y: hy, r: hr });
            }
        }
    }

    update() {
        if (this.state !== 'PLAYING') return;

        // Apply input
        if (this.input.up) this.marble.vy -= this.marble.speed;
        if (this.input.down) this.marble.vy += this.marble.speed;
        if (this.input.left) this.marble.vx -= this.marble.speed;
        if (this.input.right) this.marble.vx += this.marble.speed;

        // Physics
        this.marble.vx *= this.marble.friction;
        this.marble.vy *= this.marble.friction;
        this.marble.x += this.marble.vx;
        this.marble.y += this.marble.vy;

        // Wall collisions
        this.walls.forEach(w => {
            const cx = Math.max(w.x, Math.min(this.marble.x, w.x + w.w));
            const cy = Math.max(w.y, Math.min(this.marble.y, w.y + w.h));
            const dist = Math.hypot(this.marble.x - cx, this.marble.y - cy);
            
            if (dist < this.marble.radius) {
                const overlap = this.marble.radius - dist;
                const angle = Math.atan2(this.marble.y - cy, this.marble.x - cx);
                this.marble.x += Math.cos(angle) * overlap;
                this.marble.y += Math.sin(angle) * overlap;
                // Bounce
                if (Math.abs(Math.cos(angle)) > 0.5) this.marble.vx *= -0.5;
                if (Math.abs(Math.sin(angle)) > 0.5) this.marble.vy *= -0.5;
            }
        });

        // Hole check
        this.holes.forEach(h => {
            if (Math.hypot(this.marble.x - h.x, this.marble.y - h.y) < h.r) {
                this.reset();
            }
        });

        // Goal check
        if (Math.hypot(this.marble.x - this.goal.x, this.marble.y - this.goal.y) < 40) {
            this.score += 1000;
            const scoreEl = document.getElementById('score');
            if (scoreEl) scoreEl.innerText = this.score.toString();
            this.reset(true);
        }
    }

    reset(nextLevel = false) {
        if (nextLevel) {
            this.generateLevel();
            return;
        }
        this.marble.x = this.startPos ? this.startPos.x : 100;
        this.marble.y = this.startPos ? this.startPos.y : 100;
        this.marble.vx = 0;
        this.marble.vy = 0;
    }

    draw(t) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        ctx.clearRect(0, 0, w, h);

        // 1. Floor (Tiled)
        if (this.textures.floor) {
            const floorPattern = ctx.createPattern(this.textures.floor, 'repeat');
            ctx.fillStyle = floorPattern;
            ctx.fillRect(0, 0, w, h);
        }

        // 2. Holes
        this.holes.forEach(h => {
            if (this.textures.hole) {
                ctx.drawImage(this.textures.hole, h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
            }
        });

        // 3. Goal
        if (this.textures.goal) {
            ctx.drawImage(this.textures.goal, this.goal.x - 40, this.goal.y - 40, 80, 80);
        }

        // 4. Walls
        ctx.fillStyle = '#222';
        this.walls.forEach(w => {
            ctx.fillRect(w.x + 5, w.y + 5, w.w, w.h);
            if (this.textures.wall) {
                ctx.drawImage(this.textures.wall, 0, 0, 64, 64, w.x, w.y, w.w, w.h);
            }
        });

        // 5. Marble
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(this.marble.x + 4, this.marble.y + 4, this.marble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        if (this.textures.marble) {
            ctx.drawImage(this.textures.marble, 
                this.marble.x - this.marble.radius, 
                this.marble.y - this.marble.radius, 
                this.marble.radius * 2, 
                this.marble.radius * 2
            );
        }
    }

    loop(t) {
        this.update();
        this.draw(t / 1000);
        requestAnimationFrame((t) => this.loop(t));
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MarbleRoller, SHADERS };
} else {
    window.onload = () => new MarbleRoller();
}
