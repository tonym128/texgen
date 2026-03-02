// game.js - TexGen Flight Sim

// The shaders are compressed using '$' tokens to ensure single-byte ASCII safety during Base64 transport.
const COMPRESSED_SHADERS = {
    // Generates heightmap (u_bakeMode=2) and albedo map (u_bakeMode=1)
    terrain: "JG0geyAkMiBzdCA9ICRVICogNC4wOyAkbCBuID0gJGIoc3QsIDQuMCk7ICRsIGggPSAkcygwLjIsIDAuOCwgbik7ICQzIGRlZXBXYXRlciA9ICQzKDAuMCwgMC4yLCAwLjUpOyAkMyBzaGFsbG93V2F0ZXIgPSAkMygwLjEsIDAuNiwgMC44KTsgJDMgc2FuZCA9ICQzKDAuOCwgMC43LCAwLjUpOyAkMyBncmFzcyA9ICQzKDAuMiwgMC41LCAwLjEpOyAkMyByb2NrID0gJDMoMC40LCAwLjQsIDAuNDUpOyAkMyBzbm93ID0gJDMoMC45LCAwLjk1LCAxLjApOyAkMyBjb2wgPSAkeChkZWVwV2F0ZXIsIHNoYWxsb3dXYXRlciwgJHMoMC4wLCAwLjMsIGgpKTsgY29sID0gJHgoY29sLCBzYW5kLCAkcygwLjMsIDAuMzUsIGgpKTsgY29sID0gJHgoY29sLCBncmFzcywgJHMoMC4zNSwgMC41LCBoKSk7IGNvbCA9ICR4KGNvbCwgcm9jaywgJHMoMC42LCAwLjc1LCBoKSk7IGNvbCA9ICR4KGNvbCwgc25vdywgJHMoMC44LCAwLjksIGgpKTsgaWYgKHVfYmFrZU1vZGUgPT0gMikgeyAkbCBkaXNwbGFjZW1lbnQgPSBtYXgoMC4zLCBoKTsgJGYgPSAkNCgkMyhkaXNwbGFjZW1lbnQpLCAxLjApOyB9IGVsc2UgeyAkZiA9ICQ0KGNvbCwgMS4wKTsgfSB9",
    // Animated sky with day/night cycle, sun, moon, stars, and god rays
    sky: "JHUgJGwgdV90b2Q7ICRtIHsgJGwgdCA9ICR0ICogMC4xOyAkbCBjbG91ZHMgPSAkYigkVSAqIDMuMCArICQyKHQsIDAuMCksIDMuMCk7IGNsb3VkcyAqPSAkYigkVSAqIDguMCAtICQyKHQgKiAwLjUsIDAuMCksIDguMCk7ICRsIHN1blkgPSBjb3ModV90b2QgKiA2LjI4Myk7ICRsIGRheUN5Y2xlID0gJHMoLTAuMiwgMC40LCBzdW5ZKTsgJDMgbmlnaHRTa3kgPSAkMygwLjAxLCAwLjAyLCAwLjA4KTsgJDMgc3Vuc2V0U2t5ID0gJHgoJDMoMC45LCAwLjMsIDAuMSksICQzKDAuMSwgMC4xLCAwLjQpLCAkVS55KTsgJDMgZGF5U2t5ID0gJHgoJDMoMC4zLCAwLjYsIDEuMCksICQzKDAuMSwgMC40LCAwLjgpLCAkVS55KTsgJDMgc2t5ID0gJHgobmlnaHRTa3ksIHN1bnNldFNreSwgJHMoLTAuMywgMC4xLCBzdW5ZKSk7IHNreSA9ICR4KHNreSwgZGF5U2t5LCBkYXlDeWNsZSk7ICRsIHN1bkFuZ2xlID0gdV90b2QgKiA2LjI4MyAtIDEuNTc7ICQyIHN1blBvcyA9ICQyKDAuNSArIGNvcyhzdW5BbmdsZSkqMC40LCAwLjUgKyBzaW4oc3VuQW5nbGUpKjAuNCk7ICRsIGRUb1N1biA9ICRnKCRVIC0gc3VuUG9zKTsgJGwgc3VuID0gJHMoMC4wNCwgMC4wMywgZFRvU3VuKTsgJGwgcmF5cyA9IDAuMDsgaWYgKHN1blkgPiAwLjApIHsgJGwgYSA9IGF0YW4oJFUueSAtIHN1blBvcy55LCAkVS54IC0gc3VuUG9zLngpOyByYXlzID0gcG93KGFicyhzaW4oYSAqIDguMCArIHQgKiAyLjApKSwgOC4wKSAqICRzKDAuNiwgMC4wLCBkVG9TdW4pICogc3VuWTsgfSAkbCBzdGFycyA9IHN0ZXAoMC45OTcsICRyKCRVICsgJG8odCkpKSAqICgxLjAgLSBkYXlDeWNsZSk7ICQzIGNvbCA9ICR4KHNreSwgJDMoMS4wKSwgY2xvdWRzICogMC40ICogZGF5Q3ljbGUpOyBjb2wgKz0gJDMoMS4wLCAwLjksIDAuNikgKiBzdW47IGNvbCArPSAkMygxLjAsIDAuNywgMC4zKSAqIHJheXMgKiAwLjY7IGNvbCArPSAkMygxLjApICogc3RhcnM7ICRmID0gJDQoY29sLCAxLjApOyB9",
    // New textures for the plane
    wood: "JG0geyAkbCBuID0gJGIoJFUgKiAkMigxLjAsIDEwLjApLCAxMC4wKTsgJDMgY29sb3IgPSAkeCgkMygwLjQsIDAuMiwgMC4xKSwgJDMoMC42LCAwLjQsIDAuMiksIG4pOyAkbCBncmFpbiA9ICRjKCRVLnkgKiAxMC4wKTsgY29sb3IgKj0gMC45ICsgMC4yICogc3RlcCgwLjEsIGdyYWluKTsgJGYgPSAkNChjb2xvciwgMS4wKTsgfQ==",
    steel: "JG0geyAkbCBuID0gJGIoJFUgKiAyMC4wLCAyMC4wKTsgJDMgY29sb3IgPSAkMygwLjYsIDAuNjIsIDAuNjUpICsgbiAqIDAuMTsgJGYgPSAkNChjb2xvciwgMS4wKTsgfQ==",
    metal: "JG0geyAkbCBuID0gJGIoJFUgKiA1LjAsIDUuMCk7ICQzIGNvbG9yID0gJDMoMC44LCAwLjgsIDAuODUpICsgbiAqIDAuMjsgJGYgPSAkNChjb2xvciwgMS4wKTsgfQ=="
};

