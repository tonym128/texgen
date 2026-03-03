// game.js - 3D Marble Cube

const COMPRESSED_SHADERS = {
    wood: 'JG0geyAkbCBuID0gJGIoJFUgKiAkMigyLjAsIDEwLjApLCA1LjApOyAkMyBjb2xvciA9ICR4KCQzKDAuNSwgMC4yNSwgMC4xKSwgJDMoMC43LCAwLjQsIDAuMiksIG4pOyAkbCBncmFpbiA9ICRjKCRVLnkgKiAxMC4wICsgbiAqIDIuMCk7IGNvbG9yICo9IDAuOCArIDAuMiAqIHN0ZXAoMC4xLCBncmFpbik7ICRmID0gJDQoY29sb3IsIDEuMCk7IH0=',
    metal: 'JG0geyAkMiBzdCA9ICRVIC0gMC41OyAkbCBkID0gJGcoc3QpOyAkbCBzcGVjID0gJHMoMC4yLCAwLjAsICRnKHN0IC0gJDIoLTAuMTUsIC0wLjE1KSkpOyAkbCBuID0gJGIoJFUgKiA1LjAsIDUuMCk7ICQzIGNvbG9yID0gJHgoJDMoMC43LCAwLjc1LCAwLjgpLCAkMygwLjksIDAuOTUsIDEuMCksIG4pICsgc3BlYzsgJGwgbWFzayA9ICRzKDAuNDgsIDAuNDUsIGQpOyAkZiA9ICQ0KGNvbG9yLCBtYXNrKTsgfQ==',
    skin: 'JG0geyAkbCBuID0gJGIoJFUgKiAyMC4wLCAzLjApOyAkbCBuMiA9ICRiKCRVICogNTAuMCwgMi4wKTsgJDMgYmFzZUNvbG9yID0gJDMoMC44NSwgMC42NSwgMC41NSk7ICQzIHNoYWRvd0NvbG9yID0gJDMoMC43NSwgMC41LCAwLjQpOyAkMyBjb2xvciA9ICR4KHNoYWRvd0NvbG9yLCBiYXNlQ29sb3IsIG4gKyBuMiAqIDAuMSk7ICRmID0gJDQoY29sb3IsIDEuMCk7IH0=',
    carpet: 'JG0geyAkMiBzdCA9ICRVICogMTAuMDsgJGwgdiA9ICRPKHN0KTsgJGwgdjIgPSAkTyhzdCArICQyKDEwLjApKTsgJDMgY29sb3IxID0gJDMoMC44LCAwLjEsIDAuMyk7ICQzIGNvbG9yMiA9ICQzKDAuMiwgMC42LCAwLjgpOyAkMyBjb2xvcjMgPSAkMygwLjksIDAuOCwgMC4xKTsgJDMgY29sb3IgPSAkeChjb2xvcjEsIGNvbG9yMiwgdik7IGNvbG9yID0gJHgoY29sb3IsIGNvbG9yMiwgdjIgKiAwLjUpOyAkZiA9ICQ0KGNvbG9yLCAxLjApOyB9',
    hole: 'JG0geyAkMiBzdCA9ICRVIC0gMC41OyAkbCBkID0gJGcoc3QpOyAkbCBhID0gYXRhbihzdC55LCBzdC54KTsgJGwgc3dpcmwgPSBzaW4oYSAqIDMuMCArIGQgKiAxMC4wIC0gJHQgKiA1LjApOyAkMyBjb2wgPSAkeCgkMygwLjA1LCAwLjAsIDAuMSksICQzKDAuNCwgMC4wLCAwLjgpLCBzd2lybCAqIDAuNSArIDAuNSk7ICRsIG0gPSAkcygwLjUsIDAuNCwgZCk7ICRmID0gJDQoY29sLCBtKTsgfQ==',
    goal: 'JG0geyAkMiBzdCA9ICRVIC0gMC41OyAkbCBkID0gJGcoc3QpOyAkbCByID0gJHMoMC41LCAwLjQsIGQpIC0gJHMoMC4zLCAwLjIsIGQpOyAkbCBwID0gMC41ICsgMC41ICogc2luKCR0ICogNS4wKTsgJDMgY29sID0gJHgoJDMoMS4wLCAwLjgsIDAuMCksICQzKDEuMCwgMS4wLCAwLjUpLCBwKTsgJGYgPSAkNChjb2wsIHIpOyB9'
};

const MARBLE_TOKEN_MAP = { 'voronoi': '$O' };

