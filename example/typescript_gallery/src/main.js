// main.ts - TexGen TypeScript Gallery
// @ts-ignore
import TexGen from './texgen.mjs';
const app = document.getElementById('app');
const modalOverlay = document.getElementById('modal-overlay');
const modalCanvas = document.getElementById('modal-canvas');
const modalEditor = document.getElementById('modal-editor');
const modalTitle = document.getElementById('modal-title');
const modalError = document.getElementById('modal-error');
const modalTg = new TexGen({ canvas: modalCanvas, width: 512, height: 512 });
let activeDemoLoop = null;
const createCard = (title, badge, description, initialCode, onUpdate) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.cursor = 'pointer';
    card.innerHTML = `
        <div class="badge">${badge}</div>
        <h2>${title}</h2>
        <div class="display-area"></div>
        <p style="font-size: 0.85rem; color: #94a3b8;">${description}</p>
    `;
    app.appendChild(card);
    card.onclick = () => {
        modalTitle.innerText = title;
        modalEditor.value = initialCode.trim();
        modalOverlay.style.display = 'flex';
        modalError.style.display = 'none';
        if (activeDemoLoop)
            cancelAnimationFrame(activeDemoLoop);
        modalTg.init(modalEditor.value);
        const loop = () => {
            modalTg.render(performance.now() / 1000);
            activeDemoLoop = requestAnimationFrame(loop);
        };
        loop();
        modalEditor.oninput = () => {
            modalError.style.display = 'none';
            try {
                if (modalTg.init(modalEditor.value)) {
                    if (onUpdate)
                        onUpdate(modalEditor.value);
                }
                else {
                    modalError.innerText = "Shader Error: Check console for details.";
                    modalError.style.display = 'block';
                }
            }
            catch (e) {
                modalError.innerText = e.message;
                modalError.style.display = 'block';
            }
        };
    };
    return card.querySelector('.display-area');
};
// 1. Static Bake
const demo1 = () => {
    const code = `void main() {\n    float n = fbm(vUv * 8.0, 8.0);\n    gl_FragColor = vec4(vec3(n), 1.0);\n}`;
    const container = createCard('Static Bake', 'Uncompressed', 'Click to edit the procedural noise pattern.', code, (newCode) => {
        const url = tg.bake(newCode);
        if (url)
            img.src = url;
    });
    const tg = new TexGen({ width: 256, height: 256 });
    const img = document.createElement('img');
    img.src = tg.bake(code);
    container.appendChild(img);
};
// 2. Real-time Animated
const demo2 = () => {
    const code = `uniform float u_speed;\nvoid main() {\n    vec2 p = vUv - 0.5;\n    float d = length(p);\n    float ring = sin(d * 20.0 - u_time * u_speed);\n    gl_FragColor = vec4(vec3(smoothstep(0.0, 0.1, ring)), 1.0);\n}`;
    const container = createCard('Animated GPU', 'Real-time', 'Click to modify the pulse speed or frequency.', code, (newCode) => {
        tg.init(newCode);
    });
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    container.appendChild(canvas);
    const tg = new TexGen({ canvas });
    tg.init(code);
    const loop = () => {
        tg.render(performance.now() / 1000, { u_speed: 5.0 });
        requestAnimationFrame(loop);
    };
    loop();
};
// 3. Compressed Payload
const demo3 = () => {
    // Robust Lava Payload
    const LAVA_PAYLOAD = "JG0geyAkMiBzdCA9ICRVICogNC4wOyAkbCBuID0gJGIoc3QsIDQuMCk7ICQzIGNvbCA9ICR4KCQzKDAuNSwgMC4wLCAwLjApLCAkMygxLjAsIDAuNSwgMC4wKSwgbik7ICRmID0gJDQoY29sLCAxLjApOyB9";
    const code = TexGen.decompress(LAVA_PAYLOAD);
    if (!code) {
        console.error("Lava Decompression Failed");
        return;
    }
    const container = createCard('Compressed Lava', '1KB Payload', 'Click to see the decompressed source code.', code, (newCode) => {
        tg.init(newCode);
    });
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    container.appendChild(canvas);
    const tg = new TexGen({ canvas });
    tg.init(code);
    const loop = () => { tg.render(performance.now() / 1000); requestAnimationFrame(loop); };
    loop();
};
// 4. Sprite Sheet
const demo4 = () => {
    const code = `void main() {\n    vec2 grid = floor(vUv * 4.0);\n    vec2 localUv = fract(vUv * 4.0);\n    float d = length(localUv - 0.5);\n    float n = random(grid + vec2(u_seed));\n    float size = 0.1 + n * 0.3;\n    float pulse = smoothstep(size, size - 0.05, d);\n    gl_FragColor = vec4(vec3(pulse), 1.0);\n}`;
    const container = createCard('Sprite Sheet', 'Baked Atlas', 'Edit the grid math or shape definitions.', code, (newCode) => {
        const url = tg.bake(newCode, { seed: 42 });
        if (url)
            img.src = url;
    });
    const tg = new TexGen({ width: 512, height: 512 });
    const img = document.createElement('img');
    img.src = tg.bake(code, { seed: 42 });
    container.appendChild(img);
};
// 5. PBR Normal Map
const demo5 = () => {
    const code = `void main() {\n    float h = fbm(vUv * 10.0, 10.0);\n    if (u_bakeMode == 2) {\n        gl_FragColor = vec4(calculateNormal(h, 2.0) * 0.5 + 0.5, 1.0);\n    } else {\n        gl_FragColor = vec4(vec3(h), 1.0);\n    }\n}`;
    const container = createCard('Normal Map', 'Extraction', 'Modify the heightmap or normal strength.', code, (newCode) => {
        const url = tg.bake(newCode, { uniforms: { u_bakeMode: 2 } });
        if (url)
            img.src = url;
    });
    const tg = new TexGen({ width: 256, height: 256 });
    const img = document.createElement('img');
    img.src = tg.bake(code, { uniforms: { u_bakeMode: 2 } });
    container.appendChild(img);
};
// 6. Technical Blueprint
const demo6 = () => {
    const code = `void main() {\n    vec2 st = vUv * 10.0;\n    vec2 grid = fract(st);\n    float border = step(0.95, grid.x) + step(0.95, grid.y);\n    float v = voronoi(vUv * 5.0);\n    vec3 col = mix(vec3(0.0, 0.2, 0.4), vec3(0.0, 0.8, 1.0), border);\n    col += (1.0 - v) * 0.2;\n    gl_FragColor = vec4(col, 1.0);\n}`;
    const container = createCard('Blueprint', 'Geometric', 'Adjust the grid scale or Voronoi noise.', code, (newCode) => {
        tg.init(newCode);
    });
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    container.appendChild(canvas);
    const tg = new TexGen({ canvas });
    tg.init(code);
    const loop = () => { tg.render(performance.now() / 1000); requestAnimationFrame(loop); };
    loop();
};
// Initialize all demos
demo1();
demo2();
demo3();
demo4();
demo5();
demo6();
