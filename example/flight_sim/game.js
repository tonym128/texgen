// game.js - TexGen Flight Sim

// The shaders are compressed using '$' tokens to ensure single-byte ASCII safety during Base64 transport.
const COMPRESSED_SHADERS = {
    terrain: "JG0geyAkMiBzdCA9ICRVICogNC4wOyAkbCBuID0gJGIoc3QsIDQuMCk7ICRsIGggPSAkcygwLjIsIDAuOCwgbik7ICQzIGRlZXBXYXRlciA9ICQzKDAuMCwgMC4xLCAwLjMpOyAkMyBzaGFsbG93V2F0ZXIgPSAkMygwLjEsIDAuNCwgMC42KTsgJDMgc2FuZCA9ICQzKDAuOCwgMC43LCAwLjUpOyAkMyBncmFzcyA9ICQzKDAuMiwgMC40LCAwLjEpOyAkMyByb2NrID0gJDMoMC40LCAwLjM1LCAwLjMpOyAkMyBzbm93ID0gJDMoMC45LCAwLjk1LCAxLjApOyAkMyBjb2wgPSAkeChkZWVwV2F0ZXIsIHNoYWxsb3dXYXRlciwgJHMoMC4wLCAwLjMsIGgpKTsgY29sID0gJHgoY29sLCBzYW5kLCAkcygwLjMsIDAuMzUsIGgpKTsgY29sID0gJHgoY29sLCBncmFzcywgJHMoMC4zNSwgMC41LCBoKSk7IGNvbCA9ICR4KGNvbCwgcm9jaywgJHMoMC42LCAwLjc1LCBoKSk7IGNvbCA9ICR4KGNvbCwgc25vdywgJHMoMC44LCAwLjksIGgpKTsgaWYgKHVfYmFrZU1vZGUgPT0gMikgeyAkZiA9ICQ0KCQzKG1heCgwLjIsIGgpKSwgMS4wKTsgfSBlbHNlIHsgJGYgPSAkNChjb2wsIDEuMCk7IH0gfQ==",
    sky: "JHUgJGwgdV90b2Q7ICR1ICRsIHVfc3VuWTsgJG0geyAkbCB0ID0gJHQgKiAwLjA1OyAkbCBjMSA9ICRiKCRVICogMi4wICsgJDIodCwgdCAqIDAuMyksIDIuMCk7ICRsIGMyID0gJGIoJFUgKiA1LjAgLSAkMih0ICogMS41LCAwLjApLCA1LjApOyAkbCBjbG91ZHMgPSAkcygwLjQsIDAuNywgYzEgKiBjMiArIGMxICogMC41KTsgJDMgbmlnaHQgPSAkMygwLjAxLCAwLjAxLCAwLjA1KTsgJDMgdHdpbGlnaHQgPSAkMygwLjIsIDAuMSwgMC4zKTsgJDMgc3Vuc2V0ID0gJDMoMS4wLCAwLjQsIDAuMSk7ICQzIGRheSA9ICQzKDAuNCwgMC43LCAxLjApOyAkMyBza3lDb2wgPSAkeChuaWdodCwgdHdpbGlnaHQsICRzKC0wLjUsIC0wLjEsIHVfc3VuWSkpOyBza3lDb2wgPSAkeChza3lDb2wsIHN1bnNldCwgJHMoLTAuMSwgMC4xLCB1X3N1blkpKTsgc2t5Q29sID0gJHgoc2t5Q29sLCBkYXksICRzKDAuMSwgMC41LCB1X3N1blkpKTsgJGwgc3VuQW5nbGUgPSB1X3RvZCAqIDYuMjgzIC0gMS41NzsgJDIgc3VuUG9zID0gJDIoMC41ICsgY29zKHN1bkFuZ2xlKSowLjQsIDAuNSArIHNpbihzdW5BbmdsZSkqMC40KTsgJDIgbW9vblBvcyA9ICQyKDAuNSAtIGNvcyhzdW5BbmdsZSkqMC40LCAwLjUgLSBzaW4oc3VuQW5nbGUpKjAuNCk7ICRsIHN1biA9ICRzKDAuMDQsIDAuMDMsICRnKCRVIC0gc3VuUG9zKSk7ICRsIHN1bkdsb3cgPSAkcygwLjQsIDAuMCwgJGcoJFUgLSBzdW5Qb3MpKTsgJGwgbW9vbiA9ICRzKDAuMDgsIDAuMDcsICRnKCRVIC0gbW9vblBvcykpOyAkbCBtb29uR2xvdyA9ICRzKDAuMjUsIDAuMCwgJGcoJFUgLSBtb29uUG9zKSk7ICRsIHJheXMgPSAwLjA7IGlmICh1X3N1blkgPiAwLjApIHsgJDIgcmF5U3QgPSAkVSAtIHN1blBvczsgJGwgciA9ICRnKHJheVN0KTsgJGwgYSA9IGF0YW4ocmF5U3QueSwgcmF5U3QueCk7IHJheXMgPSBwb3coYWJzKHNpbihhICogMTIuMCArIHQgKiA1LjApKSwgMTAuMCkgKiAkcygwLjgsIDAuMCwgcikgKiB1X3N1blk7IH0gJDIgc3RhclV2ID0gJFUgKyAkMih1X3RvZCAqIDAuMiwgMC4wKTsgJGwgc3RhcnMgPSBzdGVwKDAuOTk4LCAkcihzdGFyVXYpKTsgc3RhcnMgKj0gKDAuNyArIDAuMyAqIHNpbigkdCAqIDIuMCArICRyKCRVKSAqIDYyLjgpKTsgc3RhcnMgKj0gJHMoMC4xLCAtMC4zLCB1X3N1blkpOyAkMyBmaW5hbENvbCA9ICR4KHNreUNvbCwgJDMoMS4wKSwgY2xvdWRzICogMC41ICogJHMoLTAuMSwgMC4yLCB1X3N1blkpKTsgZmluYWxDb2wgKz0gc3VuICogJDMoMS4wLCAxLjAsIDAuOCkgKyBzdW5HbG93ICogc3Vuc2V0ICogMC41ICogbWF4KDAuMCwgdV9zdW5ZKTsgZmluYWxDb2wgKz0gbW9vbiAqICQzKDAuOSwgMC45NSwgMS4wKSArIG1vb25HbG93ICogJDMoMC4yLCAwLjQsIDAuOCkgKiAwLjMgKiAkcygwLjAsIC0wLjIsIHVfc3VuWSk7IGZpbmFsQ29sICs9IHN0YXJzOyBmaW5hbENvbCArPSByYXlzICogJDMoMS4wLCAwLjgsIDAuNCkgKiAwLjU7ICRmID0gJDQoZmluYWxDb2wsIDEuMCk7IH0=",
    wood: "JG0geyAkbCBuID0gJGIoJFUgKiAkMigxLjAsIDEwLjApLCAxMC4wKTsgJDMgY29sb3IgPSAkeCgkMygwLjQsIDAuMiwgMC4xKSwgJDMoMC42LCAwLjQsIDAuMiksIG4pOyAkbCBncmFpbiA9ICRjKCRVLnkgKiAxMC4wKTsgY29sb3IgKj0gMC45ICsgMC4yICogc3RlcCgwLjEsIGdyYWluKTsgJGYgPSAkNChjb2xvciwgMS4wKTsgfQ==",
    steel: "JG0geyAkbCBuID0gJGIoJFUgKiAyMC4wLCAyMC4wKTsgJDMgY29sb3IgPSAkMygwLjYsIDAuNjIsIDAuNjUpICsgbiAqIDAuMTsgJGYgPSAkNChjb2xvciwgMS4wKTsgfQ==",
    metal: "JG0geyAkbCBuID0gJGIoJFUgKiA1LjAsIDUuMCk7ICQzIGNvbG9yID0gJDMoMC44LCAwLjgsIDAuODUpICsgbiAqIDAuMjsgJGYgPSAkNChjb2xvciwgMS4wKTsgfQ=="
};

function smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
}

class FlightSim {
    constructor() {
        this.input = { up: false, down: false, left: false, right: false };
        this.planeSpeed = 15.0;
        this.planeBank = 0;
        this.lastTime = performance.now();
        this.displacementScale = 200;
        this.displacementBias = 40;
        this.init();
    }

    async init() {
        const status = document.getElementById('compression-status');
        try {
            status.innerText = "Decompressing Shaders...";
            const terrainSrc = TexGen.decompress(COMPRESSED_SHADERS.terrain);
            const skySrc = TexGen.decompress(COMPRESSED_SHADERS.sky);
            const woodSrc = TexGen.decompress(COMPRESSED_SHADERS.wood);
            const steelSrc = TexGen.decompress(COMPRESSED_SHADERS.steel);
            const metalSrc = TexGen.decompress(COMPRESSED_SHADERS.metal);

            const tgBaker = new TexGen();
            const loadImg = (src) => new Promise((resolve, reject) => { 
                const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; 
            });
            
            status.innerText = "Baking Terrain Textures...";
            const albedoUrl = tgBaker.bake(terrainSrc, { width: 1024, height: 1024, uniforms: { u_bakeMode: 1 } });
            const albedoImg = await loadImg(albedoUrl);
            const heightUrl = tgBaker.bake(terrainSrc, { width: 1024, height: 1024, uniforms: { u_bakeMode: 2 } });
            const heightImg = await loadImg(heightUrl);

            this.heightCanvas = document.createElement('canvas');
            this.heightCanvas.width = 1024; this.heightCanvas.height = 1024;
            this.heightCtx = this.heightCanvas.getContext('2d');
            this.heightCtx.drawImage(heightImg, 0, 0);
            this.heightData = this.heightCtx.getImageData(0, 0, 1024, 1024).data;

            status.innerText = "Baking Airplane Textures...";
            this.woodImg = await loadImg(tgBaker.bake(woodSrc, { width: 256, height: 256 }));
            this.steelImg = await loadImg(tgBaker.bake(steelSrc, { width: 256, height: 256 }));
            this.metalImg = await loadImg(tgBaker.bake(metalSrc, { width: 256, height: 256 }));

            status.innerText = "Initializing Realtime Sky...";
            this.skyTg = new TexGen({ width: 512, height: 512 });
            this.skyTg.init(skySrc);
            this.skyTg.render(0, { u_tod: 0.5, u_sunY: 1 }); // Start at Midday

            document.getElementById('loading').style.display = 'none';
            this.initThreeJS(albedoImg, heightImg);
            this.setupInput();
            requestAnimationFrame((t) => this.loop(t));
        } catch (e) {
            console.error(e);
            status.innerText = "Initialization Failed: " + e.message;
        }
    }

