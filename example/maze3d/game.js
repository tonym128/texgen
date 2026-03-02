// game.js - TexGen 3D Maze Explorer

const SHADERS = {
    fire_wall: `void main() {
        float n = fbm(vUv * 4.0 - vec2(0.0, u_time * 2.0), 4.0);
        gl_FragColor = vec4(vec3(1.0, 0.4, 0.0) * n, 1.0);
    }`,
    plasma_wall: `void main() {
        float flow = fbm(vUv * vec2(5.0, 1.0) - vec2(u_time, 0.0), 5.0);
        gl_FragColor = vec4(vec3(0.8, 0.2, 1.0) * flow, 1.0);
    }`,
    cyber_wall: `void main() {
        vec2 st = fract(vUv * 5.0);
        float grid = step(0.9, st.x) + step(0.9, st.y);
        float pulse = sin(u_time * 5.0 + vUv.y * 10.0) * 0.5 + 0.5;
        vec3 color = mix(vec3(0.0, 0.05, 0.1), vec3(0.0, 1.0, 0.8) * pulse, grid);
        gl_FragColor = vec4(color, 1.0);
    }`,
    toxic_wall: `void main() {
        float n = fbm(vUv * 8.0 + u_time, 8.0);
        gl_FragColor = vec4(mix(vec3(0.1, 0.0, 0.2), vec3(0.4, 1.0, 0.2), n), 1.0);
    }`,
    ice_wall: `void main() {
        float v = voronoi(vUv * 5.0 + u_time * 0.2);
        vec3 color = mix(vec3(0.9, 0.95, 1.0), vec3(0.2, 0.5, 0.8), v);
        gl_FragColor = vec4(color, 1.0);
    }`,
    floor: `void main() {
        vec2 st = floor(vUv * 10.0);
        float pattern = mod(st.x + st.y, 2.0);
        vec3 color = mix(vec3(0.1), vec3(0.15), pattern);
        gl_FragColor = vec4(color, 1.0);
    }`,
    ceiling: `void main() {
        float n = fbm(vUv * 10.0, 10.0);
        gl_FragColor = vec4(vec3(0.05) + n * 0.05, 1.0);
    }`,
    exit_portal: `void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        float a = atan(p.y, p.x);
        float swirl = fbm(vec2(r * 5.0 - u_time, a * 2.0), 5.0);
        vec3 color = mix(vec3(0.0, 1.0, 0.5), vec3(0.0, 0.5, 1.0), swirl);
        gl_FragColor = vec4(color * swirl, smoothstep(0.5, 0.0, r));
    }`
};

const TILE_SIZE = 4;

class Maze3D {
    constructor() {
        this.texGens = {};
        this.materials = {};
        
        this.mazeSize = 11; // Start smaller
        this.level = 1;
        
        this.maze = [];
        this.revealed = [];
        this.wallMeshes = [];
        
        this.player = {
            x: 0,
            z: 0,
            angle: 0,
            speed: 6.0,
            turnSpeed: 2.5
        };
        
        this.input = { w: false, a: false, s: false, d: false };
        this.lastTime = performance.now();
        
        this.init();
    }

    async init() {
        // Init Realtime Textures
        const names = Object.keys(SHADERS);
        for (const name of names) {
            const tg = new TexGen({ width: 256, height: 256 });
            tg.init(SHADERS[name]);
            this.texGens[name] = tg;
            
            tg.render(0);
            
            const tex = new THREE.CanvasTexture(tg.canvas);
            tex.magFilter = THREE.NearestFilter;
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            
            this.materials[name] = new THREE.MeshBasicMaterial({ 
                map: tex, 
                transparent: name === 'exit_portal',
                side: THREE.DoubleSide
            });
        }

        document.getElementById('loading').style.display = 'none';

        this.initThreeJS();
        this.setupNewMaze();
        
        this.setupInput();
        
        requestAnimationFrame((t) => this.loop(t));
    }

