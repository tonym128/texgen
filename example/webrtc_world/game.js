/**
 * TexGen WebRTC World Demo
 * - Multiplayer terrain exploration
 * - Procedural heightmaps & avatars via TexGen
 * - Real-time chat & interactive objects
 */

const CONFIG = {
    TERRAIN_SIZE: 100,
    TERRAIN_RES: 128,
    AVATAR_SIZE: 1,
    TICK_RATE: 20, // ms between updates
    GRAPH_HISTORY: 60, // 60 seconds
};

class WebRTCWorld {
    constructor() {
        this.checkProtocol();
        this.userId = 'user-' + Math.random().toString(36).substr(2, 6);
        this.username = 'Player';
        this.worldId = null;
        this.isHost = false;
        
        this.peer = null;
        this.connections = {}; // peerId -> connection
        this.players = {}; // peerId -> { mesh, data }
        
        this.texGen = new TexGen();
        this.wordParser = new TexGen.Words();
        
        // Random world seed, host will sync this to all joiners
        this.worldSeed = Math.random() * 1000; 
        this.worldShader = `void main() {
            // Internal noise seeding via u_seed ensures identical results
            float h = fbm(vUv * 5.0, 5.0);
            vec3 grass = vec3(0.2, 0.5, 0.1);
            vec3 dirt = vec3(0.4, 0.3, 0.2);
            vec3 snow = vec3(0.9, 0.9, 1.0);
            vec3 color = mix(dirt, grass, smoothstep(0.2, 0.4, h));
            color = mix(color, snow, smoothstep(0.6, 0.8, h));
            gl_FragColor = vec4(color, 1.0);
        }`;

        this.input = { w: false, a: false, s: false, d: false, ctrl: false };
        this.mouse = new THREE.Vector2();
        
        this.netStats = { 
            in: new Array(60).fill(0), 
            out: new Array(60).fill(0), 
            totalIn: 0,
            totalOut: 0,
            graphical: 0, 
            positional: 0,
            wordsBytes: 0,
            generatedBytes: 0,
            lastUpdate: Date.now() 
        };
        this.worldObjects = []; // Track placed objects
        this.isInitialized = false;
        
        this.initUI();
    }

    getRandomAvatarWords() {
        const colors = ["red", "green", "blue", "yellow", "cyan", "magenta", "orange", "purple", "pink", "teal", "gold", "silver", "violet", "lime", "azure"];
        const mats = ["plastic", "metal", "rock", "glass", "ice", "lava", "plasma", "crystal", "chrome", "silk", "velvet", "carbon"];
        const shapes = ["circle", "box", "star", "cross", "heart", "hex", "diamond", "bolt", "blob", "grid", "stripes", "wave"];
        
        const c = colors[Math.floor(Math.random() * colors.length)];
        const m = mats[Math.floor(Math.random() * mats.length)];
        const s = shapes[Math.floor(Math.random() * shapes.length)];
        
        return `${c} ${m} ${s}`;
    }

    checkProtocol() {
        if (window.location.protocol === 'file:') {
            alert('CRITICAL: WebRTC (PeerJS) requires a web server (http:// or https://) to function. ES Modules and Peer connections will fail on file:// protocol.');
        }
    }

