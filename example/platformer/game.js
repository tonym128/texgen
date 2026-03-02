// game.js - TexGen Platformer Ultimate (Final Robust Version)

const TILE_SIZE = 40;
const SHADERS = {
    player: `void main() {
        vec2 st = vUv - 0.5;
        float d = length(st);
        float body = smoothstep(0.45, 0.4, d);
        vec3 color = vec3(0.1, 0.8, 0.3);
        float eye = smoothstep(0.12, 0.1, length(abs(st) - vec2(0.15, 0.1)));
        float pupil = smoothstep(0.06, 0.04, length(abs(st) - vec2(0.15, 0.1)));
        color = mix(color, vec3(1.0), eye);
        color = mix(color, vec3(0.0), pupil);
        gl_FragColor = vec4(color, body);
    }`,
    grass_top: `void main() {
        float n = fbm(vUv * 5.0, 5.0);
        vec3 color = mix(vec3(0.2, 0.6, 0.1), vec3(0.4, 0.8, 0.2), n);
        color = mix(vec3(0.4, 0.2, 0.1), color, smoothstep(0.7, 0.8, vUv.y));
        gl_FragColor = vec4(color, 1.0);
    }`,
    dirt: `void main() {
        float n = fbm(vUv * 8.0, 8.0);
        gl_FragColor = vec4(mix(vec3(0.4, 0.2, 0.1), vec3(0.3, 0.15, 0.05), n), 1.0);
    }`,
    metal: `void main() {
        float n = random(floor(vUv * 2.0));
        vec3 color = vec3(0.5) + n * 0.1;
        float b = max(step(0.95, vUv.x), step(0.95, vUv.y)) + max(step(vUv.x, 0.05), step(vUv.y, 0.05));
        gl_FragColor = vec4(color * (1.0 - b * 0.5), 1.0);
    }`,
    wood: `void main() {
        float n = fbm(vUv * vec2(1.0, 10.0), 10.0);
        vec3 color = mix(vec3(0.4, 0.2, 0.1), vec3(0.6, 0.4, 0.2), n);
        float grain = fract(vUv.y * 10.0);
        color *= 0.9 + 0.2 * step(0.1, grain);
        gl_FragColor = vec4(color, 1.0);
    }`,
    cyber: `void main() {
        vec2 st = fract(vUv * 5.0);
        float grid = step(0.9, st.x) + step(0.9, st.y);
        vec3 color = mix(vec3(0.0, 0.05, 0.1), vec3(0.0, 1.0, 0.8), grid);
        gl_FragColor = vec4(color, 1.0);
    }`,
    ocean: `void main() {
        float n = fbm(vUv * 10.0, 10.0);
        vec3 color = mix(vec3(0.0, 0.2, 0.5), vec3(0.1, 0.4, 0.8), n);
        float foam = step(0.9, vUv.y + n * 0.1);
        color = mix(color, vec3(1.0), foam);
        gl_FragColor = vec4(color, 1.0);
    }`,
    enemy_walk: `void main() {
        vec2 st = vUv - 0.5;
        float d = length(st);
        float body = smoothstep(0.4, 0.38, d);
        gl_FragColor = vec4(1.0, 0.2, 0.2, body);
    }`,
    enemy_fly: `void main() {
        vec2 st = vUv - 0.5;
        float body = smoothstep(0.3, 0.28, length(st));
        float wings = smoothstep(0.1, 0.08, abs(st.y) - 0.1 * sin(st.x * 20.0 + u_time * 10.0)) * step(abs(st.x), 0.4);
        gl_FragColor = vec4(0.8, 0.8, 0.2, max(body, wings));
    }`,
    enemy_swim: `void main() {
        vec2 st = vUv - 0.5;
        float body = smoothstep(0.4, 0.3, length(st * vec2(1.5, 1.0)));
        gl_FragColor = vec4(0.2, 0.4, 1.0, body);
    }`,
    enemy_burst: `void main() {
        float n = voronoi(vUv * 10.0);
        gl_FragColor = vec4(0.5, 0.3, 0.1, step(n, 0.5));
    }`,
    powerup: `void main() {
        vec2 st = vUv - 0.5;
        float d = length(st);
        float ring = smoothstep(0.4, 0.35, d) - smoothstep(0.3, 0.25, d);
        vec3 col = 0.5 + 0.5 * cos(u_time + vUv.xyx + vec3(0,2,4));
        gl_FragColor = vec4(col, ring);
    }`,
    castle: `void main() {
        vec2 st = vUv;
        float wood = fbm(st * vec2(2.0, 10.0), 10.0);
        vec3 color = mix(vec3(0.3, 0.15, 0.05), vec3(0.5, 0.3, 0.15), wood);
        float door = step(abs(st.x - 0.5), 0.15) * step(st.y, 0.3);
        color = mix(color, vec3(0.1), door);
        float batt = step(0.8, st.y) * step(0.3, fract(st.x * 5.0));
        float mask = step(st.y, 0.8) + batt;
        gl_FragColor = vec4(color, mask);
    }`,
    drone: `void main() {
        vec2 st = vUv - 0.5;
        float body = smoothstep(0.15, 0.1, length(st));
        float light = smoothstep(0.1, 0.0, length(st)) * (0.5 + 0.5 * sin(u_time * 20.0));
        gl_FragColor = vec4(vec3(0.0, 1.0, 1.0) + light, body);
    }`,
    bg_sky: `void main() {
        float n = fbm(vUv * 3.0 + vec2(u_time * 0.05, 0.0), 3.0);
        vec3 sky = mix(vec3(0.4, 0.6, 0.9), vec3(0.1, 0.3, 0.6), vUv.y);
        vec3 color = mix(sky, vec3(1.0), smoothstep(0.4, 0.8, n));
        gl_FragColor = vec4(color, 1.0);
    }`,
    bg_mountains: `void main() {
        float n = fbm(vUv * vec2(5.0, 1.0), 5.0);
        float height = 0.3 + n * 0.4;
        float mask = step(vUv.y, height);
        vec3 color = mix(vec3(0.2, 0.3, 0.4), vec3(0.1, 0.15, 0.2), vUv.y / height);
        gl_FragColor = vec4(color * mask, mask);
    }`,
    world_map: `void main() {
        float n = fbm(vUv * 4.0, 4.0);
        float land = smoothstep(0.45, 0.5, n);
        vec3 ocean = mix(vec3(0.05, 0.2, 0.4), vec3(0.1, 0.3, 0.6), vUv.y);
        vec3 grass = mix(vec3(0.2, 0.5, 0.1), vec3(0.4, 0.6, 0.2), n);
        vec3 color = mix(ocean, grass, land);
        vec2 grid = abs(fract(vUv * 8.0) - 0.5);
        float line = smoothstep(0.02, 0.0, min(grid.x, grid.y));
        color = mix(color, vec3(1.0, 1.0, 1.0), line * 0.1);
        gl_FragColor = vec4(color, 1.0);
    }`,
    gold_ring: `void main() {
        vec2 st = vUv - 0.5;
        float d = length(st);
        float ring = smoothstep(0.4, 0.35, d) - smoothstep(0.3, 0.25, d);
        float sparkle = smoothstep(0.1, 0.0, length(st - vec2(0.1, 0.1) * sin(u_time * 5.0)));
        vec3 col = vec3(1.0, 0.8, 0.0);
        gl_FragColor = vec4(col + sparkle, ring);
    }`,
    hazard_spikes: `void main() {
        float d = abs(vUv.x - 0.5);
        float spike = step(d, (1.0 - vUv.y) * 0.5);
        vec3 color = mix(vec3(0.4), vec3(0.7, 0.7, 0.8), vUv.y);
        gl_FragColor = vec4(color * spike, spike);
    }`
};