class FlightSim {
    constructor() {
        this.input = { up: false, down: false, left: false, right: false };
        this.planeSpeed = 15.0;
        this.planeBank = 0;
        this.lastTime = performance.now();
        this.displacementScale = 80;
        this.displacementBias = 20; // terrain.position.y
        this.init();
    }

    async init() {
        const status = document.getElementById('compression-status');
        
        try {
            // Decompress shaders
            status.innerText = "Decompressing Shaders...";
            const terrainSrc = TexGen.decompress(COMPRESSED_SHADERS.terrain);
            const skySrc = TexGen.decompress(COMPRESSED_SHADERS.sky);
            const woodSrc = TexGen.decompress(COMPRESSED_SHADERS.wood);
            const steelSrc = TexGen.decompress(COMPRESSED_SHADERS.steel);
            const metalSrc = TexGen.decompress(COMPRESSED_SHADERS.metal);

            // Bake textures
            const tgBaker = new TexGen();
            const loadImg = (src) => new Promise((resolve, reject) => { 
                const img = new Image(); 
                img.onload = () => resolve(img); 
                img.onerror = reject;
                img.src = src; 
            });
            
            status.innerText = "Baking Terrain Textures...";
            const albedoUrl = tgBaker.bake(terrainSrc, { width: 1024, height: 1024, uniforms: { u_bakeMode: 1 } });
            const albedoImg = await loadImg(albedoUrl);
            const heightUrl = tgBaker.bake(terrainSrc, { width: 1024, height: 1024, uniforms: { u_bakeMode: 2 } });
            const heightImg = await loadImg(heightUrl);

            // Helper for sampling height data
            this.heightCanvas = document.createElement('canvas');
            this.heightCanvas.width = 1024;
            this.heightCanvas.height = 1024;
            this.heightCtx = this.heightCanvas.getContext('2d');
            this.heightCtx.drawImage(heightImg, 0, 0);
            this.heightData = this.heightCtx.getImageData(0, 0, 1024, 1024).data;

            status.innerText = "Baking Airplane Textures...";
            const woodUrl = tgBaker.bake(woodSrc, { width: 256, height: 256 });
            this.woodImg = await loadImg(woodUrl);
            const steelUrl = tgBaker.bake(steelSrc, { width: 256, height: 256 });
            this.steelImg = await loadImg(steelUrl);
            const metalUrl = tgBaker.bake(metalSrc, { width: 256, height: 256 });
            this.metalImg = await loadImg(metalUrl);

            // Setup Realtime Sky
            status.innerText = "Initializing Realtime Sky...";
            this.skyTg = new TexGen({ width: 512, height: 512 });
            this.skyTg.init(skySrc);
            this.skyTg.render(0, { u_tod: 0.1 });

            document.getElementById('loading').style.display = 'none';

            this.initThreeJS(albedoImg, heightImg);
            this.setupInput();
            
            requestAnimationFrame((t) => this.loop(t));
        } catch (e) {
            console.error("FlightSim Initialization Error:", e);
            status.innerText = "Initialization Failed: " + e.message;
            status.style.color = "red";
        }
    }

