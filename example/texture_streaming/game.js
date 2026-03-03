// game.js - Texture Streaming with Async Workers

const CHUNK_SIZE = 256;
const WORLD_SHADER = `
uniform float u_chunkX;
uniform float u_chunkY;

void main() {
    // 1. Unified Global Coordinates
    // Flip Y to match the top-down DOM grid.
    vec2 worldPos = vUv + vec2(u_chunkX, -u_chunkY);
    
    // 2. Large Scale "Continent" Noise
    float continent = fbm(worldPos * 0.3, 5.0);
    
    // 3. Medium Scale "Organic Veins" 
    // We use absolute sin of noise to create "ridges" or "veins"
    float veins = abs(sin(fbm(worldPos * 2.0, 4.0) * 10.0));
    veins = smoothstep(0.1, 0.0, veins);
    
    // 4. Tech Grid Layer
    vec2 gridPos = fract(worldPos * 4.0);
    float grid = step(0.95, gridPos.x) + step(0.95, gridPos.y);
    grid *= step(0.6, continent); // Only show grid on "land"
    
    // 5. Color Palette
    vec3 spaceBg = vec3(0.02, 0.02, 0.05);
    vec3 landBase = vec3(0.05, 0.1, 0.15);
    vec3 glowColor = mix(vec3(0.0, 1.0, 0.8), vec3(0.0, 0.5, 1.0), veins);
    
    // 6. Composition
    vec3 color = spaceBg;
    
    // Draw "Land"
    if (continent > 0.45) {
        color = mix(landBase, vec3(0.1, 0.2, 0.3), smoothstep(0.45, 0.8, continent));
        
        // Add Glowing Veins
        color += glowColor * veins * 0.8;
        
        // Add Tech Grid
        color += vec3(0.0, 0.8, 1.0) * grid * 0.3;
    }
    
    // Add rare "Power Hubs" (Voronoi)
    float hubs = 1.0 - voronoi(worldPos * 1.5);
    hubs = pow(hubs, 15.0); // Extreme contrast for rare spots
    color += vec3(1.0, 0.9, 0.2) * hubs;
    
    // Debug border (very subtle)
    float border = step(0.995, vUv.x) + step(0.995, vUv.y);
    color = mix(color, vec3(1.0), border * 0.02);
    
    gl_FragColor = vec4(color, 1.0);
}
`;

class WorldStreamer {
    constructor() {
        this.world = document.getElementById('world');
        this.chunks = new Map();
        this.camera = { x: 0, y: 0 };
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.loadingCount = 0;
        this.keys = {};
        this.lastTime = performance.now();
        
        // CRITICAL: Consistent seed for all workers in the pool
        this.worldSeed = 42.42; 

        this.errorLog = document.createElement('div');
        this.errorLog.id = 'error-log';
        this.errorLog.style.cssText = 'color: #f48771; font-size: 0.7rem; margin-top: 10px; font-family: monospace; white-space: pre-wrap;';
        document.getElementById('hud').appendChild(this.errorLog);

        this.init();
    }

    init() {
        if (window.location.protocol === 'file:') {
            document.getElementById('protocol-warning').style.display = 'block';
            return;
        }

        // Mouse Drag
        window.addEventListener('mousedown', (e) => { this.isDragging = true; this.lastMouse = { x: e.clientX, y: e.clientY }; });
        window.addEventListener('mousemove', (e) => this.onMove(e));
        window.addEventListener('mouseup', () => this.isDragging = false);

        // Touch support
        window.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }, { passive: false });
        window.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            this.onMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
        }, { passive: false });
        window.addEventListener('touchend', () => this.isDragging = false);

        // Keyboard support
        window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

        requestAnimationFrame((t) => this.loop(t));
    }

    onMove(e) {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastMouse.x;
        const dy = e.clientY - this.lastMouse.y;
        this.camera.x -= dx;
        this.camera.y -= dy;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        this.updateChunks();
    }

    loop(t) {
        const dt = (t - this.lastTime) / 1000;
        this.lastTime = t;

        let moved = false;
        const speed = 600 * dt; // Fixed scrolling speed

        if (this.keys['ArrowUp'] || this.keys['KeyW']) { this.camera.y -= speed; moved = true; }
        if (this.keys['ArrowDown'] || this.keys['KeyS']) { this.camera.y += speed; moved = true; }
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) { this.camera.x -= speed; moved = true; }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) { this.camera.x += speed; moved = true; }

        if (moved || this.isDragging) {
            this.updateChunks();
        }

        requestAnimationFrame((t) => this.loop(t));
    }

    updateChunks() {
        const viewW = window.innerWidth;
        const viewH = window.innerHeight;
        
        const startX = Math.floor(this.camera.x / CHUNK_SIZE);
        const startY = Math.floor(this.camera.y / CHUNK_SIZE);
        const endX = Math.ceil((this.camera.x + viewW) / CHUNK_SIZE);
        const endY = Math.ceil((this.camera.y + viewH) / CHUNK_SIZE);

        document.getElementById('pos').innerText = `${Math.floor(this.camera.x)}, ${Math.floor(this.camera.y)}`;

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const key = `${x},${y}`;
                if (!this.chunks.has(key)) {
                    this.createChunk(x, y);
                }
                const el = this.chunks.get(key).element;
                el.style.left = (x * CHUNK_SIZE - this.camera.x) + 'px';
                el.style.top = (y * CHUNK_SIZE - this.camera.y) + 'px';
            }
        }

        // Cleanup far chunks
        for (const [key, chunk] of this.chunks) {
            const [cx, cy] = key.split(',').map(Number);
            if (cx < startX - 2 || cx > endX + 2 || cy < startY - 2 || cy > endY + 2) {
                chunk.element.remove();
                this.chunks.delete(key);
            }
        }

        document.getElementById('count').innerText = this.chunks.size;
    }

    async createChunk(x, y) {
        const key = `${x},${y}`;
        const el = document.createElement('div');
        el.className = 'chunk';
        el.innerText = 'Baking...';
        this.world.appendChild(el);
        this.chunks.set(key, { element: el, baked: false });

        this.setLoading(true);
        try {
            // Pass the world seed to ensure consistency across the worker pool
            const dataUrl = await TexGen.bakeAsync(WORLD_SHADER, {
                width: CHUNK_SIZE,
                height: CHUNK_SIZE,
                seed: this.worldSeed,
                uniforms: { u_chunkX: x, u_chunkY: y }
            });

            if (this.chunks.has(key)) {
                el.innerText = '';
                const img = new Image();
                img.src = dataUrl;
                el.appendChild(img);
                this.chunks.get(key).baked = true;
            }
        } catch (e) {
            console.error("Chunk bake failed", e);
            el.innerText = 'Error';
            let msg = e.message || "Unknown Error";
            if (e instanceof ErrorEvent) {
                msg = `Worker Script Error: ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`;
            }
            this.errorLog.innerText = "Worker Error: " + msg;
        }
        this.setLoading(false);
    }

    setLoading(active) {
        if (active) this.loadingCount++;
        else this.loadingCount--;
        
        const indicator = document.getElementById('loading-indicator');
        if (this.loadingCount > 0) indicator.classList.add('active');
        else indicator.classList.remove('active');
    }
}

window.onload = () => new WorldStreamer();
