// game.js - TexGen Playground Logic

const API_EXAMPLES = [
    {
        id: 'new',
        name: 'new TexGen(options)',
        desc: 'Creates a new TexGen instance. The instance manages its own WebGL context and program state. You can provide an existing canvas or let the library create an OffscreenCanvas (if supported) or a standard hidden canvas for baking.',
        code: `// Initialization options
const tg = new TexGen({ 
    width: 256, 
    height: 256,
    seed: 123.45,
    webgl2: false // Set to true for GLSL 3.0 support
});

log("Instance created.");
log("Current Seed: " + tg.seed);
log("Dimensions: " + tg.width + "x" + tg.height);

// Add the internal canvas to the playground UI
document.getElementById('canvas-container').innerHTML = "";
document.getElementById('canvas-container').appendChild(tg.canvas);`
    },
    {
        id: 'bake',
        name: 'tg.bake(shader, options)',
        desc: 'A convenience method that performs init(), render(), and returns the result in one call. By default, it returns a Base64 DataURL (PNG). It is the primary tool for generating static assets.',
        code: `const tg = new TexGen({ width: 256, height: 256 });
const shader = "void main() { gl_FragColor = vec4(vUv.x, vUv.y, 0.5, 1.0); }";

// Options: time, uniforms, seed, format ('dataURL' | 'pixels' | 'bitmap')
const dataUrl = tg.bake(shader, {
    uniforms: { u_custom: 1.0 }
});

log("Static bake successful.");
log("Payload length: " + dataUrl.length + " chars");

const img = new Image();
img.src = dataUrl;
img.style.width = "100%";
document.getElementById('canvas-container').innerHTML = "";
document.getElementById('canvas-container').appendChild(img);`
    },
    {
        id: 'bakeAsync',
        name: 'TexGen.bakeAsync(shader, opts)',
        desc: 'The asynchronous version of bake(). It spawns a temporary Web Worker and uses OffscreenCanvas to generate the texture on a background thread. This is essential for preventing UI "jank" when generating large textures during gameplay.',
        code: `log("Spawning worker for background bake...");
const shader = "void main() { float n = fbm(vUv * 12.0, 6.0); gl_FragColor = vec4(vec3(n), 1.0); }";

// bakeAsync is static and creates its own instance inside the worker
TexGen.bakeAsync(shader, { width: 512, height: 512 }).then(url => {
    log("Background bake complete! URL length: " + url.length);
    const img = new Image();
    img.src = url;
    img.style.width = "100%";
    document.getElementById('canvas-container').innerHTML = "";
    document.getElementById('canvas-container').appendChild(img);
}).catch(err => {
    log("ASYNC FATAL ERROR: " + err.message);
    if (err.stack) console.error("Stack Trace:", err.stack);
    log("Tip: Ensure you are not on file:// protocol and your browser supports OffscreenCanvas.");
});`
    },
    {
        id: 'init',
        name: 'tg.init(shaderCode)',
        desc: 'Compiles the GLSL shader code and prepares the GPU program. This method injects the UTILS library (noise, fbm, etc.) and handles the boilerplate of vertex attributes and common uniforms.',
        code: `const canvas = document.getElementById('preview-canvas');
const tg = new TexGen({ canvas });
const shader = "void main() { gl_FragColor = vec4(0.0, 1.0, 0.5, 1.0); }";

try {
    const success = tg.init(shader);
    if (success) {
        log("Shader compiled and linked successfully.");
        tg.render(0);
    }
} catch (e) {
    log("Compilation Error: " + e.message);
}`
    },
    {
        id: 'updateShader',
        name: 'tg.updateShader(code)',
        desc: 'A specialized method for Hot Module Replacement (HMR). It updates the active fragment shader without re-creating the entire WebGL context or buffers, making it ideal for live editors.',
        code: `const canvas = document.getElementById('preview-canvas');
const tg = new TexGen({ canvas });
tg.init("void main() { gl_FragColor = vec4(1,0,0,1); }");
tg.render(0);

log("Initial shader rendered (Red).");

setTimeout(() => {
    log("Hot-swapping shader...");
    tg.updateShader("void main() { gl_FragColor = vec4(0,1,1,1); }");
    tg.render(0);
    log("Update complete (Cyan).");
}, 1500);`
    },
    {
        id: 'render',
        name: 'tg.render(time, uniforms)',
        desc: 'Executes the compiled shader. The time parameter is passed to u_time, and the uniforms object allows passing custom values. TexGen automatically handles types (float, vec2, vec3, vec4, sampler2D).',
        code: `const canvas = document.getElementById('preview-canvas');
const tg = new TexGen({ canvas });
const shader = "uniform float u_freq; void main() { float s = sin(vUv.x * u_freq + u_time); gl_FragColor = vec4(vec3(s), 1.0); }";

tg.init(shader);

function loop(t) {
    // Pass time in seconds and a custom frequency uniform
    tg.render(t / 1000, {
        u_freq: 20.0
    });
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
log("Animation loop started.");`
    },
    {
        id: 'compress',
        name: 'TexGen.compress(shader)',
        desc: 'Compresses GLSL source code by replacing common keywords with single-byte tokens and encoding the result in Base64. This significantly reduces the size of shader strings for storage or URL sharing.',
        code: `const shader = \`
void main() {
    float n = noise(vUv * 10.0, 10.0);
    gl_FragColor = vec4(vec3(n), 1.0);
}\`;

const compressed = TexGen.compress(shader);
log("Source Length: " + shader.length);
log("Compressed Length: " + compressed.length);
log("Efficiency: " + Math.round((1 - compressed.length/shader.length) * 100) + "% smaller");
log("Result: " + compressed);`
    },
    {
        id: 'decompress',
        name: 'TexGen.decompress(base64)',
        desc: 'The inverse of compress(). Restores a human-readable GLSL string from a tokenized Base64 payload.',
        code: `const payload = "JG0geyAkbCBuID0gJG4oJFUgKiAxMC4wLCAxMC4wKTsgJGYgPSAkNCgkMyhuKSwgMS4wKTsgfQ==";
const glsl = TexGen.decompress(payload);

log("Decompression successful.");
log("Restored GLSL:");
log(glsl);

const tg = new TexGen({ width: 256, height: 256 });
const img = new Image();
img.src = tg.bake(glsl);
document.getElementById('canvas-container').innerHTML = "";
document.getElementById('canvas-container').appendChild(img);`
    },
    {
        id: 'parseMetadata',
        name: 'TexGen.parseMetadata(code)',
        desc: 'Extracts @slider and @color annotations from GLSL comments. This allows tools to automatically build UI controls for procedural shaders.',
        code: `const shader = \`
uniform float u_scale; // @slider 1.0, 10.0, 5.0
uniform vec3 u_color;  // @color #ff0000
void main() { gl_FragColor = vec4(u_color, 1.0); }
\`;

const meta = TexGen.parseMetadata(shader);
log("Found Uniforms: " + Object.keys(meta.uniforms).join(", "));
log("Scale Default: " + meta.uniforms.u_scale.default);
log("Color Default: " + meta.uniforms.u_color.default);`
    },
    {
        id: 'schema',
        name: 'TexGen.getMetadataSchema()',
        desc: 'Returns a formal JSON Schema describing the structure of TexGen metadata. Useful for validating shader configurations in external tools or IDE extensions.',
        code: `const schema = TexGen.getMetadataSchema();
log("Metadata JSON Schema:");
log(JSON.stringify(schema, null, 2));`
    },
    {
        id: 'sobel',
        name: 'SOBEL Macro (UTILS)',
        desc: 'A built-in GLSL macro for high-quality normal map extraction. It uses a Sobel filter to calculate the gradient of a height function at the current pixel.',
        code: `const canvas = document.getElementById('preview-canvas');
const tg = new TexGen({ canvas });
const shader = \`
// 1. Define a height function
float getMap(vec2 uv) {
    return fbm(uv * 5.0, 5.0);
}

void main() {
    // 2. Use the SOBEL macro
    // Params: function, coordinate, strength
    vec3 normal = SOBEL(getMap, vUv, 2.0);
    
    // 3. Convert range [-1, 1] to [0, 1] for visual display
    gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
}\`;

tg.init(shader);
tg.render(0);
log("Sobel normals rendered.");`
    }
];