    initThreeJS(albedoImg, heightImg) {
        const canvas = document.getElementById('webgl-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Lighting
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambientLight);
        
        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.dirLight.position.set(50, 100, 50);
        this.scene.add(this.dirLight);

        // Terrain
        const albedoTex = new THREE.CanvasTexture(albedoImg);
        albedoTex.wrapS = albedoTex.wrapT = THREE.RepeatWrapping;
        
        const heightTex = new THREE.CanvasTexture(heightImg);
        heightTex.wrapS = heightTex.wrapT = THREE.RepeatWrapping;

        const geo = new THREE.PlaneGeometry(2000, 2000, 256, 256);
        this.terrainMat = new THREE.MeshStandardMaterial({
            map: albedoTex,
            displacementMap: heightTex,
            displacementScale: this.displacementScale,
            roughness: 0.8,
            metalness: 0.1
        });
        
        this.terrain = new THREE.Mesh(geo, this.terrainMat);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.position.y = -this.displacementBias;
        this.scene.add(this.terrain);

        // SkyDome (Background plane that moves with camera)
        const skyGeo = new THREE.PlaneGeometry(4000, 2000);
        this.skyTex = new THREE.CanvasTexture(this.skyTg.canvas);
        const skyMat = new THREE.MeshBasicMaterial({ map: this.skyTex });
        this.sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.sky);

        // Textures for plane
        const woodTex = new THREE.CanvasTexture(this.woodImg);
        const steelTex = new THREE.CanvasTexture(this.steelImg);
        const metalTex = new THREE.CanvasTexture(this.metalImg);

        // Build Airplane Model (Facing NEGATIVE Z)
        this.planeGroup = new THREE.Group();
        this.planeGroup.position.set(0, 20, 0);

        // Chassis (Steel)
        const bodyGeo = new THREE.CylinderGeometry(0.8, 0.5, 6, 12);
        const bodyMat = new THREE.MeshStandardMaterial({ map: steelTex, roughness: 0.3, metalness: 0.8 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI / 2;
        this.planeGroup.add(body);

        // Wings (Wood)
        const wingGeo = new THREE.BoxGeometry(10, 0.2, 2.0);
        const wingMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6 });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.set(0, 0.3, -0.5);
        this.planeGroup.add(wings);

        const tailGeo = new THREE.BoxGeometry(3.5, 0.15, 1.2);
        const tail = new THREE.Mesh(tailGeo, wingMat);
        tail.position.set(0, 0.3, 2.5);
        this.planeGroup.add(tail);
        
        const vTailGeo = new THREE.BoxGeometry(0.15, 2.5, 1.2);
        const vTail = new THREE.Mesh(vTailGeo, wingMat);
        vTail.position.set(0, 1.2, 2.5);
        this.planeGroup.add(vTail);

        // Close back of fuselage (Steel)
        const backGeo = new THREE.BoxGeometry(1.6, 1.6, 0.2);
        const back = new THREE.Mesh(backGeo, bodyMat);
        back.position.set(0, 0, 3);
        this.planeGroup.add(back);