    initThreeJS(albedoImg, heightImg) {
        const canvas = document.getElementById('webgl-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 4000);
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambientLight);
        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.dirLight.position.set(50, 100, 50);
        this.scene.add(this.dirLight);

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

        this.terrainMat.onBeforeCompile = (shader) => {
            shader.uniforms.u_curv = { value: 0.0004 };
            shader.vertexShader = `uniform float u_curv;\n` + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>\nfloat dist = length(transformed.xy);\ntransformed.z -= pow(dist, 2.0) * u_curv;`
            );
        };
        
        this.terrain = new THREE.Mesh(geo, this.terrainMat);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.position.y = -this.displacementBias;
        this.scene.add(this.terrain);

        const skyGeo = new THREE.PlaneGeometry(8000, 4000);
        this.skyTex = new THREE.CanvasTexture(this.skyTg.canvas);
        const skyMat = new THREE.MeshBasicMaterial({ map: this.skyTex });
        this.sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.sky);

        const woodTex = new THREE.CanvasTexture(this.woodImg);
        const steelTex = new THREE.CanvasTexture(this.steelImg);
        const metalTex = new THREE.CanvasTexture(this.metalImg);

        this.planeGroup = new THREE.Group();
        this.planeGroup.position.set(0, 60, 0);

        const bodyMat = new THREE.MeshStandardMaterial({ map: steelTex, roughness: 0.3, metalness: 0.8 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.5, 6, 12), bodyMat);
        body.rotation.x = Math.PI / 2;
        this.planeGroup.add(body);

        const wingMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.6 });
        const wings = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 2.0), wingMat);
        wings.position.set(0, 0.3, -0.5);
        this.planeGroup.add(wings);

        const tail = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 1.2), wingMat);
        tail.position.set(0, 0.3, 2.5);
        this.planeGroup.add(tail);
        
        const vTail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.5, 1.2), wingMat);
        vTail.position.set(0, 1.2, 2.5);
        this.planeGroup.add(vTail);

        const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.2), bodyMat);
        back.position.set(0, 0, 3);
        this.planeGroup.add(back);

        this.propeller = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.2, 0.1), new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.1, metalness: 1.0 }));
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
        
        const scrollSpeed = this.planeSpeed * dt * 0.01;
        this.terrainMat.map.offset.y += scrollSpeed;
        this.terrainMat.displacementMap.offset.y += scrollSpeed;

        const groundHeight = this.getTerrainHeight(0.5 + this.terrainMat.map.offset.x, 0.5 + this.terrainMat.map.offset.y);
        const minHeight = groundHeight + 15;
        if (this.planeGroup.position.y < minHeight) {
            this.planeGroup.position.y += (minHeight - this.planeGroup.position.y) * 0.1;
        }
        this.planeGroup.position.y = Math.min(400, this.planeGroup.position.y);

        this.planeGroup.rotation.x = -verticalMove * 0.1;
        this.propeller.rotation.z += 30 * dt;

        let todSliderVal = parseFloat(this.todSlider.value);
        todSliderVal = (todSliderVal + (1.0 / 180.0) * dt) % 1.0;
        this.todSlider.value = todSliderVal;

        // Correct Mapping: 
        // Slider 0.0 -> Midnight (sunY = -1, u_tod = 0.0)
        // Slider 0.5 -> Midday (sunY = 1, u_tod = 0.5)
        // Slider 1.0 -> Midnight (sunY = -1, u_tod = 1.0)
        const sunY = Math.sin(todSliderVal * Math.PI * 2 - Math.PI/2);
        const sunX = Math.cos(todSliderVal * Math.PI * 2 - Math.PI/2);

        this.skyTg.render(performance.now() / 1000, { u_tod: todSliderVal, u_sunY: sunY });
        this.skyTex.needsUpdate = true;

        const cameraOffset = new THREE.Vector3(0, 20, 60);
        this.camera.position.copy(this.planeGroup.position).add(cameraOffset);
        this.camera.lookAt(this.planeGroup.position.x, this.planeGroup.position.y + 2, this.planeGroup.position.z - 200);

        this.sky.position.copy(this.planeGroup.position);
        this.sky.position.z -= 2000;

        const isDay = sunY > 0;
        if (isDay) {
            this.dirLight.position.set(sunX * 100, sunY * 100, -50);
            this.dirLight.color.setHex(0xfff0dd);
            this.dirLight.intensity = smoothstep(0.0, 0.3, sunY) * 1.5;
            this.ambientLight.color.setHex(0xffffff);
            this.ambientLight.intensity = 0.2 + sunY * 0.3;
        } else {
            const moonY = -sunY;
            const moonX = -sunX;
            this.dirLight.position.set(moonX * 100, moonY * 100, -50);
            this.dirLight.color.setHex(0xaaaaff);
            this.dirLight.intensity = smoothstep(0.0, 0.3, moonY) * 0.5;
            this.ambientLight.color.setHex(0x8888ff);
            this.ambientLight.intensity = 0.1 + moonY * 0.15;
        }
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