const ui = {
    init() {
        this.hud = document.getElementById('hud');
        this.score = document.getElementById('hud-score');
        this.rings = document.getElementById('hud-rings');
        this.lives = document.getElementById('hud-lives');
        this.powerup = document.getElementById('hud-powerup');
        this.progressBar = document.getElementById('progress-bar');
    },
    showMenu(id, params = {}) {
        this.hideMenus();
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
        if (id === 'menu-saveload') this.renderSlots(params.mode);
        if (id === 'menu-leaderboard') this.renderLeaderboard();
        if (id === 'menu-map') this.drawMap();
    },
    hideMenus() {
        document.querySelectorAll('.overlay').forEach(m => m.classList.remove('active'));
        if (this.hud) this.hud.style.display = 'none';
    },
    renderSlots(mode) {
        const container = document.getElementById('slots-container');
        if (!container) return;
        container.innerHTML = '';
        const title = document.getElementById('saveload-title');
        if (title) title.innerText = mode === 'load' ? 'Load Game' : 'Save Game';
        for (let i = 0; i < 5; i++) {
            const btn = document.createElement('button');
            const data = localStorage.getItem(`texgen_save_${i}`);
            btn.innerHTML = `Slot ${i+1}: ${data ? 'Level ' + (JSON.parse(data).unlocked+1) : '<span class="slot-empty">Empty</span>'}`;
            btn.onclick = () => mode === 'load' ? game.load(i) : game.save(i);
            container.appendChild(btn);
        }
    },
    drawMap() {
        const container = document.getElementById('map-container');
        if (!container) return;
        container.innerHTML = '';
        const char = document.createElement('img');
        char.id = 'map-character';
        char.className = 'map-player';
        if (game.textures.player) char.src = game.textures.player.src;
        container.appendChild(char);
        if (game.textures.world_map) {
            container.style.backgroundImage = `url(${game.textures.world_map.src})`;
            container.style.backgroundSize = 'cover';
        }
        const nodes = [{x:80,y:320},{x:180,y:180},{x:300,y:280},{x:450,y:120},{x:520,y:320}];
        nodes.forEach((n, i) => {
            const el = document.createElement('div');
            el.className = `map-node ${i <= game.progress.unlocked ? 'unlocked' : ''} ${i === game.progress.level ? 'current' : ''}`;
            el.style.left = n.x + 'px'; el.style.top = n.y + 'px';
            if (i <= game.progress.unlocked) el.onclick = () => { 
                if (game.progress.level === i) {
                    game.transitionToLevel();
                } else {
                    game.progress.level = i; 
                    this.updateMapPlayer();
                    document.querySelectorAll('.map-node').forEach((node, idx) => {
                        node.classList.remove('current');
                        if (idx === i) node.classList.add('current');
                    });
                }
            };
            container.appendChild(el);
            if (i < nodes.length - 1) {
                const n2 = nodes[i+1];
                const dist = Math.hypot(n2.x - n.x, n2.y - n.y);
                const angle = Math.atan2(n2.y - n.y, n2.x - n.x);
                const path = document.createElement('div');
                path.className = 'map-path';
                path.style.width = dist + 'px';
                path.style.left = n.x + 'px';
                path.style.top = n.y + 'px';
                path.style.transform = `rotate(${angle}rad)`;
                if (i < game.progress.unlocked) {
                    path.style.background = 'var(--accent)';
                    path.style.boxShadow = '0 0 10px var(--accent)';
                }
                container.appendChild(path);
            }
        });
        this.updateMapPlayer();
    },
    updateMapPlayer() {
        const char = document.getElementById('map-character');
        if (!char) return;
        const nodes = [{x:80,y:320},{x:180,y:180},{x:300,y:280},{x:450,y:120},{x:520,y:320}];
        const n = nodes[game.progress.level];
        char.style.display = 'block';
        char.style.left = n.x + 'px';
        char.style.top = n.y + 'px';
    },
    showResult(title, score) {
        this.showMenu('menu-result');
        const resTitle = document.getElementById('result-title');
        const resScore = document.getElementById('result-score');
        if (resTitle) resTitle.innerText = title;
        if (resScore) resScore.innerText = `Score: ${score}`;
        this.updateLeaderboard(score);
    },
    showPowerup(type) {
        if (!this.powerup) return;
        this.powerup.innerText = type.toUpperCase() + " ACTIVE!";
        setTimeout(() => { if(this.powerup) this.powerup.innerText = ""; }, 3000);
    },
    updateHUD() {
        if (this.score) this.score.innerText = `Score: ${game.progress.score}`;
        if (this.rings) this.rings.innerText = `Rings: ${game.progress.rings}`;
        if (this.lives) this.lives.innerText = `Lives: ${game.progress.lives}`;
        if (this.progressBar && game.level) {
            const pct = Math.min(100, Math.max(0, (game.player.x / game.level.castleX) * 100));
            this.progressBar.style.width = pct + '%';
        }
    },
    updateLeaderboard(score) {
        let lb = JSON.parse(localStorage.getItem('texgen_leaderboard') || '[]');
        lb.push({ name: 'Player', score });
        lb.sort((a,b) => b.score - a.score);
        lb = lb.slice(0, 10);
        localStorage.setItem('texgen_leaderboard', JSON.stringify(lb));
    },
    renderLeaderboard() {
        const body = document.getElementById('leaderboard-body');
        if (!body) return;
        const lb = JSON.parse(localStorage.getItem('texgen_leaderboard') || '[]');
        body.innerHTML = lb.map((entry, i) => `<tr><td>${i+1}</td><td>${entry.name}</td><td>${entry.score}</td></tr>`).join('');
    }
};