    initUI() {
        document.getElementById('avatar-words').value = this.getRandomAvatarWords();
        
        document.getElementById('join-btn').onclick = () => this.start();
        document.getElementById('chat-input').onkeydown = (e) => {
            if (e.key === 'Enter') {
                this.sendChat(e.target.value);
                e.target.value = '';
            }
        };

        window.addEventListener('keydown', (e) => this.handleKey(e.code, true));
        window.addEventListener('keyup', (e) => this.handleKey(e.code, false));
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });
    }

    handleKey(code, isDown) {
        if (!this.isInitialized) return;
        if (code === 'KeyW' || code === 'ArrowUp') this.input.w = isDown;
        if (code === 'KeyS' || code === 'ArrowDown') this.input.s = isDown;
        if (code === 'KeyA' || code === 'ArrowLeft') this.input.a = isDown;
        if (code === 'KeyD' || code === 'ArrowRight') this.input.d = isDown;
        if (code === 'ControlLeft' || code === 'ControlRight') {
            this.input.ctrl = isDown;
            if (isDown) this.placeObject();
        }
    }

    log(msg, type = 'sys') {
        const consoleEl = document.getElementById('console-log');
        const div = document.createElement('div');
        div.className = `log-msg log-${type}`;
        div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        consoleEl.appendChild(div);
        consoleEl.scrollTop = consoleEl.scrollHeight;
        console.log(`[${type}] ${msg}`);
    }

    async start() {
        this.username = document.getElementById('username-input').value || 'Player';
        this.worldId = document.getElementById('world-id-input').value.trim();
        this.avatarWords = document.getElementById('avatar-words').value || 'blue plastic';

        document.getElementById('lobby-view').style.display = 'none';
        document.getElementById('connection-status').textContent = 'Initializing Peer...';

        this.log(`Connecting as ${this.username}...`);
        
        try {
            this.peer = new Peer(this.userId, {
                debug: 2
            });
        } catch (e) {
            this.log(`Peer creation failed: ${e.message}`, 'sys');
            return;
        }

        this.peer.on('open', (id) => {
            this.log(`Connected to PeerServer. My ID: ${id}`, 'net');
            document.getElementById('connection-status').innerHTML = `My ID: <strong>${id}</strong> <button onclick="navigator.clipboard.writeText('${id}')">Copy</button>`;
            
            if (!this.worldId) {
                this.isHost = true;
                this.worldId = id;
                this.log(`Hosting world: ${this.worldId}`, 'sys');
                this.initGame();
                document.getElementById('lobby').style.display = 'none';
            } else {
                this.log(`Joining world: ${this.worldId}`, 'sys');
                document.getElementById('connection-status').textContent = `Connecting to host ${this.worldId}...`;
                this.connectToHost();
            }
        });

        this.peer.on('connection', (conn) => {
            this.setupConnection(conn);
        });
        
        this.peer.on('error', (err) => {
            this.log(`Peer error: ${err.type} - ${err.message}`, 'sys');
            document.getElementById('connection-status').textContent = `Error: ${err.type}`;
            if (err.type === 'peer-dotnet-exist') {
                this.log("Target World ID not found.", "sys");
            }
            // If it's a critical error during join, reset UI
            if (!this.isHost && Object.keys(this.connections).length === 0) {
                document.getElementById('lobby-view').style.display = 'block';
            }
        });
    }

    connectToHost() {
        const conn = this.peer.connect(this.worldId);
        this.setupConnection(conn);
        
        // Timeout if no response
        setTimeout(() => {
            if (Object.keys(this.connections).length === 0) {
                this.log("Host connection timed out.", "sys");
                location.reload();
            }
        }, 5000);
    }

    setupConnection(conn) {
        conn.on('open', () => {
            this.log(`Connected to ${conn.peer}`, 'net');
            this.connections[conn.peer] = conn;
            
            if (this.isHost) {
                // Send world info to new client including current objects
                this.sendTo(conn.peer, {
                    type: 'world_info',
                    seed: this.worldSeed,
                    shader: this.worldShader,
                    objects: this.worldObjects
                });
            }
            
            // If we are already initialized, send our info immediately
            if (this.isInitialized) {
                this.sendTo(conn.peer, {
                    type: 'player_info',
                    username: this.username,
                    avatarWords: this.avatarWords,
                    pos: this.player.pos
                });
            }
        });

        conn.on('data', (data) => {
            this.handleData(conn.peer, data);
            this.trackNet(data, 'in');
        });

        conn.on('close', () => {
            this.log(`Disconnected from ${conn.peer}`, 'net');
            this.removePlayer(conn.peer);
            delete this.connections[conn.peer];
        });
    }

    handleData(peerId, data) {
        // Host Relays to all other clients
        if (this.isHost && data.type !== 'world_info') {
            for (const id in this.connections) {
                if (id !== peerId) {
                    this.sendTo(id, data);
                }
            }
        }

        if (data.type === 'world_info') {
            this.worldSeed = data.seed;
            this.worldShader = data.shader;
            this.initGame();
            // Spawn any objects that were already in the world
            if (data.objects) {
                data.objects.forEach(obj => this.spawnObject(obj.pos, obj.words, false));
            }
            // Now that we are initialized, send our player info to the host
            this.sendTo(this.worldId, {
                type: 'player_info',
                username: this.username,
                avatarWords: this.avatarWords,
                pos: this.player.pos
            });
        } else if (data.type === 'player_info') {
            this.updatePlayer(peerId, data);
            
            // If we are host, we should also send the new player info about all other existing players
            if (this.isHost) {
                for (const id in this.players) {
                    if (id !== peerId) {
                        this.sendTo(peerId, {
                            type: 'player_info',
                            ...this.players[id].data
                        });
                    }
                }
            }
        } else if (data.type === 'move') {
            this.updatePlayerPos(peerId, data.pos, data.rot);
        } else if (data.type === 'chat') {
            this.addChatMessage(data.username, data.msg);
        } else if (data.type === 'object') {
            this.spawnObject(data.pos, data.words, true);
        }
    }

    sendTo(peerId, data) {
        const conn = this.connections[peerId];
        if (conn && conn.open) {
            conn.send(data);
            this.trackNet(data, 'out');
        }
    }

    broadcast(data) {
        for (const id in this.connections) {
            this.sendTo(id, data);
        }
    }

    trackNet(data, dir) {
        const bytes = JSON.stringify(data).length;
        this.netStats[dir][this.netStats[dir].length - 1] += bytes;
        
        if (data.type === 'move') {
            this.netStats.positional += bytes;
        } else {
            this.netStats.graphical += bytes;
            
            // Texture Words Savings Calculation
            let words = null;
            let res = 128; // Default for objects
            
            if (data.type === 'player_info') {
                words = data.avatarWords;
                res = 256; // Avatar res
            } else if (data.type === 'object') {
                words = data.words;
                res = 128; // Object res
            } else if (data.type === 'world_info' && data.objects) {
                // Batch objects from host
                data.objects.forEach(obj => {
                    this.netStats.wordsBytes += obj.words.length;
                    this.netStats.generatedBytes += 128 * 128 * 4;
                });
            }

            if (words) {
                this.netStats.wordsBytes += words.length;
                this.netStats.generatedBytes += res * res * 4; // Raw RGBA size
            }
        }
    }

    initGame() {
        document.getElementById('lobby').style.display = 'none';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('hud').style.display = 'block';
        
        this.initThree();
        this.generateTerrain();
        this.initLocalPlayer();
        
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
        
        setInterval(() => this.updateNetGraph(), 1000);
        setInterval(() => this.networkSync(), 100); // 10Hz sync
        
        this.isInitialized = true;
    }

    initThree() {
        const canvas = document.getElementById('webgl-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.005);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        const sun = new THREE.DirectionalLight(0xffffff, 1.5);
        sun.position.set(50, 100, 50);
        sun.castShadow = true;
        sun.shadow.camera.left = -60;
        sun.shadow.camera.right = 60;
        sun.shadow.camera.top = 60;
        sun.shadow.camera.bottom = -60;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        this.scene.add(sun);
        
        this.scene.add(new THREE.AmbientLight(0x404040, 0.5));
        
        // Add Clouds
        this.cloudTg = new TexGen({ width: 512, height: 512 });
        this.cloudTg.init(`void main() {
            float n = fbm(vUv * 3.0 + u_time * 0.1, 5.0);
            gl_FragColor = vec4(vec3(1.0), smoothstep(0.4, 0.6, n) * 0.4);
        }`);
        const cloudGeo = new THREE.PlaneGeometry(1000, 1000);
        this.cloudMat = new THREE.MeshBasicMaterial({ 
            map: new THREE.CanvasTexture(this.cloudTg.canvas), 
            transparent: true,
            side: THREE.DoubleSide
        });
        const cloudMesh = new THREE.Mesh(cloudGeo, this.cloudMat);
        cloudMesh.position.y = 80;
        cloudMesh.rotation.x = -Math.PI / 2;
        this.scene.add(cloudMesh);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        this.raycaster = new THREE.Raycaster();
    }

    generateTerrain() {
        const tg = new TexGen({ width: CONFIG.TERRAIN_RES, height: CONFIG.TERRAIN_RES });
        const pixels = tg.bake(this.worldShader, { 
            seed: this.worldSeed, 
            format: 'pixels' 
        });
        
        if (!pixels) {
            this.log("Failed to bake terrain pixels", "sys");
            return;
        }

        this.heightData = new Float32Array(CONFIG.TERRAIN_RES * CONFIG.TERRAIN_RES);
        for (let i = 0; i < this.heightData.length; i++) {
            this.heightData[i] = pixels[i * 4] / 255.0 * 20.0; // Height scale 20
        }
        
        const geo = new THREE.PlaneGeometry(CONFIG.TERRAIN_SIZE, CONFIG.TERRAIN_SIZE, CONFIG.TERRAIN_RES - 1, CONFIG.TERRAIN_RES - 1);
        geo.rotateX(-Math.PI / 2);
        
        const vertices = geo.attributes.position.array;
        for (let i = 0; i < this.heightData.length; i++) {
            vertices[i * 3 + 1] = this.heightData[i];
        }
        geo.computeVertexNormals();
        
        const tex = new THREE.CanvasTexture(tg.canvas);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
        
        this.terrainMesh = new THREE.Mesh(geo, mat);
        this.terrainMesh.receiveShadow = true;
        this.scene.add(this.terrainMesh);
        
        this.log("Terrain generated.", "sys");
    }

    getHeight(x, z) {
        const halfSize = CONFIG.TERRAIN_SIZE / 2;
        const gx = (x + halfSize) / CONFIG.TERRAIN_SIZE * (CONFIG.TERRAIN_RES - 1);
        const gz = (z + halfSize) / CONFIG.TERRAIN_SIZE * (CONFIG.TERRAIN_RES - 1);
        
        if (gx < 0 || gx >= CONFIG.TERRAIN_RES - 1 || gz < 0 || gz >= CONFIG.TERRAIN_RES - 1) return 0;
        
        const ix = Math.floor(gx);
        const iz = Math.floor(gz);
        const fx = gx - ix;
        const fz = gz - iz;
        
        const h00 = this.heightData[iz * CONFIG.TERRAIN_RES + ix];
        const h10 = this.heightData[iz * CONFIG.TERRAIN_RES + (ix + 1)];
        const h01 = this.heightData[(iz + 1) * CONFIG.TERRAIN_RES + ix];
        const h11 = this.heightData[(iz + 1) * CONFIG.TERRAIN_RES + (ix + 1)];
        
        const h0 = h00 * (1 - fx) + h10 * fx;
        const h1 = h01 * (1 - fx) + h11 * fx;
        return h0 * (1 - fz) + h1 * fz;
    }

    findSafeSpawn() {
        let attempts = 0;
        let pos = new THREE.Vector3();
        while (attempts < 50) {
            // Random pos within central area
            pos.x = (Math.random() - 0.5) * 40;
            pos.z = (Math.random() - 0.5) * 40;
            pos.y = this.getHeight(pos.x, pos.z);
            
            let overlapping = false;
            for (const id in this.players) {
                if (pos.distanceTo(this.players[id].mesh.position) < 2.0) {
                    overlapping = true;
                    break;
                }
            }
            if (!overlapping) return pos;
            attempts++;
        }
        return pos; // Fallback
    }

    initLocalPlayer() {
        this.player = {
            pos: this.findSafeSpawn(),
            rot: 0,
            vel: new THREE.Vector3(),
            speed: 15.0,
            turnSpeed: 3.0
        };
        
        this.localMesh = this.createAvatarMesh(this.avatarWords);
        this.scene.add(this.localMesh);
    }

    createAvatarMesh(words) {
        const group = new THREE.Group();
        
        const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.4);
        const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
        
        const parsed = this.wordParser.parse(words);
        const tg = new TexGen({ width: 256, height: 256 });
        tg.init(parsed.shader);
        tg.render(parsed.seed || 0);
        
        const tex = new THREE.CanvasTexture(tg.canvas);
        const mat = new THREE.MeshStandardMaterial({ map: tex });
        
        const body = new THREE.Mesh(bodyGeo, mat);
        body.position.y = 0.6;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        const head = new THREE.Mesh(headGeo, mat);
        head.position.y = 1.4;
        head.castShadow = true;
        head.receiveShadow = true;
        group.add(head);
        
        return group;
    }

    updatePlayer(peerId, data) {
        if (!this.players[peerId]) {
            this.log(`Player joined: ${data.username}`, 'sys');
            const mesh = this.createAvatarMesh(data.avatarWords);
            this.scene.add(mesh);
            this.players[peerId] = { 
                mesh, 
                data,
                targetPos: new THREE.Vector3(data.pos.x, data.pos.y, data.pos.z),
                targetRot: 0
            };
            mesh.position.copy(this.players[peerId].targetPos);
        }
        this.players[peerId].data = data;
        document.getElementById('player-count').textContent = Object.keys(this.players).length + 1;
    }

    updatePlayerPos(peerId, pos, rot) {
        const p = this.players[peerId];
        if (p) {
            p.targetPos.set(pos.x, pos.y, pos.z);
            p.targetRot = rot;
        }
    }

    removePlayer(peerId) {
        const p = this.players[peerId];
        if (p) {
            this.log(`Player left: ${p.data.username}`, 'sys');
            this.scene.remove(p.mesh);
            delete this.players[peerId];
        }
        document.getElementById('player-count').textContent = Object.keys(this.players).length + 1;
    }

    sendChat(msg) {
        if (!msg.trim()) return;
        this.addChatMessage(this.username, msg);
        this.broadcast({ type: 'chat', username: this.username, msg: msg });
    }

    addChatMessage(user, msg) {
        const chatEl = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.innerHTML = `<strong>${user}:</strong> ${msg}`;
        chatEl.appendChild(div);
        chatEl.scrollTop = chatEl.scrollHeight;
    }

    placeObject() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.terrainMesh);
        if (intersects.length > 0) {
            const pos = intersects[0].point;
            const words = this.getRandomAvatarWords(); // Random words for objects too
            this.spawnObject(pos, words, true); // Local objects always store
            this.broadcast({ type: 'object', pos, words });
        }
    }

    spawnObject(pos, words, shouldStore = true) {
        if (shouldStore) {
            this.worldObjects.push({ pos, words });
        }
        
        const parsed = this.wordParser.parse(words);
        const tg = new TexGen({ width: 128, height: 128 });
        tg.init(parsed.shader);
        tg.render(parsed.seed || 0);
        
        const tex = new THREE.CanvasTexture(tg.canvas);
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ map: tex });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(pos.x, pos.y + 0.5, pos.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        
        // Log sparingly
        if (shouldStore) {
            this.log(`Object placed at ${Math.round(pos.x)}, ${Math.round(pos.z)}`, 'sys');
        }
    }

    update(dt) {
        // Animate clouds
        if (this.cloudTg) {
            this.cloudTg.render(performance.now() / 1000);
            this.cloudMat.map.needsUpdate = true;
        }

        // Player movement
        if (this.input.a) this.player.rot += this.player.turnSpeed * dt;
        if (this.input.d) this.player.rot -= this.player.turnSpeed * dt;
        
        let moveDir = 0;
        if (this.input.w) moveDir = 1;
        if (this.input.s) moveDir = -1;
        
        if (moveDir !== 0) {
            const dx = Math.sin(this.player.rot) * this.player.speed * dt * moveDir;
            const dz = Math.cos(this.player.rot) * this.player.speed * dt * moveDir;
            
            const nextX = this.player.pos.x + dx;
            const nextZ = this.player.pos.z + dz;
            
            // Player collision
            let canMove = true;
            for (const id in this.players) {
                const other = this.players[id].mesh.position;
                const dist = Math.hypot(nextX - other.x, nextZ - other.z);
                if (dist < 1.0) { canMove = false; break; }
            }
            
            if (canMove) {
                this.player.pos.x = nextX;
                this.player.pos.z = nextZ;
            }
        }
        
        // Terrain stick
        this.player.pos.y = this.getHeight(this.player.pos.x, this.player.pos.z);
        
        this.localMesh.position.copy(this.player.pos);
        this.localMesh.rotation.y = this.player.rot;

        // Remote players lerp
        for (const id in this.players) {
            const p = this.players[id];
            p.mesh.position.lerp(p.targetPos, 0.2);
            p.mesh.rotation.y += (p.targetRot - p.mesh.rotation.y) * 0.2;
        }
        
        // Camera follow
        const camDist = 5;
        const camHeight = 3;
        const camX = this.player.pos.x - Math.sin(this.player.rot) * camDist;
        const camZ = this.player.pos.z - Math.cos(this.player.rot) * camDist;
        this.camera.position.lerp(new THREE.Vector3(camX, this.player.pos.y + camHeight, camZ), 0.1);
        this.camera.lookAt(this.player.pos.x, this.player.pos.y + 1, this.player.pos.z);
    }

    networkSync() {
        if (!this.player) return;
        this.broadcast({
            type: 'move',
            pos: this.player.pos,
            rot: this.player.rot
        });
    }

    drawMinimap() {
        const canvas = document.getElementById('minimap');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const worldToMap = (val) => (val + CONFIG.TERRAIN_SIZE / 2) / CONFIG.TERRAIN_SIZE * canvas.width;
        
        // Players
        ctx.fillStyle = '#0f0';
        ctx.beginPath();
        ctx.arc(worldToMap(this.player.pos.x), worldToMap(this.player.pos.z), 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#f00';
        for (const id in this.players) {
            const p = this.players[id].mesh.position;
            ctx.beginPath();
            ctx.arc(worldToMap(p.x), worldToMap(p.z), 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    updateNetGraph() {
        const canvas = document.getElementById('network-graph');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const max = Math.max(...this.netStats.in, ...this.netStats.out, 100);
        
        const drawLine = (data, color) => {
            ctx.strokeStyle = color;
            ctx.beginPath();
            for (let i = 0; i < data.length; i++) {
                const x = (i / (data.length - 1)) * canvas.width;
                const y = canvas.height - (data[i] / max) * canvas.height;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        };
        
        drawLine(this.netStats.in, '#0af');
        drawLine(this.netStats.out, '#f0a');

        // Update Totals UI
        document.getElementById('net-graphical').textContent = (this.netStats.graphical / 1024).toFixed(1);
        document.getElementById('net-uncompressed').textContent = (this.netStats.generatedBytes / 1024).toFixed(1);
        
        const savings = this.netStats.generatedBytes > 0 
            ? (1 - this.netStats.wordsBytes / this.netStats.generatedBytes) * 100 
            : 0;
        document.getElementById('net-savings').textContent = Math.max(0, savings).toFixed(1);
        
        document.getElementById('net-positional').textContent = (this.netStats.positional / 1024).toFixed(1);
        
        // Shift history
        this.netStats.in.shift(); this.netStats.in.push(0);
        this.netStats.out.shift(); this.netStats.out.push(0);
    }

    loop(t) {
        const dt = Math.min((t - this.lastTime) / 1000, 0.1);
        this.lastTime = t;
        
        this.update(dt);
        this.drawMinimap();
        this.renderer.render(this.scene, this.camera);
        
        requestAnimationFrame((t) => this.loop(t));
    }
}

window.onload = () => { window.game = new WebRTCWorld(); };