const WORDS_EXAMPLES = [
    {
        id: 'words_init',
        name: 'new TexGen.Words()',
        desc: 'Creates a natural language parser. It translates a string of keywords into a functional GLSL shader by looking up predefined snippets.',
        code: `const parser = new TexGen.Words();
const result = parser.parse("red circle");

log("Parsed sentence: 'red circle'");
log("Generated Shader:");
log(result.shader);`
    },
    {
        id: 'words_bake',
        name: 'Baking from Words',
        desc: 'You can pass the output of the Words parser directly into the TexGen bake or init methods to generate a visual texture.',
        code: `const parser = new TexGen.Words();
const tg = new TexGen({ width: 256, height: 256 });

const sentence = "blue fire spiral warp";
const result = parser.parse(sentence);

log("Generating texture for: " + sentence);
const url = tg.bake(result.shader);

const img = new Image();
img.src = url;
document.getElementById('canvas-container').innerHTML = "";
document.getElementById('canvas-container').appendChild(img);`
    },
    {
        id: 'words_complex',
        name: 'Complex Composition',
        desc: 'Combine multiple categories (Colors, Shapes, Generators, Operations, Modifiers, Spatial) to create intricate procedural art.',
        code: `const parser = new TexGen.Words();
const tg = new TexGen({ width: 512, height: 512 });

// "lava" creates the generator
// "vortex" adds spatial distortion
// "gold" tints the highlights
// "neon" boosts brightness
const sentence = "lava vortex gold neon glow";
const result = parser.parse(sentence);

log("Synthesizing: " + sentence);
const url = tg.bake(result.shader);

const img = new Image();
img.src = url;
img.style.width = "100%";
document.getElementById('canvas-container').innerHTML = "";
document.getElementById('canvas-container').appendChild(img);`
    }
];