    initThreeJS() {
        const canvas = document.getElementById('webgl-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.08);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupNewMaze() {
        // Cleanup old
        this.wallMeshes.forEach(m => this.scene.remove(m));
        this.wallMeshes = [];
        if (this.floorMesh) this.scene.remove(this.floorMesh);
        if (this.ceilingMesh) this.scene.remove(this.ceilingMesh);
        if (this.exitMesh) this.scene.remove(this.exitMesh);

        this.generateMaze();
        this.build3DMaze();
        
        // Reset player
        this.player.x = 1.5 * TILE_SIZE;
        this.player.z = 1.5 * TILE_SIZE;
        this.player.angle = 0;
        
        console.log(`Level ${this.level} started. Size: ${this.mazeSize}`);
    }

    generateMaze() {
        const size = this.mazeSize;
        for (let z = 0; z < size; z++) {
            this.maze[z] = [];
            this.revealed[z] = [];
            for (let x = 0; x < size; x++) {
                this.maze[z][x] = 1;
                this.revealed[z][x] = false;
            }
        }

        const carve = (x, z) => {
            this.maze[z][x] = 0;
            const dirs = [ [0,-1], [1,0], [0,1], [-1,0] ];
            dirs.sort(() => Math.random() - 0.5);
            for (let d of dirs) {
                const nx = x + d[0] * 2;
                const nz = z + d[1] * 2;
                if (nx > 0 && nx < size-1 && nz > 0 && nz < size-1 && this.maze[nz][nx] === 1) {
                    this.maze[z + d[1]][x + d[0]] = 0;
                    carve(nx, nz);
                }
            }
        };
        
        carve(1, 1);
        
        // The exit is at the furthest logical point or fixed corner
        this.exitPos = { x: size - 2, z: size - 2 };
        this.maze[this.exitPos.z][this.exitPos.x] = 0;

        const wallTypes = ['fire_wall', 'plasma_wall', 'cyber_wall', 'toxic_wall', 'ice_wall'];
        this.wallData = [];
        for (let z = 0; z < size; z++) {
            this.wallData[z] = [];
            for (let x = 0; x < size; x++) {
                if (this.maze[z][x] === 1) {
                    this.wallData[z][x] = wallTypes[Math.floor(Math.random() * wallTypes.length)];
                }
            }
        }
    }

    build3DMaze() {
        const size = this.mazeSize;
        const wallGeo = new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, TILE_SIZE);
        const floorGeo = new THREE.PlaneGeometry(size * TILE_SIZE, size * TILE_SIZE);
        
        this.materials.floor.map.repeat.set(size, size);
        this.floorMesh = new THREE.Mesh(floorGeo, this.materials.floor);
        this.floorMesh.rotation.x = -Math.PI / 2;
        this.floorMesh.position.set(size * TILE_SIZE / 2, 0, size * TILE_SIZE / 2);
        this.scene.add(this.floorMesh);

        this.materials.ceiling.map.repeat.set(size, size);
        this.ceilingMesh = new THREE.Mesh(floorGeo, this.materials.ceiling);
        this.ceilingMesh.rotation.x = Math.PI / 2;
        this.ceilingMesh.position.set(size * TILE_SIZE / 2, TILE_SIZE, size * TILE_SIZE / 2);
        this.scene.add(this.ceilingMesh);

        for (let z = 0; z < size; z++) {
            for (let x = 0; x < size; x++) {
                if (this.maze[z][x] === 1) {
                    const type = this.wallData[z][x];
                    const wall = new THREE.Mesh(wallGeo, this.materials[type]);
                    wall.position.set(x * TILE_SIZE + TILE_SIZE/2, TILE_SIZE/2, z * TILE_SIZE + TILE_SIZE/2);
                    this.scene.add(wall);
                    this.wallMeshes.push(wall);
                }
            }
        }

        // Add Exit Portal
        const exitGeo = new THREE.SphereGeometry(TILE_SIZE/3, 32, 32);
        this.exitMesh = new THREE.Mesh(exitGeo, this.materials.exit_portal);
        this.exitMesh.position.set(this.exitPos.x * TILE_SIZE + TILE_SIZE/2, TILE_SIZE/2, this.exitPos.z * TILE_SIZE + TILE_SIZE/2);
        this.scene.add(this.exitMesh);
    }