class Game {
    constructor(tgLib) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 800;
        this.height = 600;
        this.TexGen = tgLib;
        this.tg = new this.TexGen({ width: TILE_SIZE, height: TILE_SIZE });
        this.bgTexGen = new this.TexGen({ width: 800, height: 600 });
        this.bgMtsTexGen = new this.TexGen({ width: 800, height: 600 });
        this.textures = {};
        this.state = 'LOADING';
        this.progress = { level: 0, unlocked: 0, score: 0, lives: 10, rings: 0 };
        this.camera = { x: 0, y: 0 };
        this.input = { left: false, right: false, up: false, space: false };
        this.enemies = [];
        this.powerups = [];
        this.collectibleRings = [];
        this.drones = [];
        this.themes = ['nature', 'industrial', 'castle', 'cyber', 'ocean'];
        this.currentTheme = 'nature';
        this.setupInput();
        this.setupTouchControls();
        this.init();
    }

    async init() {
        try {
            await this.generateAllTextures();
            if (this.canvas) this.canvas.style.display = 'block';
            this.state = 'MENU';
            ui.init();
            ui.showMenu('menu-main');
            requestAnimationFrame((t) => this.loop(t));
        } catch (err) {
            console.error("Critical Failure:", err);
        }
    }

    async generateAllTextures() {
        const bake = (name, shader, w = TILE_SIZE, h = TILE_SIZE) => {
            return new Promise(resolve => {
                const data = this.tg.bake(shader, { width: w, height: h });
                if (!data) { resolve(); return; }
                const img = new Image();
                img.onload = () => { this.textures[name] = img; resolve(); };
                img.src = data;
            });
        };
        await Promise.all(Object.entries(SHADERS).map(([name, shader]) => bake(name, shader)));
        this.bgTexGen.init(SHADERS.bg_sky);
        this.bgMtsTexGen.init(SHADERS.bg_mountains);
        const loading = document.getElementById('loading');
        if(loading) loading.style.display = 'none';
    }

    setupInput() {
        window.addEventListener('keydown', e => this.handleKey(e.code, true));
        window.addEventListener('keyup', e => this.handleKey(e.code, false));
    }

    setupTouchControls() {
        const bindBtn = (id, key) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const handler = (val) => (e) => {
                e.preventDefault();
                this.input[key] = val;
                if (key === 'up' && val && this.state === 'MAP') this.transitionToLevel();
            };
            btn.addEventListener('touchstart', handler(true));
            btn.addEventListener('touchend', handler(false));
            btn.addEventListener('touchcancel', handler(false));
        };
        bindBtn('btn-left', 'left');
        bindBtn('btn-right', 'right');
        bindBtn('btn-jump', 'up');
    }

    handleKey(code, isDown) {
        if (code === 'ArrowLeft' || code === 'KeyA') this.input.left = isDown;
        if (code === 'ArrowRight' || code === 'KeyD') this.input.right = isDown;
        if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') this.input.up = isDown;
        if (code === 'Space' || code === 'Enter') {
            this.input.space = isDown;
            if (isDown && this.state === 'MAP') this.transitionToLevel();
        }
    }

    async transitionToLevel() {
        const swipe = document.getElementById('transition-swipe');
        if (!swipe) { this.startLevel(); return; }
        swipe.style.left = '0%';
        await new Promise(r => setTimeout(r, 500));
        this.startLevel();
        swipe.style.left = '100%';
        await new Promise(r => setTimeout(r, 500));
        swipe.style.left = '-100%';
    }

    startLevel() {
        const idx = this.progress.level;
        this.currentTheme = this.themes[idx % this.themes.length];
        this.level = this.generateLevel(idx);
        this.player = {
            x: 100, y: 100, vx: 0, vy: 0, w: 28, h: 32,
            grounded: false, scale: 1, jumpForce: -12, speed: 5, flyTimer: 0,
            isBig: false, invuln: 0
        };
        this.enemies = this.level.enemies;
        this.powerups = this.level.powerups;
        this.collectibleRings = this.level.rings;
        this.state = 'PLAYING';
        ui.hideMenus();
        const hud = document.getElementById('hud');
        if (hud) hud.style.display = 'flex';
        this.camera.x = 0;
    }

    generateLevel(idx) {
        const len = 150 + idx * 50;
        const rows = 15;
        const grid = Array.from({length: rows}, () => new Array(len).fill(0));
        const enemies = [];
        const powerups = [];
        const rings = [];
        const maxChasms = 2 + idx;
        const chasmIndices = new Set();
        const safeZoneStart = 30;
        const safeZoneEnd = len - 30;
        const availableWidth = safeZoneEnd - safeZoneStart;
        const chasmSpacing = Math.floor(availableWidth / maxChasms);
        for (let i = 0; i < maxChasms; i++) {
            const pos = safeZoneStart + (i * chasmSpacing) + Math.floor(Math.random() * (chasmSpacing - 5));
            chasmIndices.add(pos); chasmIndices.add(pos + 1); chasmIndices.add(pos + 2);
        }
        let h = 8;
        for (let x = 0; x < len; x++) {
            if (x > 10 && Math.random() > 0.85) h += (Math.random() > 0.5 ? 1 : -1);
            h = Math.max(4, Math.min(12, h));
            if (!chasmIndices.has(x)) {
                for (let y = 0; y < h; y++) grid[rows - y - 1][x] = (y === h - 1) ? 1 : 2;
            }
            if (x > 15 && x < len - 15 && Math.random() > 0.93 && !chasmIndices.has(x)) {
                const platW = 3 + Math.floor(Math.random() * 4);
                const platY = rows - h - 3 - Math.floor(Math.random() * 3);
                if (platY > 2) {
                    for (let px = 0; px < platW; px++) if (x + px < len - 10) grid[platY][x + px] = 3;
                }
            }
            if (x > 15 && x < len - 10 && !chasmIndices.has(x)) {
                if (Math.random() > 0.96) {
                    const type = this.currentTheme === 'ocean' ? 'swim' : (Math.random() > 0.5 ? 'walk' : 'fly');
                    enemies.push({ type, x: x * TILE_SIZE, y: (rows - h - 1) * TILE_SIZE, vx: -2, vy: 0, originY: (rows - h - 1) * TILE_SIZE });
                }
                if (Math.random() > 0.98) powerups.push({ type: ['grow', 'jump', 'speed', 'fly'][Math.floor(Math.random()*4)], x: x * TILE_SIZE, y: (rows - h - 3) * TILE_SIZE });
                if (Math.random() > 0.8) rings.push({ x: x * TILE_SIZE + 10, y: (rows - h - 2) * TILE_SIZE });
            }
        }
        return { grid, len, enemies, powerups, rings, castleX: (len - 10) * TILE_SIZE };
    }

    update(dt) {
        if (this.state === 'PLAYING') {
            this.updatePlayer(dt);
            this.updateEnemies(dt);
            this.updateCamera();
            ui.updateHUD();
            if (this.player.x > this.level.castleX) this.startDroneShow();
        } else if (this.state === 'DRONES') {
            this.updateDrones(dt);
        }
    }

    updatePlayer(dt) {
        const p = this.player;
        if (p.invuln > 0) p.invuln -= dt;
        p.vx = ((this.input.right ? 1 : 0) - (this.input.left ? 1 : 0)) * p.speed;
        if (p.flyTimer > 0) {
            p.flyTimer -= dt;
            if (this.input.up) p.vy = -p.speed; else p.vy = 1;
        } else {
            p.vy += 0.6;
            if (p.grounded && (this.input.up || this.input.space)) { p.vy = p.jumpForce; p.grounded = false; }
        }
        p.x += p.vx;
        this.resolveCollisions('x');
        p.y += p.vy;
        this.resolveCollisions('y');
        this.powerups = this.powerups.filter(pu => {
            if (Math.hypot(p.x + p.w/2 - pu.x, p.y + p.h/2 - pu.y) < 40) { this.applyPowerup(pu.type); return false; }
            return true;
        });
        this.collectibleRings = this.collectibleRings.filter(r => {
            if (Math.hypot(p.x + p.w/2 - r.x, p.y + p.h/2 - r.y) < 30) { this.progress.rings++; this.progress.score += 50; return false; }
            return true;
        });
        this.enemies.forEach(e => {
            if (Math.hypot(p.x + p.w/2 - e.x - 16, p.y + p.h/2 - e.y - 16) < 30) {
                if (p.vy > 0 && p.y + p.h < e.y + 20) { e.dead = true; p.vy = -10; this.progress.score += 100; }
                else if (p.invuln <= 0) {
                    if (p.isBig) { p.isBig = false; p.scale = 1; p.invuln = 2; }
                    else this.die();
                }
            }
        });
        if (p.y > 700) this.die();
    }

    resolveCollisions(axis) {
        const p = this.player;
        const x1 = Math.floor(p.x / TILE_SIZE);
        const x2 = Math.floor((p.x + p.w - 0.1) / TILE_SIZE);
        const y1 = Math.floor(p.y / TILE_SIZE);
        const y2 = Math.floor((p.y + p.h - 0.1) / TILE_SIZE);
        for (let y = y1; y <= y2; y++) {
            for (let x = x1; x <= x2; x++) {
                const tile = (this.level.grid[y] && this.level.grid[y][x]) ? this.level.grid[y][x] : 0;
                if (tile > 0) {
                    if (axis === 'x') {
                        if (p.vx > 0) p.x = x * TILE_SIZE - p.w;
                        else if (p.vx < 0) p.x = (x + 1) * TILE_SIZE;
                        p.vx = 0;
                    } else {
                        if (p.vy > 0) {
                            p.y = y * TILE_SIZE - p.h; p.vy = 0; p.grounded = true;
                        } else if (p.vy < 0) {
                            p.y = (y + 1) * TILE_SIZE; p.vy = 0;
                        }
                    }
                }
            }
        }
    }

    applyPowerup(type) {
        const p = this.player;
        if (type === 'grow') { p.scale = 1.5; p.isBig = true; }
        if (type === 'jump') p.jumpForce = -18;
        if (type === 'speed') p.speed = 8;
        if (type === 'fly') p.flyTimer = 5;
        ui.showPowerup(type);
    }

    async die() {
        if (this.state === 'RECOVERING') return;
        this.state = 'RECOVERING';
        this.progress.lives--;
        if (this.progress.lives <= 0) { ui.showResult('GAME OVER', this.progress.score); return; }
        const swipe = document.getElementById('transition-swipe');
        if (swipe) { swipe.style.left = '0%'; await new Promise(r => setTimeout(r, 500)); }
        let tx = Math.floor((this.player.x + this.player.w/2) / TILE_SIZE);
        let found = false;
        for (let x = tx; x >= 0; x--) {
            for (let y = 0; y < 15; y++) {
                const tile = this.level.grid[y][x];
                if (tile === 1 || tile === 2 || tile === 3) {
                    if (y > 0 && this.level.grid[y-1][x] === 0) {
                        this.player.x = x * TILE_SIZE; this.player.y = (y * TILE_SIZE) - this.player.h;
                        this.player.vx = 0; this.player.vy = 0; this.player.invuln = 2;
                        this.player.scale = 1; this.player.isBig = false; this.player.flyTimer = 0;
                        this.player.speed = 5; this.player.jumpForce = -12;
                        found = true; break;
                    }
                }
            }
            if (found) break;
        }
        if (!found) this.startLevel();
        this.state = 'PLAYING';
        if (swipe) { swipe.style.left = '100%'; await new Promise(r => setTimeout(r, 500)); swipe.style.left = '-100%'; }
    }

    updateEnemies(dt) {
        this.enemies = this.enemies.filter(e => !e.dead);
        this.enemies.forEach(e => {
            if (e.type === 'walk') {
                e.x += e.vx;
                const tx = Math.floor(e.x / TILE_SIZE);
                const ty = Math.floor((e.y + 33) / TILE_SIZE);
                if (tx < 0 || tx >= this.level.len || !this.level.grid[ty] || !this.level.grid[ty][tx]) e.vx *= -1;
            } else if (e.type === 'fly') {
                e.x += e.vx; e.y = e.originY + Math.sin(performance.now()*0.005) * 50;
            } else if (e.type === 'swim') {
                e.x += e.vx; e.y = e.originY + Math.cos(performance.now()*0.002) * 20;
            }
        });
    }

    startDroneShow() {
        if (this.state === 'DRONES') return;
        this.state = 'DRONES';
        this.droneTimer = 0;
        this.drones = [];
        const winPattern = [
            {x:0,y:0}, {x:0,y:1}, {x:0,y:2}, {x:0,y:3}, {x:0,y:4}, {x:1,y:4}, {x:2,y:3}, {x:3,y:4}, {x:4,y:0}, {x:4,y:1}, {x:4,y:2}, {x:4,y:3}, {x:4,y:4},
            {x:6,y:0}, {x:7,y:0}, {x:8,y:0}, {x:7,y:1}, {x:7,y:2}, {x:7,y:3}, {x:6,y:4}, {x:7,y:4}, {x:8,y:4},
            {x:10,y:0}, {x:10,y:1}, {x:10,y:2}, {x:10,y:3}, {x:10,y:4}, {x:11,y:1}, {x:12,y:2}, {x:13,y:3}, {x:14,y:0}, {x:14,y:1}, {x:14,y:2}, {x:14,y:3}, {x:14,y:4}
        ];
        const centerX = this.player.x; const centerY = 200;
        for (let i = 0; i < 60; i++) {
            const p = winPattern[i % winPattern.length];
            this.drones.push({
                x: centerX + (Math.random()-0.5)*800, y: centerY + (Math.random()-0.5)*600,
                tx: centerX - 150 + p.x * 25, ty: centerY - 50 + p.y * 25,
                colorOffset: Math.random() * 100
            });
        }
        setTimeout(() => {
            this.drones.forEach(d => { d.tx += (Math.random()-0.5)*1000; d.ty -= 1000; });
            setTimeout(() => {
                this.progress.unlocked = Math.max(this.progress.unlocked, this.progress.level + 1);
                this.save(this.saveSlot);
                ui.showResult('LEVEL COMPLETE!', this.progress.score);
            }, 2000);
        }, 4000);
    }

    updateDrones(dt) {
        this.droneTimer += dt;
        this.drones.forEach(d => {
            const lerp = this.droneTimer < 3 ? 0.05 : 0.02;
            d.x += (d.tx - d.x) * lerp; d.y += (d.ty - d.y) * lerp;
        });
    }

    updateCamera() { this.camera.x = Math.max(0, this.player.x - 350); }

    draw(t) {
        const ctx = this.ctx;
        if (!ctx) return;
        ctx.clearRect(0, 0, 800, 600);
        if (this.state === 'LOADING') return;
        this.bgTexGen.render(t);
        ctx.drawImage(this.bgTexGen.canvas, 0, 0);
        this.bgMtsTexGen.render(t);
        ctx.drawImage(this.bgMtsTexGen.canvas, -(this.camera.x * 0.2) % 800, 0);
        ctx.drawImage(this.bgMtsTexGen.canvas, -(this.camera.x * 0.2) % 800 + 800, 0);
        ctx.save(); ctx.translate(-this.camera.x, 0);
        if (this.level) {
            const startX = Math.floor(this.camera.x / TILE_SIZE);
            for (let y = 0; y < 15; y++) {
                for (let x = startX; x < startX + 22; x++) {
                    const tile = this.level.grid[y][x];
                    if (tile > 0) {
                        const tex = tile === 1 ? this.getThemeTexture('top') : (tile === 3 ? this.textures.wood : this.getThemeTexture('base'));
                        ctx.drawImage(tex, x * TILE_SIZE, y * TILE_SIZE);
                    }
                }
            }
            if (this.textures.castle) {
                const cx = Math.floor(this.level.castleX / TILE_SIZE);
                let floorY = 12;
                if (this.level.grid[floorY] && this.level.grid[floorY][cx] === 0) {
                    for (let y = 0; y < 15; y++) { if (this.level.grid[y][cx] > 0) { floorY = y; break; } }
                }
                ctx.drawImage(this.textures.castle, this.level.castleX, (floorY - 3)*TILE_SIZE, 120, 120);
            }
        }
        if (this.player && this.textures.player) {
            ctx.save(); 
            if (this.player.invuln > 0 && Math.floor(t * 10) % 2 === 0) ctx.globalAlpha = 0.5;
            let sX = this.player.scale, sY = this.player.scale;
            if (!this.player.grounded) {
                const stretch = Math.min(0.2, Math.abs(this.player.vy) * 0.02);
                sX -= stretch; sY += stretch;
            } else if (Math.abs(this.player.vx) > 0.1) {
                const squash = Math.sin(t * 15) * 0.05;
                sX += squash; sY -= squash;
            }
            ctx.translate(this.player.x + 14, this.player.y + 32); 
            ctx.scale(sX, sY);
            ctx.drawImage(this.textures.player, -14, -32, 28, 32); 
            ctx.restore();
        }
        this.enemies.forEach(e => {
            const tex = this.textures['enemy_' + e.type] || this.textures.enemy_walk;
            if (tex) ctx.drawImage(tex, e.x, e.y, 32, 32);
        });
        this.powerups.forEach(pu => ctx.drawImage(this.textures.powerup, pu.x, pu.y, 30, 30));
        this.collectibleRings.forEach(r => ctx.drawImage(this.textures.gold_ring, r.x, r.y, 20, 20));
        if (this.state === 'DRONES') {
            this.drones.forEach(d => { 
                if(this.textures.drone) {
                    ctx.save();
                    const hue = (t * 500 + d.colorOffset) % 360;
                    ctx.filter = `hue-rotate(${hue}deg) brightness(1.5)`;
                    ctx.drawImage(this.textures.drone, d.x, d.y, 15, 15); 
                    ctx.restore();
                }
            });
        }
        ctx.restore();
    }

    getThemeTexture(part) {
        if (this.currentTheme === 'nature') return part === 'top' ? this.textures.grass_top : this.textures.dirt;
        if (this.currentTheme === 'industrial') return this.textures.metal;
        if (this.currentTheme === 'castle') return this.textures.wood;
        if (this.currentTheme === 'ocean') return this.textures.ocean;
        return this.textures.cyber;
    }

    loop(t) { this.update(1/60); this.draw(t / 1000); requestAnimationFrame((t) => this.loop(t)); }

    load(slot) {
        const data = localStorage.getItem(`texgen_save_${slot}`);
        if (data) { this.progress = JSON.parse(data); }
        else { this.progress = { level: 0, unlocked: 0, score: 0, lives: 10, rings: 0 }; }
        this.saveSlot = slot;
        this.goToMap();
    }
    save(slot) { localStorage.setItem(`texgen_save_${slot}`, JSON.stringify(this.progress)); ui.renderSlots(this.state === 'MAP' ? 'save' : 'load'); }
    goToMap() { this.state = 'MAP'; ui.showMenu('menu-map'); ui.drawMap(); }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, SHADERS, ui };
} else {
    window.game = new Game(window.TexGen);
}