class Playground {
    constructor() {
        this.navList = document.getElementById('nav-list');
        this.apiName = document.getElementById('api-name');
        this.apiDesc = document.getElementById('api-desc');
        this.editor = document.getElementById('editor');
        this.runBtn = document.getElementById('run-btn');
        this.saveBtn = document.getElementById('save-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.logArea = document.getElementById('log');
        this.currentExample = null;

        this.init();
    }

    init() {
        this.renderSidebar();

        this.runBtn.onclick = () => this.run();
        this.saveBtn.onclick = () => this.saveCurrent();
        this.resetBtn.onclick = () => this.loadExample(this.currentExample);
        
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') this.run();
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); this.saveCurrent(); }
        });

        this.loadExample(API_EXAMPLES[0]);
    }

    renderSidebar() {
        this.navList.innerHTML = '';
        
        // Built-in API
        const header = document.createElement('div');
        header.style.padding = '15px 20px 5px';
        header.style.fontSize = '0.75rem';
        header.style.fontWeight = 'bold';
        header.style.color = '#94a3b8';
        header.style.letterSpacing = '1px';
        header.innerText = 'LIBRARY REFERENCE';
        this.navList.appendChild(header);

        API_EXAMPLES.forEach(ex => {
            const el = document.createElement('div');
            el.className = 'nav-item';
            el.innerHTML = `<h3>${ex.name}</h3><p>${ex.desc.substring(0, 60)}...</p>`;
            el.onclick = () => this.loadExample(ex);
            this.navList.appendChild(el);
        });

        // TexGen Words
        const wordsHeader = document.createElement('div');
        wordsHeader.style.padding = '25px 20px 5px';
        wordsHeader.style.fontSize = '0.75rem';
        wordsHeader.style.fontWeight = 'bold';
        wordsHeader.style.color = '#94a3b8';
        wordsHeader.style.letterSpacing = '1px';
        wordsHeader.innerText = 'TEXGEN WORDS (ADDON)';
        this.navList.appendChild(wordsHeader);

        WORDS_EXAMPLES.forEach(ex => {
            const el = document.createElement('div');
            el.className = 'nav-item';
            el.innerHTML = `<h3>${ex.name}</h3><p>${ex.desc.substring(0, 60)}...</p>`;
            el.onclick = () => this.loadExample(ex);
            this.navList.appendChild(el);
        });

        // User Saved
        const saved = this.getSaved();
        if (Object.keys(saved).length > 0) {
            const userHeader = document.createElement('div');
            userHeader.style.padding = '25px 20px 5px';
            userHeader.style.fontSize = '0.75rem';
            userHeader.style.fontWeight = 'bold';
            userHeader.style.color = '#94a3b8';
            userHeader.style.letterSpacing = '1px';
            userHeader.innerText = 'MY SNIPPETS';
            this.navList.appendChild(userHeader);

            for (const [name, code] of Object.entries(saved)) {
                const el = document.createElement('div');
                el.className = 'nav-item';
                el.style.display = 'flex';
                el.style.justifyContent = 'space-between';
                el.style.alignItems = 'center';
                
                const textWrap = document.createElement('div');
                textWrap.innerHTML = `<h3>${name}</h3><p>User created snippet</p>`;
                el.appendChild(textWrap);

                const delBtn = document.createElement('div');
                delBtn.innerHTML = '×';
                delBtn.style.color = '#ef4444';
                delBtn.style.fontSize = '1.5rem';
                delBtn.style.padding = '0 10px';
                delBtn.style.cursor = 'pointer';
                delBtn.title = 'Delete Snippet';
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete snippet "${name}"?`)) {
                        this.deleteSaved(name);
                    }
                };
                el.appendChild(delBtn);

                el.onclick = () => this.loadExample({ name, code, desc: 'User saved snippet', id: 'user' });
                this.navList.appendChild(el);
            }
        }
    }

    deleteSaved(name) {
        const saved = this.getSaved();
        delete saved[name];
        localStorage.setItem('texgen_playground_saves', JSON.stringify(saved));
        this.renderSidebar();
        this.log(`Snippet "${name}" deleted.`);
    }

    getSaved() {
        const data = localStorage.getItem('texgen_playground_saves');
        return data ? JSON.parse(data) : {};
    }

    saveCurrent() {
        const name = prompt("Enter a name for this snippet:");
        if (!name) return;
        
        const saved = this.getSaved();
        saved[name] = this.editor.value;
        localStorage.setItem('texgen_playground_saves', JSON.stringify(saved));
        this.renderSidebar();
        this.log(`Snippet "${name}" saved!`);
    }

    log(msg) {
        const line = document.createElement('div');
        const now = new Date().toLocaleTimeString();
        line.innerText = "[" + now + "] " + msg;
        this.logArea.prepend(line);
    }

    loadExample(ex) {
        this.currentExample = ex;
        const items = Array.from(this.navList.querySelectorAll('.nav-item'));
        items.forEach(el => el.classList.remove('active'));
        
        const activeItem = items.find(el => el.querySelector('h3').innerText === ex.name);
        if (activeItem) activeItem.classList.add('active');

        this.apiName.innerText = ex.name;
        this.apiDesc.innerText = ex.desc;
        this.editor.value = ex.code;
        this.logArea.innerHTML = "Snippet loaded. Click Run to execute.";
        
        // Reset preview area
        document.getElementById('canvas-container').innerHTML = '<canvas id="preview-canvas"></canvas>';
    }

    run() {
        this.logArea.innerHTML = "";
        const code = this.editor.value;
        try {
            const execute = new Function('log', 'TexGen', code);
            execute((msg) => this.log(msg), TexGen);
        } catch (e) {
            this.log("ERROR: " + e.message);
            console.error(e);
        }
    }
}

window.onload = () => new Playground();