class MarbleCubeGame {
    constructor() {
        this.container = document.getElementById('game-container');
        this.canvas = document.getElementById('webgl-canvas');
        this.loading = document.getElementById('loading');
        this.startBtn = document.getElementById('start-btn');
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050508);
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 180);
        
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.clock = new THREE.Clock();
        this.tg = new TexGen();
        this.tgWords = new TexGen.Words();
        this.textures = {};
        this.materials = {};
        this.holeMeshes = [];
        this.wormholes = [];
        this.goalStar = null;
        
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 20;
        
        this.state = 'LOADING';
        this.tilt = { x: 0, y: 0 };
        this.targetTilt = { x: 0, y: 0 };
        this.isMouseDown = false;
        this.isRightMouseDown = false;
        
        this.activeFaceId = 0;
        this.isTransitioning = false;
        this.transitionTime = 0;
        this.transitionDuration = 0.8;
        this.transitionData = null;
        
        this.targetBaseQuat = new THREE.Quaternion();
        this.startTime = 0;
        this.currentBaseQuat = new THREE.Quaternion();
        
        // Stats tracking
        this.stats = {
            distance: 0,
            holesUsed: 0,
            facesVisited: new Set([0])
        };
        this.lastPosition = new THREE.Vector3();
        
        this.marble = {
            radius: 2.8,
            speed: 300.0,
            mesh: null,
            body: null,
            ignoreHoleId: null,
            pos: new THREE.Vector3(),
            vel: new THREE.Vector3()
        };
        
        this.createMarbleBody();
        this.facesData = [];
        this.setupLights();
        this.setupInput();
        window.addEventListener('resize', () => this.resize());
        
        this.init();
    }
    
    createMarbleBody() {
        const material = new CANNON.Material("marble");
        this.marble.body = new CANNON.Body({
            mass: 1, shape: new CANNON.Sphere(this.marble.radius),
            material: material, linearDamping: 0.1, angularDamping: 0.1
        });
        this.world.addBody(this.marble.body);
        const groundMat = new CANNON.Material("ground");
        this.world.addContactMaterial(new CANNON.ContactMaterial(groundMat, material, { friction: 0.2, restitution: 0.3 }));
        this.groundMaterial = groundMat;
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    setupLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 150, 100); dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        Object.assign(dirLight.shadow.camera, { left: -100, right: 100, top: 100, bottom: -100, near: 0.5, far: 500 });
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);
        this.marbleLight = new THREE.PointLight(0xffcc88, 1.0, 150);
        this.marbleLight.castShadow = true; this.marbleLight.shadow.mapSize.set(512, 512);
        this.marbleLight.shadow.bias = -0.001; this.scene.add(this.marbleLight);
    }
    
    async init() {
        await this.bakeTextures();
        this.createMaterials();
        this.createWorld();
        this.generateLevel();
        this.loading.style.display = 'none';
        
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                document.getElementById('finish-banner').style.display = 'none';
                this.generateLevel(); this.startGame();
            });
        }

        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                document.getElementById('fail-banner').style.display = 'none';
                this.generateLevel(); this.startGame();
            });
        }

        const rageRetryBtn = document.getElementById('rage-retry-btn');
        if (rageRetryBtn) {
            rageRetryBtn.addEventListener('click', () => {
                document.getElementById('rage-banner').style.display = 'none';
                this.generateLevel(); this.startGame();
            });
        }

        if (window.matchMedia("(pointer: coarse)").matches) {
            this.startBtn.style.display = 'block';
            this.startBtn.addEventListener('click', () => { 
                this.requestDeviceOrientation(); 
                this.startBtn.style.display = 'none'; 
                this.startGame(); 
            });
        } else {
            this.startGame();
        }
        this.loop();
    }
    
    async bakeTextures() {
        const parseResult = this.tgWords.parse("swirl blend fbm flower");
        this.carpetShader = parseResult.shader;
        const bake = (name, b64, size) => {
            return new Promise((resolve) => {
                const src = name === 'carpet' ? this.carpetShader : TexGen.decompress(b64, MARBLE_TOKEN_MAP);
                const img = new Image();
                img.onload = () => {
                    const tex = new THREE.Texture(img); tex.needsUpdate = true;
                    if (name === 'wood') { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1); }
                    this.textures[name] = tex; resolve();
                };
                img.src = this.tg.bake(src, { width: size, height: size });
            });
        };
        await Promise.all([
            bake('wood', COMPRESSED_SHADERS.wood, 256), bake('metal', COMPRESSED_SHADERS.metal, 128),
            bake('skin', COMPRESSED_SHADERS.skin, 256), bake('carpet', COMPRESSED_SHADERS.carpet, 2048),
            bake('hole', COMPRESSED_SHADERS.hole, 128), bake('goal', COMPRESSED_SHADERS.goal, 128)
        ]);
    }
    
    createMaterials() {
        this.materials.wood = new THREE.MeshStandardMaterial({ map: this.textures.wood, roughness: 0.8, color: 0xaaaaaa });
        this.materials.metal = new THREE.MeshStandardMaterial({ map: this.textures.metal, metalness: 0.9, roughness: 0.1 });
        this.materials.skin = new THREE.MeshStandardMaterial({ map: this.textures.skin, roughness: 0.6 });
        this.materials.carpet = new THREE.MeshBasicMaterial({ map: this.textures.carpet });
        this.materials.hole = new THREE.MeshBasicMaterial({ map: this.textures.hole, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
        this.materials.goal = new THREE.MeshBasicMaterial({ map: this.textures.goal, transparent: true, alphaTest: 0.05, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
        this.materials.wall = new THREE.MeshStandardMaterial({ map: this.textures.wood, roughness: 0.9, color: 0x888888 });
        this.materials.glass = new THREE.MeshStandardMaterial({ color: 0xccffff, transparent: true, opacity: 0.3, metalness: 0.2, roughness: 0.05 });
        this.materials.portalRim = new THREE.MeshStandardMaterial({ color: 0x440088, metalness: 0.8, roughness: 0.2, emissive: 0x220044 });
        this.materials.goalStar = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.9, roughness: 0.1, emissive: 0x443300 });
        this.materials.wormholeTube = new THREE.MeshStandardMaterial({ color: 0x440088, transparent: true, opacity: 0.3, emissive: 0x110022, side: THREE.BackSide, blending: THREE.AdditiveBlending });
    }
    
    createWorld() {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), this.materials.carpet);
        floor.position.z = -200; this.scene.add(floor);
        this.pivotGroup = new THREE.Group(); this.scene.add(this.pivotGroup);
        this.boxGroup = new THREE.Group(); this.pivotGroup.add(this.boxGroup);
        this.marble.mesh = new THREE.Mesh(new THREE.SphereGeometry(this.marble.radius, 32, 32), this.materials.metal);
        this.marble.mesh.castShadow = this.marble.mesh.receiveShadow = true; this.scene.add(this.marble.mesh);
        this.facesConfig = [
            { id: 0, pos: [0, 0, 50], rot: [0, 0, 0], upQuat: [0, 0, 0] },
            { id: 1, pos: [50, 0, 0], rot: [0, Math.PI/2, 0], upQuat: [0, -Math.PI/2, 0] },
            { id: 2, pos: [0, 0, -50], rot: [0, Math.PI, 0], upQuat: [0, Math.PI, 0] },
            { id: 3, pos: [-50, 0, 0], rot: [0, -Math.PI/2, 0], upQuat: [0, Math.PI/2, 0] },
            { id: 4, pos: [0, 50, 0], rot: [-Math.PI/2, 0, 0], upQuat: [Math.PI/2, 0, 0] },
            { id: 5, pos: [0, -50, 0], rot: [Math.PI/2, 0, 0], upQuat: [-Math.PI/2, 0, 0] }
        ];
        this.scene.add(this.camera);
    }

    buildFaceMaze(faceId) {
        const face = this.facesData[faceId];
        face.walls.forEach(w => { if(w.mesh) face.group.remove(w.mesh); });
        face.bodies.forEach(b => { if(!b.isGlass) this.world.removeBody(b); });
        face.walls = []; face.bodies = face.bodies.filter(b => b.isGlass);
        const wallDepth = 9.8;
        const addW = (x, y, w, h) => {
            let safe = true; const margin = 10;
            [...face.holes, {x:-43.75,y:-43.75}, {x:43.75,y:43.75}].forEach(p => { if (Math.abs(x - p.x) < margin && Math.abs(y - p.y) < margin) safe = false; });
            if (!safe) return;
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, wallDepth), this.materials.wall);
            mesh.position.set(x, y, wallDepth/2 + 0.1); mesh.castShadow = mesh.receiveShadow = true; face.group.add(mesh);
            const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(w/2, h/2, wallDepth/2)), material: this.groundMaterial });
            body.userData = { localPos: new THREE.Vector3(x, y, wallDepth/2 + 0.1) };
            this.world.addBody(body); face.bodies.push(body); face.walls.push({ mesh, w, h, depth: wallDepth });
        };
        const b = 50; addW(0, b-1, 100, 2); addW(0, -b+1, 100, 2); addW(b-1, 0, 2, 100); addW(-b+1, 0, 2, 100);
        const gridSize = 8; const cellSize = 100 / gridSize;
        const vWalls = Array(gridSize).fill().map(() => Array(gridSize - 1).fill(true));
        const hWalls = Array(gridSize - 1).fill().map(() => Array(gridSize).fill(true));
        const visited = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
        const stack = [[0, 0]]; visited[0][0] = true;
        while(stack.length > 0) {
            const [cx, cy] = stack[stack.length - 1]; const neighbors = [];
            if (cx > 0 && !visited[cy][cx-1]) neighbors.push([cx-1, cy, 'v', cx-1, cy]);
            if (cx < gridSize-1 && !visited[cy][cx+1]) neighbors.push([cx+1, cy, 'v', cx, cy]);
            if (cy > 0 && !visited[cy-1][cx]) neighbors.push([cx, cy-1, 'h', cy-1, cx]);
            if (cy < gridSize-1 && !visited[cy+1][cx]) neighbors.push([cx, cy+1, 'h', cy, cx]);
            if (neighbors.length > 0) {
                const [nx, ny, type, r, c] = neighbors[Math.floor(Math.random() * neighbors.length)];
                if (type === 'v') vWalls[ny][r] = false; else hWalls[r][c] = false;
                visited[ny][nx] = true; stack.push([nx, ny]);
            } else stack.pop();
        }
        for(let y=0; y<gridSize; y++) for(let x=0; x<gridSize-1; x++) if (vWalls[y][x]) addW(-50 + (x+1)*cellSize, -50 + (y+0.5)*cellSize, 2, cellSize + 2);
        for(let y=0; y<gridSize-1; y++) for(let x=0; x<gridSize; x++) if (hWalls[y][x]) addW(-50 + (x+0.5)*cellSize, -50 + (y+1)*cellSize, cellSize + 2, 2);
    }

    updateWormholeTube(w) {
        const getHoleData = (fId, x, y) => {
            const f = this.facesData[fId]; f.group.updateMatrixWorld(true);
            return { pos: new THREE.Vector3(x, y, 0).applyMatrix4(f.group.matrixWorld), normal: new THREE.Vector3(0, 0, 1).applyQuaternion(f.group.quaternion).normalize() };
        };
        const d1 = getHoleData(w.h1.face, w.h1.x, w.h1.y), d2 = getHoleData(w.h2.face, w.h2.x, w.h2.y);
        const p1_in = d1.pos.clone().add(d1.normal.clone().multiplyScalar(-15)), p2_in = d2.pos.clone().add(d2.normal.clone().multiplyScalar(-15));
        const mid = d1.pos.clone().add(d2.pos).multiplyScalar(0.5).multiplyScalar(0.2);
        this.boxGroup.updateMatrixWorld(true); const invBox = this.boxGroup.matrixWorld.clone().invert();
        w.curve = new THREE.CatmullRomCurve3([d1.pos, p1_in, mid, p2_in, d2.pos].map(p => p.clone().applyMatrix4(invBox)));
        if (w.tubeMesh) { w.tubeMesh.geometry.dispose(); w.tubeMesh.geometry = new THREE.TubeGeometry(w.curve, 48, 6, 12, false); }
    }

    generateLevel() {
        this.facesData.forEach(fd => { if (fd.group) this.boxGroup.remove(fd.group); if (fd.bodies) fd.bodies.forEach(b => this.world.removeBody(b)); });
        if (this.wormholeGroup) this.boxGroup.remove(this.wormholeGroup);
        
        // Clear explosion objects
        if (this.explosionObjects) {
            this.explosionObjects.forEach(obj => {
                this.scene.remove(obj.mesh);
                this.world.removeBody(obj.body);
            });
            this.explosionObjects = [];
        }
        this.boxGroup.visible = true;

        this.wormholeGroup = new THREE.Group(); this.boxGroup.add(this.wormholeGroup);
        this.facesData = []; this.wormholes = []; this.goalStar = null; this.tilt = { x: 0, y: 0 }; this.targetTilt = { x: 0, y: 0 }; this.pivotGroup.rotation.set(0, 0, 0);
        const holeGeo = new THREE.PlaneGeometry(12, 12), rimGeo = new THREE.TorusGeometry(6, 0.5, 8, 32), glassGeo = new THREE.PlaneGeometry(100, 100);
        for (let i = 0; i < 6; i++) {
            const group = new THREE.Group(); const config = this.facesConfig[i];
            group.position.set(...config.pos); group.rotation.set(...config.rot); this.boxGroup.add(group);
            const face = { id: i, group, walls: [], holes: [], bodies: [], hasStart: i===0, hasGoal: i===5, config };
            this.facesData.push(face);
            face.glassPanes = [];
            const addGlass = (zPos, isTop) => {
                const mesh = new THREE.Mesh(glassGeo, this.materials.glass); mesh.position.z = zPos; mesh.receiveShadow = true; group.add(mesh);
                const thick = 50; const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(50, 50, thick)), material: this.groundMaterial });
                const offset = isTop ? thick : -thick; body.isGlass = true; body.userData = { localPos: new THREE.Vector3(0, 0, zPos + offset) };
                this.world.addBody(body); face.bodies.push(body);
                face.glassPanes.push({ mesh, zPos, isTop });
            };
            addGlass(11.0, true); addGlass(-1.0, false);
        }
        let holeId = 0;
        const addHolePair = (f1, f2) => {
            const getPos = () => (Math.floor(Math.random() * 6) - 2.5) * 12.5;
            const h1 = { id: holeId++, face: f1, x: getPos(), y: getPos(), targetId: holeId }, h2 = { id: holeId++, face: f2, x: getPos(), y: getPos(), targetId: holeId - 1 };
            [h1, h2].forEach(h => {
                const g = new THREE.Group(); g.position.set(h.x, h.y, 0.5); this.facesData[h.face].group.add(g);
                const m = new THREE.Mesh(holeGeo, this.materials.hole); m.renderOrder = 10; g.add(m);
                h.rimMesh = new THREE.Mesh(rimGeo, this.materials.portalRim.clone());
                h.rimMesh.castShadow = h.rimMesh.receiveShadow = true; g.add(h.rimMesh); h.visualGroup = g;
                this.facesData[h.face].holes.push(h);
            });
            const w = { h1, h2, tubeMesh: new THREE.Mesh(new THREE.BufferGeometry(), this.materials.wormholeTube.clone()), cooldown: 0, state: 'active' };
            this.wormholeGroup.add(w.tubeMesh); this.wormholes.push(w); this.updateWormholeTube(w);
        };
        addHolePair(0, 1); addHolePair(1, 2); addHolePair(2, 3); addHolePair(3, 4); addHolePair(4, 5); addHolePair(0, 3); addHolePair(1, 4);
        for(let i=0; i<6; i++) this.buildFaceMaze(i);
        if (this.facesData[5].hasGoal) {
            const starGroup = new THREE.Group(); starGroup.position.set(43.75, 43.75, 6); this.facesData[5].group.add(starGroup);
            const beam = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 20, 16, 1, true), this.materials.goal);
            beam.rotation.x = Math.PI/2; starGroup.add(beam);
            this.goalStar = new THREE.Mesh(new THREE.OctahedronGeometry(6, 0), this.materials.goalStar);
            this.goalStar.castShadow = this.goalStar.receiveShadow = true; starGroup.add(this.goalStar);
        }
        this.resetMarble(); this.snapToFace(0);
        
        // Reset stats
        this.stats = {
            distance: 0,
            holesUsed: 0,
            facesVisited: new Set([0])
        };
        this.lastPosition.copy(this.marble.body.position);
    }

    resetMarble() {
        const face = this.facesData[0];
        face.group.updateMatrixWorld();
        const startPosWorld = new THREE.Vector3(-43.75, -43.75, this.marble.radius).applyMatrix4(face.group.matrixWorld);
        this.marble.body.position.copy(startPosWorld);
        this.marble.body.velocity.set(0, 0, 0);
        this.marble.body.angularVelocity.set(0, 0, 0);
        this.marble.ignoreHoleId = null;
        this.marble.mesh.position.copy(this.marble.body.position);
    }

    updatePhysics(dt) {
        if (this.isTransitioning || this.state !== 'PLAYING') return;
        this.world.step(1/60, dt);
        
        // Track Distance
        const currentPos = new THREE.Vector3().copy(this.marble.body.position);
        this.stats.distance += currentPos.distanceTo(this.lastPosition);
        this.lastPosition.copy(currentPos);

        this.marble.mesh.position.copy(this.marble.body.position);
        this.marble.mesh.quaternion.copy(this.marble.body.quaternion);
        const gravityDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.world.gravity.set(gravityDir.x * 300, gravityDir.y * 300, gravityDir.z * 300); 
        const face = this.facesData[this.activeFaceId], faceLocalPos = new THREE.Vector3().copy(this.marble.body.position);
        face.group.worldToLocal(faceLocalPos);
        
        // Track unique faces visited
        this.stats.facesVisited.add(this.activeFaceId);

        const minZ = this.marble.radius, maxZ = 10 - this.marble.radius;
        if (faceLocalPos.z < minZ || faceLocalPos.z > maxZ) {
            faceLocalPos.z = THREE.MathUtils.clamp(faceLocalPos.z, minZ, maxZ);
            this.marble.body.position.copy(faceLocalPos.clone().applyMatrix4(face.group.matrixWorld));
            this.marble.body.velocity.z *= -0.5;
        }
        // Monitor ALL wormholes for cooldown triggers (player leaving the hole)
        this.wormholes.forEach(w => {
            if (w.state === 'cooldown_pending') {
                const exitHole = (w.h1.id === this.marble.lastEntryHoleId) ? w.h2 : w.h1;
                // Check distance to whichever end we just came out of
                const dist = Math.hypot(faceLocalPos.x - exitHole.x, faceLocalPos.y - exitHole.y);
                if (dist > 12) {
                    w.cooldown = 5;
                    w.state = 'cooldown';
                    if (this.marble.ignoreHoleId === exitHole.id) this.marble.ignoreHoleId = null;
                }
            }
        });

        for (let h of face.holes) {
            const dist = Math.hypot(faceLocalPos.x - h.x, faceLocalPos.y - h.y);
            const w = this.wormholes.find(w => w.h1.id === h.id || w.h2.id === h.id);
            
            if (this.marble.ignoreHoleId !== h.id && dist < 6 && w.cooldown <= 0) { 
                this.marble.lastEntryHoleId = h.id;
                this.transitionToHole(h); 
                break; 
            }
        }
        if (face.hasGoal && Math.hypot(faceLocalPos.x - 43.75, faceLocalPos.y - 43.75) < 8) this.finishGame();
        if (this.marble.body.position.length() > 200) this.failGame();
    }

    transitionToHole(hole) {
        const w = this.wormholes.find(w => w.h1.id === hole.id || w.h2.id === hole.id);
        const targetHole = (w.h1.id === hole.id) ? w.h2 : w.h1;
        this.isTransitioning = true; this.transitionTime = 0;
        
        this.stats.holesUsed++;

        this.transitionData = {
            targetFaceId: targetHole.face, targetHole, curve: w.curve, reverseCurve: w.h2.id === hole.id,
            startQuat: this.boxGroup.quaternion.clone(),
            targetQuat: new THREE.Quaternion().setFromEuler(new THREE.Euler(...this.facesConfig[targetHole.face].upQuat)),
            swapped: false, wormhole: w
        };
        w.cooldown = 999; w.state = 'cooldown_pending';
        const darkGray = new THREE.Color(0x222222);
        w.tubeMesh.material.color.copy(darkGray); w.tubeMesh.material.emissive.set(0x050505); w.tubeMesh.material.opacity = 0.3;
        w.h1.rimMesh.material.color.copy(darkGray); w.h1.rimMesh.material.emissive.set(0x050505);
        w.h2.rimMesh.material.color.copy(darkGray); w.h2.rimMesh.material.emissive.set(0x050505);
        this.targetBaseQuat.copy(this.transitionData.targetQuat); this.targetTilt = { x: 0, y: 0 };
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        const dt = Math.min(this.clock.getDelta(), 0.1);
        
        if (this.state === 'EXPLODING') {
            this.world.step(1/60, dt * 0.2); // Slow motion
            this.marble.mesh.position.copy(this.marble.body.position);
            this.marble.mesh.quaternion.copy(this.marble.body.quaternion);
            this.marbleLight.position.copy(this.marble.mesh.position).add(new THREE.Vector3(0, 0, 20));
            
            if (this.explosionObjects) {
                this.explosionObjects.forEach(obj => {
                    obj.mesh.position.copy(obj.body.position);
                    obj.mesh.quaternion.copy(obj.body.quaternion);
                });
            }
            if (this.goalStar) {
                this.goalStar.rotation.y += dt * 3;
                this.goalStar.rotation.z += dt * 2;
            }
        } else if (this.state === 'PLAYING') {
            const oldQuat = new THREE.Quaternion().copy(this.pivotGroup.quaternion).multiply(this.boxGroup.quaternion);
            let skipMarbleDelta = false;
            this.wormholes.forEach(w => {
                if (w.state === 'cooldown' && w.cooldown > 0) {
                    w.cooldown -= dt;
                    if (w.cooldown <= 0) {
                        w.state = 'traveled'; const orange = new THREE.Color(0xff6600), emissive = new THREE.Color(0x442200);
                        w.tubeMesh.material.color.copy(orange); w.tubeMesh.material.emissive.copy(emissive); w.tubeMesh.material.opacity = 0.4;
                        w.h1.rimMesh.material.color.copy(orange); w.h1.rimMesh.material.emissive.copy(emissive);
                        w.h2.rimMesh.material.color.copy(orange); w.h2.rimMesh.material.emissive.copy(emissive);
                    }
                }
            });
            if (this.isTransitioning && this.transitionData) {
                this.transitionTime += dt; const progress = Math.min(this.transitionTime / this.transitionDuration, 1.0);
                const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
                this.boxGroup.quaternion.slerpQuaternions(this.transitionData.startQuat, this.transitionData.targetQuat, ease);
                if (this.transitionData.curve) {
                    this.boxGroup.updateMatrixWorld(true);
                    this.marble.body.position.copy(this.transitionData.curve.getPoint(this.transitionData.reverseCurve ? 1 - progress : progress).applyMatrix4(this.boxGroup.matrixWorld));
                    this.marble.body.velocity.set(0, 0, 0); this.marble.mesh.position.copy(this.marble.body.position); skipMarbleDelta = true;
                }
                if (progress < 0.4) this.marble.mesh.scale.setScalar(Math.max(0.001, 1.0 - progress * 2.5));
                else if (!this.transitionData.swapped) {
                    this.transitionData.swapped = true; this.activeFaceId = this.transitionData.targetFaceId;
                    this.targetBaseQuat.copy(this.transitionData.targetQuat); this.marble.ignoreHoleId = this.transitionData.targetHole.id;
                } else this.marble.mesh.scale.setScalar((progress - 0.4) / 0.6);
                if (progress >= 1.0) {
                    this.marble.mesh.scale.setScalar(1.0); this.isTransitioning = false;
                    this.pivotGroup.updateMatrixWorld(true); const targetFace = this.facesData[this.activeFaceId];
                    this.marble.body.position.copy(new THREE.Vector3(this.transitionData.targetHole.x, this.transitionData.targetHole.y, this.marble.radius).applyMatrix4(targetFace.group.matrixWorld));
                    this.marble.mesh.position.copy(this.marble.body.position);
                    this.transitionData = null;
                }
            } else {
                this.tilt.x += (this.targetTilt.x - this.tilt.x) * 10 * dt; this.tilt.y += (this.targetTilt.y - this.tilt.y) * 10 * dt;
                this.pivotGroup.rotation.set(this.tilt.x, this.tilt.y, 0); this.boxGroup.quaternion.slerp(this.targetBaseQuat, 0.1);
            }
            const newQuat = new THREE.Quaternion().copy(this.pivotGroup.quaternion).multiply(this.boxGroup.quaternion), deltaQuat = new THREE.Quaternion().copy(newQuat).multiply(oldQuat.invert());
            if (!skipMarbleDelta) {
                const p = new THREE.Vector3().copy(this.marble.body.position).applyQuaternion(deltaQuat);
                this.marble.body.position.set(p.x, p.y, p.z);
                const v = new THREE.Vector3().copy(this.marble.body.velocity).applyQuaternion(deltaQuat);
                this.marble.body.velocity.set(v.x, v.y, v.z);
            }
            this.facesData.forEach(face => {
                face.group.updateMatrixWorld();
                face.bodies.forEach(body => {
                    body.position.copy(body.userData.localPos.clone().applyMatrix4(face.group.matrixWorld));
                    body.quaternion.copy(new THREE.Quaternion().setFromRotationMatrix(face.group.matrixWorld));
                });
            });
            this.updatePhysics(dt); this.marbleLight.position.copy(this.marble.mesh.position).add(new THREE.Vector3(0, 0, 20));
            this.holeMeshes.forEach(m => m.rotation.z += dt * 2);
            if (this.goalStar) { this.goalStar.rotation.y += dt * 3; this.goalStar.rotation.z += dt * 2; this.goalStar.position.z = 6 + Math.sin(performance.now() * 0.005) * 2; }
        }
        this.renderer.render(this.scene, this.camera);
    }
    
    setupInput() {
        this.canvas.addEventListener('click', () => { if (this.state === 'PLAYING') this.canvas.requestPointerLock(); });
        document.addEventListener('mousedown', (e) => { if (e.button === 0) this.isMouseDown = true; if (e.button === 2) this.isRightMouseDown = true; });
        document.addEventListener('mouseup', (e) => { if (e.button === 0) this.isMouseDown = false; if (e.button === 2) this.isRightMouseDown = false; });
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('mousemove', (e) => {
            if (this.state !== 'PLAYING') return;
            if (document.pointerLockElement === this.canvas) {
                const sensitivity = 0.002; if (this.isMouseDown && this.isRightMouseDown) return;
                if (this.isMouseDown) {
                    const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), e.movementY * sensitivity);
                    const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), e.movementX * sensitivity);
                    this.targetBaseQuat.premultiply(qx).premultiply(qy);
                } else if (this.isRightMouseDown) {
                    const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -e.movementX * sensitivity);
                    this.targetBaseQuat.premultiply(qz);
                }
            }
        });
        document.addEventListener('keydown', (e) => {
            if (this.state !== 'PLAYING' || this.isTransitioning) return;
            const rotStep = Math.PI / 2; const q = new THREE.Quaternion();
            if (e.code === 'ArrowUp' || e.code === 'KeyW') q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -rotStep);
            if (e.code === 'ArrowDown' || e.code === 'KeyS') q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), rotStep);
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -rotStep);
            if (e.code === 'ArrowRight' || e.code === 'KeyD') q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotStep);
            if (e.code === 'KeyR') { this.targetBaseQuat.setFromEuler(new THREE.Euler(...this.facesConfig[this.activeFaceId].upQuat)); this.targetTilt = { x: 0, y: 0 }; }
            if (e.code === 'KeyK') { this.rageQuit(); }
            if (q.lengthSq() > 0) this.targetBaseQuat.multiplyQuaternions(q, this.targetBaseQuat);
        });
    }

    rageQuit() {
        if (this.state === 'FINISHED' || this.state === 'EXPLODING') return;
        this.state = 'EXPLODING';
        if (document.pointerLockElement) document.exitPointerLock();
        document.getElementById('rage-banner').style.display = 'block';
        this.explodeMaze();
    }
    
    requestDeviceOrientation() {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().then(state => { if (state === 'granted') window.addEventListener('deviceorientation', (e) => this.handleOrientation(e)); });
        } else window.addEventListener('deviceorientation', (e) => this.handleOrientation(e));
    }
    
    handleOrientation(e) {
        if (this.state !== 'PLAYING') return;
        let b = Math.max(-45, Math.min(45, e.beta || 0)), g = Math.max(-45, Math.min(45, e.gamma || 0));
        this.targetTilt.x = (b / 45) * Math.PI * 0.15; this.targetTilt.y = (g / 45) * Math.PI * 0.15;
    }
    
    startGame() { this.state = 'PLAYING'; this.startTime = performance.now(); }
    
    finishGame() {
        if (this.state === 'FINISHED' || this.state === 'EXPLODING') return;
        this.state = 'EXPLODING'; 
        const endTime = performance.now(), duration = (endTime - this.startTime) / 1000;
        if (document.pointerLockElement) document.exitPointerLock();
        const banner = document.getElementById('finish-banner'), timeDisplay = document.getElementById('time-display'), list = document.getElementById('leaderboard-list');
        banner.style.display = 'block'; timeDisplay.innerText = `You finished in ${duration.toFixed(2)} seconds!`;

        const statsDisplay = document.getElementById('stats-display');
        if (statsDisplay) {
            statsDisplay.innerHTML = `
                Distance Rolled: ${this.stats.distance.toFixed(0)} units<br>
                Holes Entered: ${this.stats.holesUsed}<br>
                Faces Explored: ${this.stats.facesVisited.size} / 6
            `;
        }

        let scores = JSON.parse(localStorage.getItem('marbleCubeScores') || '[]');
        scores.push(duration); scores.sort((a, b) => a - b); scores = scores.slice(0, 5);
        localStorage.setItem('marbleCubeScores', JSON.stringify(scores));
        list.innerHTML = scores.map(s => `<li>${s.toFixed(2)}s</li>`).join('');
        this.explodeMaze();
    }
    
    explodeMaze() {
        this.world.gravity.set(0, 0, 0);
        this.explosionObjects = [];
        const center = new THREE.Vector3(0, 0, 0);
        
        // Push marble outward slightly
        const marbleImpulse = this.marble.mesh.position.clone().normalize().multiplyScalar(50);
        this.marble.body.velocity.set(marbleImpulse.x, marbleImpulse.y, marbleImpulse.z);
        
        this.facesData.forEach(face => {
            face.group.updateMatrixWorld(true);
            
            // Shatter Glass Panes
            if (face.glassPanes) {
                face.glassPanes.forEach(glass => {
                    face.group.remove(glass.mesh);
                    const shards = this.generateVoronoiShards(100, 30);
                    shards.forEach(poly => {
                        const shape = new THREE.Shape(poly);
                        const geo = new THREE.ShapeGeometry(shape);
                        geo.computeBoundingBox();
                        const shardCenter = new THREE.Vector3();
                        geo.boundingBox.getCenter(shardCenter);
                        geo.translate(-shardCenter.x, -shardCenter.y, 0);
                        
                        const mesh = new THREE.Mesh(geo, this.materials.glass);
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        const localPos = new THREE.Vector3(shardCenter.x, shardCenter.y, glass.zPos);
                        const worldPos = localPos.applyMatrix4(face.group.matrixWorld);
                        const worldQuat = new THREE.Quaternion().setFromRotationMatrix(face.group.matrixWorld);
                        
                        mesh.position.copy(worldPos);
                        mesh.quaternion.copy(worldQuat);
                        this.scene.add(mesh);
                        
                        const radius = Math.max(geo.boundingBox.max.x - geo.boundingBox.min.x, geo.boundingBox.max.y - geo.boundingBox.min.y) * 0.5;
                        const body = new CANNON.Body({
                            mass: 0.5,
                            shape: new CANNON.Sphere(radius * 0.8), // Slightly smaller sphere for looser collision
                            position: new CANNON.Vec3(worldPos.x, worldPos.y, worldPos.z),
                            quaternion: new CANNON.Quaternion(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w),
                            material: this.groundMaterial
                        });
                        
                        const impulseDir = worldPos.clone().sub(center).normalize();
                        const speed = 20 + Math.random() * 20;
                        body.velocity.set(impulseDir.x * speed, impulseDir.y * speed, impulseDir.z * speed);
                        body.angularVelocity.set((Math.random()-0.5)*5, (Math.random()-0.5)*5, (Math.random()-0.5)*5);
                        
                        this.world.addBody(body);
                        this.explosionObjects.push({ mesh, body });
                    });
                });
            }
            
            // Explode Walls
            face.walls.forEach(w => {
                face.group.remove(w.mesh);
                const worldPos = w.mesh.position.clone().applyMatrix4(face.group.matrixWorld);
                const worldQuat = new THREE.Quaternion().setFromRotationMatrix(face.group.matrixWorld);
                
                w.mesh.position.copy(worldPos);
                w.mesh.quaternion.copy(worldQuat);
                this.scene.add(w.mesh);
                
                const body = new CANNON.Body({
                    mass: 5,
                    shape: new CANNON.Box(new CANNON.Vec3(w.w/2, w.h/2, w.depth/2)),
                    position: new CANNON.Vec3(worldPos.x, worldPos.y, worldPos.z),
                    quaternion: new CANNON.Quaternion(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w),
                    material: this.groundMaterial
                });
                
                const impulseDir = worldPos.clone().sub(center).normalize();
                const speed = 10 + Math.random() * 10;
                body.velocity.set(impulseDir.x * speed, impulseDir.y * speed, impulseDir.z * speed);
                body.angularVelocity.set((Math.random()-0.5)*2, (Math.random()-0.5)*2, (Math.random()-0.5)*2);
                
                this.world.addBody(body);
                this.explosionObjects.push({ mesh: w.mesh, body });
            });
            
            // Remove old static collision bodies
            face.bodies.forEach(b => this.world.removeBody(b));
        });
        
        // Hide remaining original maze groups (holes, goals, wormholes)
        this.boxGroup.visible = false;
    }
    
    failGame() {
        this.state = 'FINISHED'; if (document.pointerLockElement) document.exitPointerLock();
        document.getElementById('fail-banner').style.display = 'block';
    }
    updateMarblePosition() { this.marble.mesh.position.copy(this.marble.body.position); this.marble.pos.copy(this.marble.body.position); }

    generateVoronoiShards(size, numPieces) {
        const points = [];
        for (let i = 0; i < numPieces; i++) {
            points.push(new THREE.Vector2((Math.random() - 0.5) * size, (Math.random() - 0.5) * size));
        }
        const cells = [];
        for (let i = 0; i < points.length; i++) {
            let poly = [
                new THREE.Vector2(-size/2, -size/2), new THREE.Vector2(size/2, -size/2),
                new THREE.Vector2(size/2, size/2), new THREE.Vector2(-size/2, size/2)
            ];
            for (let j = 0; j < points.length; j++) {
                if (i === j) continue;
                const mid = new THREE.Vector2().addVectors(points[i], points[j]).multiplyScalar(0.5);
                const n = new THREE.Vector2().subVectors(points[j], points[i]).normalize();
                const newPoly = [];
                for (let k = 0; k < poly.length; k++) {
                    const a = poly[k]; const b = poly[(k+1)%poly.length];
                    const d1 = new THREE.Vector2().subVectors(a, mid).dot(n);
                    const d2 = new THREE.Vector2().subVectors(b, mid).dot(n);
                    if (d1 <= 0) newPoly.push(a);
                    if (d1 * d2 < 0) {
                        const t = d1 / (d1 - d2);
                        newPoly.push(new THREE.Vector2().lerpVectors(a, b, t));
                    }
                }
                poly = newPoly;
            }
            if (poly.length > 2) cells.push(poly);
        }
        return cells;
    }

    resetMarble() {
        const face = this.facesData[0];
        face.group.updateMatrixWorld();
        const startPosWorld = new THREE.Vector3(-43.75, -43.75, this.marble.radius).applyMatrix4(face.group.matrixWorld);
        this.marble.body.position.copy(startPosWorld);
        this.marble.body.velocity.set(0, 0, 0);
        this.marble.body.angularVelocity.set(0, 0, 0);
        this.marble.ignoreHoleId = null;
        this.marble.mesh.position.copy(this.marble.body.position);
    }

    snapToFace(faceId) { this.activeFaceId = faceId; this.targetBaseQuat.setFromEuler(new THREE.Euler(...this.facesConfig[faceId].upQuat)); }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { MarbleCubeGame, COMPRESSED_SHADERS }; }
else { window.onload = () => new MarbleCubeGame(); }