        // Propeller (Shiny Metal)
        this.propeller = new THREE.Mesh(
            new THREE.BoxGeometry(4.0, 0.2, 0.1), 
            new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.1, metalness: 1.0 })
        );
        this.propeller.position.set(0, 0, -3);
        this.planeGroup.add(this.propeller);

        this.scene.add(this.planeGroup);
        
        this.todSlider = document.getElementById('tod-slider');
    }

    setupInput() {
        window.addEventListener('keydown', e => this.handleKey(e.code, true));
        window.addEventListener('keyup', e => this.handleKey(e.code, false));
    }

    handleKey(code, isDown) {
        if (code === 'ArrowUp' || code === 'KeyW') this.input.up = isDown;
        if (code === 'ArrowDown' || code === 'KeyS') this.input.down = isDown;
        if (code === 'ArrowLeft' || code === 'KeyA') this.input.left = isDown;
        if (code === 'ArrowRight' || code === 'KeyD') this.input.right = isDown;
    }

    getTerrainHeight(uvX, uvY) {
        const x = Math.floor(((uvX % 1 + 1) % 1) * 1024);
        const y = Math.floor(((uvY % 1 + 1) % 1) * 1024);
        const idx = (y * 1024 + x) * 4;
        const val = this.heightData[idx] / 255;
        return val * this.displacementScale - this.displacementBias;
    }

    update(dt) {
        const turnSpeed = 0.1 * dt;
        if (this.input.left) {
            this.planeBank += 2.0 * dt;
            this.terrainMat.map.offset.x -= turnSpeed;
            this.terrainMat.displacementMap.offset.x -= turnSpeed;
        } else if (this.input.right) {
            this.planeBank -= 2.0 * dt;
            this.terrainMat.map.offset.x += turnSpeed;
            this.terrainMat.displacementMap.offset.x += turnSpeed;
        } else {
            this.planeBank *= 0.9;
        }
        this.planeBank = Math.max(-0.5, Math.min(0.5, this.planeBank));
        this.planeGroup.rotation.z = this.planeBank;

        let verticalMove = 0;
        if (this.input.up) verticalMove = 15 * dt;
        if (this.input.down) verticalMove = -15 * dt;
        this.planeGroup.position.y += verticalMove;
        
        // Correct forward scroll: positive Y offset moves terrain TOWARDS the camera
        const scrollSpeed = this.planeSpeed * dt * 0.01;
        this.terrainMat.map.offset.y += scrollSpeed;
        this.terrainMat.displacementMap.offset.y += scrollSpeed;

        const groundHeight = this.getTerrainHeight(0.5 + this.terrainMat.map.offset.x, 0.5 + this.terrainMat.map.offset.y);
        const minHeight = groundHeight + 8;
        if (this.planeGroup.position.y < minHeight) {
            this.planeGroup.position.y += (minHeight - this.planeGroup.position.y) * 0.1;
        }
        this.planeGroup.position.y = Math.min(150, this.planeGroup.position.y);

        this.planeGroup.rotation.x = -verticalMove * 0.1;
        this.propeller.rotation.z += 30 * dt;

        // Auto-cycle Time of Day (3 mins per cycle)
        let tod = parseFloat(this.todSlider.value);
        tod = (tod + (1.0 / 180.0) * dt) % 1.0;
        this.todSlider.value = tod;

        this.skyTg.render(performance.now() / 1000, { u_tod: tod });
        this.skyTex.needsUpdate = true;

        // Chase Camera (Behind the plane, looking forward)
        const cameraOffset = new THREE.Vector3(0, 12, 35);
        this.camera.position.copy(this.planeGroup.position).add(cameraOffset);
        this.camera.lookAt(this.planeGroup.position.x, this.planeGroup.position.y + 2, this.planeGroup.position.z - 100);

        this.sky.position.copy(this.planeGroup.position);
        this.sky.position.z -= 1000;

        const sunAngle = tod * Math.PI * 2 - Math.PI/2;
        this.dirLight.position.set(0, Math.sin(sunAngle) * 100, Math.cos(sunAngle) * 100);
        this.dirLight.intensity = Math.max(0, Math.sin(sunAngle)) * 1.5;
        this.ambientLight.intensity = Math.max(0.1, Math.sin(sunAngle) * 0.5);
    }

    loop(t) {
        const dt = Math.min((t - this.lastTime) / 1000, 0.1);
        this.lastTime = t;
        this.update(dt);
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame((t) => this.loop(t));
    }
}

window.onload = () => new FlightSim();