    setupInput() {
        window.addEventListener('keydown', e => this.handleKey(e.code, true));
        window.addEventListener('keyup', e => this.handleKey(e.code, false));

        // Mobile controls
        const bindBtn = (id, key) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.input[key] = true; });
            btn.addEventListener('touchend', (e) => { e.preventDefault(); this.input[key] = false; });
            btn.addEventListener('touchcancel', (e) => { e.preventDefault(); this.input[key] = false; });
        };
        bindBtn('btn-up', 'w');
        bindBtn('btn-down', 's');
        bindBtn('btn-left', 'a');
        bindBtn('btn-right', 'd');
    }

    handleKey(code, isDown) {
        if (code === 'ArrowUp' || code === 'KeyW') this.input.w = isDown;
        if (code === 'ArrowDown' || code === 'KeyS') this.input.s = isDown;
        if (code === 'ArrowLeft' || code === 'KeyA') this.input.a = isDown;
        if (code === 'ArrowRight' || code === 'KeyD') this.input.d = isDown;
    }

    update(dt) {
        if (this.input.a) this.player.angle += this.player.turnSpeed * dt;
        if (this.input.d) this.player.angle -= this.player.turnSpeed * dt;
        
        let moveStep = 0;
        if (this.input.w) moveStep = this.player.speed * dt;
        if (this.input.s) moveStep = -this.player.speed * dt;
        
        if (moveStep !== 0) {
            const dx = Math.sin(this.player.angle) * moveStep;
            const dz = Math.cos(this.player.angle) * moveStep;
            const newX = this.player.x - dx;
            const newZ = this.player.z - dz;
            const margin = 0.8;
            
            const gridX = Math.floor((newX + (dx < 0 ? margin : -margin)) / TILE_SIZE);
            const currZ = Math.floor(this.player.z / TILE_SIZE);
            if (this.maze[currZ] && this.maze[currZ][gridX] === 0) this.player.x = newX;
            
            const currX = Math.floor(this.player.x / TILE_SIZE);
            const gridZ = Math.floor((newZ + (dz < 0 ? margin : -margin)) / TILE_SIZE);
            if (this.maze[gridZ] && this.maze[gridZ][currX] === 0) this.player.z = newZ;
        }
        
        this.camera.position.set(this.player.x, TILE_SIZE / 2, this.player.z);
        this.camera.rotation.y = this.player.angle;
        
        this.updateFogOfWar();

        // Check for level completion
        const distToExit = Math.hypot(this.player.x - this.exitMesh.position.x, this.player.z - this.exitMesh.position.z);
        if (distToExit < 1.5) {
            this.level++;
            this.mazeSize += 4; // Increase difficulty
            this.setupNewMaze();
        }
    }

    updateFogOfWar() {
        const px = Math.floor(this.player.x / TILE_SIZE);
        const pz = Math.floor(this.player.z / TILE_SIZE);
        const radius = 2;
        for (let z = -radius; z <= radius; z++) {
            for (let x = -radius; x <= radius; x++) {
                const cx = px + x, cz = pz + z;
                if (cx >= 0 && cx < this.mazeSize && cz >= 0 && cz < this.mazeSize) {
                    if (x*x + z*z <= radius*radius + 1) this.revealed[cz][cx] = true;
                }
            }
        }
    }

    drawMinimap() {
        const canvas = document.getElementById('minimap');
        const ctx = canvas.getContext('2d');
        const cs = canvas.width / this.mazeSize;
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let z = 0; z < this.mazeSize; z++) {
            for (let x = 0; x < this.mazeSize; x++) {
                if (this.revealed[z][x]) {
                    ctx.fillStyle = this.maze[z][x] === 1 ? '#555' : '#222';
                    if (x === this.exitPos.x && z === this.exitPos.z) ctx.fillStyle = '#0f8';
                    ctx.fillRect(x * cs, z * cs, cs+0.5, cs+0.5);
                }
            }
        }
        const px = (this.player.x / TILE_SIZE) * cs, pz = (this.player.z / TILE_SIZE) * cs;
        ctx.fillStyle = '#0f0'; ctx.beginPath(); ctx.arc(px, pz, cs/2, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#0f0'; ctx.beginPath(); ctx.moveTo(px, pz);
        ctx.lineTo(px - Math.sin(this.player.angle) * cs * 1.5, pz - Math.cos(this.player.angle) * cs * 1.5);
        ctx.stroke();
    }

    loop(t) {
        const dt = Math.min((t - this.lastTime) / 1000, 0.1);
        this.lastTime = t;
        for (const name in this.texGens) {
            this.texGens[name].render(t / 1000);
            this.materials[name].map.needsUpdate = true;
        }
        this.update(dt);
        this.drawMinimap();
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame((t) => this.loop(t));
    }
}

window.onload = () => { new Maze3D(); };
