/**
 * TexGen - A small library for procedural texture generation
 */

const UTILS = `
uniform float u_seed;
uniform int u_bakeMode;

float random (in vec2 st) {
    return fract(sin(dot(st.xy + u_seed, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st, float p) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    vec2 i0 = mod(i, p);
    vec2 i1 = mod(i + 1.0, p);
    float a = random(i0);
    float b = random(vec2(i1.x, i0.y));
    float c = random(vec2(i0.x, i1.y));
    float d = random(i1);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 st, float p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * noise(st, p);
        st *= 2.0;
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

vec2 hash22(vec2 p) {
    p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
    return fract(sin(p)*43758.5453123);
}

float voronoi(vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float m_dist = 1.0;
    for(int j=-1; j<=1; j++) {
        for(int i=-1; i<=1; i++) {
            vec2 g = vec2(float(i),float(j));
            vec2 o = hash22(n + g);
            vec2 r = g + o - f;
            float d = dot(r,r);
            if(d < m_dist) m_dist = d;
        }
    }
    return sqrt(m_dist);
}

float sdCircle(vec2 p, float r) { return length(p) - r; }
float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

struct PBRData {
    vec3 albedo;
    float roughness;
    float metallic;
    float ambientOcclusion;
    vec3 normal;
};

vec3 calculateNormal(float height, float strength) {
    #ifdef GL_OES_standard_derivatives
        vec3 normal = vec3(dFdx(height), dFdy(height), 0.01 / strength);
        return normalize(normal);
    #else
        return vec3(0.0, 0.0, 1.0);
    #endif
}

// Sobel Normal Extraction Macro
// Usage: vec3 n = SOBEL(myHeightFunc, vUv, 1.0);
// Requires: float myHeightFunc(vec2 uv) to be defined.
#define SOBEL(func, uv, strength) normalize(vec3( \
    func(uv - vec2(1.0/u_resolution.x, 0.0)) - func(uv + vec2(1.0/u_resolution.x, 0.0)), \
    func(uv - vec2(0.0, 1.0/u_resolution.y)) - func(uv + vec2(0.0, 1.0/u_resolution.y)), \
    2.0 / strength))

vec3 applyPBRLighting(PBRData pbr, vec3 lightDir, vec3 viewDir, vec3 lightCol) {
    if (u_bakeMode == 1) return pbr.albedo;
    if (u_bakeMode == 2) return pbr.normal * 0.5 + 0.5;
    if (u_bakeMode == 3) return vec3(pbr.roughness);
    if (u_bakeMode == 4) return vec3(pbr.metallic);
    if (u_bakeMode == 5) return vec3(pbr.ambientOcclusion);

    vec3 N = pbr.normal;
    vec3 V = viewDir;
    vec3 L = normalize(lightDir);
    vec3 H = normalize(V + L);

    float dotNH = max(dot(N, H), 0.0);
    float dotNV = max(dot(N, V), 0.0);
    float dotNL = max(dot(N, L), 0.0);

    vec3 F0 = mix(vec3(0.04), pbr.albedo, pbr.metallic);
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);

    float alpha = pbr.roughness * pbr.roughness;
    float D = alpha / (3.14159 * pow(dotNH * dotNH * (alpha - 1.0) + 1.0, 2.0));
    
    float k = alpha * 0.5;
    float G = (dotNL / (dotNL * (1.0 - k) + k)) * (dotNV / (dotNV * (1.0 - k) + k));

    vec3 specular = (D * F * G) / (4.0 * dotNL * dotNV + 0.001);
    vec3 diffuse = (1.0 - F) * (1.0 - pbr.metallic) * pbr.albedo / 3.14159;

    return (diffuse + specular) * lightCol * dotNL + pbr.albedo * 0.05 * pbr.ambientOcclusion;
}
`;

const TOKEN_MAP = {
    'void main()': '$m', 'gl_FragColor': '$f', 'vec2': '$2', 'vec3': '$3', 'vec4': '$4', 'float': '$l',
    'uniform': '$u', 'varying': '$v', 'u_time': '$t', 'vUv': '$U', 'fbm': '$b', 'noise': '$n',
    'random': '$r', 'smoothstep': '$s', 'mix': '$x', 'fract': '$c', 'floor': '$o', 'distance': '$d', 'length': '$g'
};

class TexGen {
    constructor(options = {}) {
        if (options.canvas) {
            this.canvas = options.canvas;
        } else if (typeof document !== 'undefined') {
            this.canvas = document.createElement('canvas');
        } else if (typeof OffscreenCanvas !== 'undefined') {
            this.canvas = new OffscreenCanvas(options.width || 512, options.height || 512);
        } else {
            console.warn("TexGen: No canvas environment detected. Pass a mock canvas or use headless-gl.");
            this.canvas = {};
        }

        if (options.gl) {
            this.gl = options.gl;
        } else {
            const contextType = options.webgl2 ? 'webgl2' : 'webgl';
            this.gl = this.canvas.getContext ? this.canvas.getContext(contextType, { preserveDrawingBuffer: true }) : null;
            if (!this.gl && options.webgl2 && this.canvas.getContext) {
                this.gl = this.canvas.getContext('webgl', { preserveDrawingBuffer: true });
            }
        }

        this.isWebGL2 = this.gl && typeof WebGL2RenderingContext !== 'undefined' && this.gl instanceof WebGL2RenderingContext;

        this.ext = null;
        if (this.gl && !this.isWebGL2) {
            this.ext = this.gl.getExtension('OES_standard_derivatives');
        }
        
        this.width = options.width || 512;
        this.height = options.height || 512;
        this.seed = options.seed !== undefined ? options.seed : Math.random() * 100;
        this.program = null;
        this.vs = null;
        this.fs = null;
        this.buffer = null;
    }

    static decompress(base64, customMap = null) {
        try {
            let decompressed;
            if (typeof atob === 'function') {
                decompressed = atob(base64);
            } else if (typeof Buffer !== 'undefined') {
                decompressed = Buffer.from(base64, 'base64').toString('utf8');
            } else {
                return null;
            }
            
            const map = customMap ? Object.assign({}, TOKEN_MAP, customMap) : TOKEN_MAP;
            const entries = Object.entries(map).sort((a, b) => b[1].length - a[1].length);
            for (const [token, replacement] of entries) {
                decompressed = decompressed.split(replacement).join(token);
            }
            return decompressed;
        } catch(e) { return null; }
    }

    static compress(shaderCode, customMap = null) {
        let compressed = shaderCode.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
        const map = customMap ? Object.assign({}, TOKEN_MAP, customMap) : TOKEN_MAP;
        const entries = Object.entries(map).sort((a, b) => b[0].length - a[0].length);
        for (const [token, replacement] of entries) {
            compressed = compressed.split(token).join(replacement);
        }
        if (typeof btoa === 'function') {
            return btoa(compressed);
        } else if (typeof Buffer !== 'undefined') {
            return Buffer.from(compressed).toString('base64');
        }
        return null;
    }

    static parseMetadata(shaderCode) {
        const metadata = { uniforms: {} };
        const sliderRegex = /uniform\s+float\s+(\w+);\s*\/\/\s*@slider\s*([\d\.-]+)\s*,\s*([\d\.-]+)\s*,\s*([\d\.-]+)/g;
        const colorRegex = /uniform\s+vec3\s+(\w+);\s*\/\/\s*@color\s*(#([0-9a-fA-F]{3}){1,2})/g;
        
        let match;
        while ((match = sliderRegex.exec(shaderCode)) !== null) {
            metadata.uniforms[match[1]] = {
                type: 'float',
                min: parseFloat(match[2]),
                max: parseFloat(match[3]),
                default: parseFloat(match[4])
            };
        }

        while ((match = colorRegex.exec(shaderCode)) !== null) {
            metadata.uniforms[match[1]] = {
                type: 'color',
                default: match[2]
            };
        }
        
        return metadata;
    }

    static getMetadataSchema() {
        return {
            $schema: "http://json-schema.org/draft-07/schema#",
            title: "TexGen Metadata",
            type: "object",
            properties: {
                uniforms: {
                    type: "object",
                    additionalProperties: {
                        oneOf: [
                            {
                                type: "object",
                                properties: {
                                    type: { const: "float" },
                                    min: { type: "number" },
                                    max: { type: "number" },
                                    default: { type: "number" }
                                },
                                required: ["type", "min", "max", "default"]
                            },
                            {
                                type: "object",
                                properties: {
                                    type: { const: "color" },
                                    default: { type: "string", pattern: "^#([0-9a-fA-F]{3}){1,2}$" }
                                },
                                required: ["type", "default"]
                            }
                        ]
                    }
                }
            }
        };
    }

    _createShader(type, src) {
        const gl = this.gl;
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            const errorLog = gl.getShaderInfoLog(s);
            console.error("Shader Error:", errorLog);
            throw new Error("Shader Compilation Error:\n" + errorLog);
        }
        return s;
    }

    init(shaderCode) {
        const gl = this.gl;
        if (!gl) {
            throw new Error("WebGL not supported");
        }

        if (this.program) gl.deleteProgram(this.program);
        if (this.vs) gl.deleteShader(this.vs);
        if (this.fs) gl.deleteShader(this.fs);

        const cleanedShader = shaderCode.replace(/\/\/\s*@slider.*$/gm, '').replace(/\/\/\s*@color.*$/gm, '');
        const isGLSL3 = this.isWebGL2 && cleanedShader.includes('#version 300 es');
        
        let coreShader = cleanedShader.replace(/#version 300 es/g, '').trim();
        coreShader = coreShader.includes('void main') ? coreShader : "void main() { " + coreShader + " }";

        const vsSrc = isGLSL3 ? 
            "#version 300 es\n" +
            "in vec2 p;\n" +
            "out vec2 vUvRaw;\n" +
            "void main() {\n" +
            "    vUvRaw = p * 0.5 + 0.5;\n" +
            "    gl_Position = vec4(p, 0.0, 1.0);\n" +
            "}" 
            : 
            "attribute vec2 p;\n" +
            "varying vec2 vUvRaw;\n" +
            "void main() {\n" +
            "    vUvRaw = p * 0.5 + 0.5;\n" +
            "    gl_Position = vec4(p, 0.0, 1.0);\n" +
            "}";

        const extensionHeader = (!this.isWebGL2 && this.ext) ? "#extension GL_OES_standard_derivatives : enable\n" : "";

        const fsSrc = isGLSL3 ? 
            "#version 300 es\n" +
            "#ifdef GL_FRAGMENT_PRECISION_HIGH\n" +
            "    precision highp float;\n" +
            "#else\n" +
            "    precision mediump float;\n" +
            "#endif\n" +
            "uniform float u_time;\n" +
            "uniform vec2 u_resolution;\n" +
            "uniform vec3 u_lightDir;\n" +
            "uniform vec3 u_viewDir;\n" +
            "in vec2 vUvRaw;\n" +
            "out vec4 fragColor;\n" +
            "#define vUv fract(vUvRaw)\n" +
            "#define gl_FragColor fragColor\n" +
            UTILS + "\n" +
            coreShader
            : 
            extensionHeader +
            "#ifdef GL_FRAGMENT_PRECISION_HIGH\n" +
            "    precision highp float;\n" +
            "#else\n" +
            "    precision mediump float;\n" +
            "#endif\n" +
            "uniform float u_time;\n" +
            "uniform vec2 u_resolution;\n" +
            "uniform vec3 u_lightDir;\n" +
            "uniform vec3 u_viewDir;\n" +
            "varying vec2 vUvRaw;\n" +
            "#define vUv fract(vUvRaw)\n" +
            UTILS + "\n" +
            coreShader;

        this.vs = this._createShader(gl.VERTEX_SHADER, vsSrc);
        this.fs = this._createShader(gl.FRAGMENT_SHADER, fsSrc);

        this.program = gl.createProgram();
        gl.attachShader(this.program, this.vs);
        gl.attachShader(this.program, this.fs);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            const errorLog = gl.getProgramInfoLog(this.program);
            console.error("Program Link Error:", errorLog);
            throw new Error("Program Link Error:\n" + errorLog);
        }

        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

        return true;
    }

    updateShader(shaderCode) {
        return this.init(shaderCode);
    }

    render(time = 0, uniforms = {}) {
        const gl = this.gl;
        if (!gl || !this.program) return;

        this.canvas.width = this.width;
        this.canvas.height = this.height;
        gl.viewport(0, 0, this.width, this.height);

        gl.useProgram(this.program);

        const pLoc = gl.getAttribLocation(this.program, 'p');
        gl.enableVertexAttribArray(pLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(gl.getUniformLocation(this.program, 'u_time'), time);
        gl.uniform2f(gl.getUniformLocation(this.program, 'u_resolution'), this.width, this.height);
        gl.uniform3f(gl.getUniformLocation(this.program, 'u_lightDir'), 1.0, 1.0, 1.0);
        gl.uniform3f(gl.getUniformLocation(this.program, 'u_viewDir'), 0.0, 0.0, 1.0);
        gl.uniform1f(gl.getUniformLocation(this.program, 'u_seed'), this.seed);
        gl.uniform1i(gl.getUniformLocation(this.program, 'u_bakeMode'), uniforms.u_bakeMode || 0);

        let textureUnit = 0;
        const activeTextures = [];

        for (const [key, value] of Object.entries(uniforms)) {
            if (key === 'u_bakeMode') continue;
            const loc = gl.getUniformLocation(this.program, key);
            if (loc) {
                if (Array.isArray(value)) {
                    if (value.length === 2) gl.uniform2fv(loc, value);
                    else if (value.length === 3) gl.uniform3fv(loc, value);
                    else if (value.length === 4) gl.uniform4fv(loc, value);
                } else if (typeof value === 'number') {
                    gl.uniform1f(loc, value);
                } else if (value && (value instanceof HTMLCanvasElement || (typeof OffscreenCanvas !== 'undefined' && value instanceof OffscreenCanvas) || value instanceof TexGen || (typeof HTMLImageElement !== 'undefined' && value instanceof HTMLImageElement))) {
                    const source = value instanceof TexGen ? value.canvas : value;
                    gl.activeTexture(gl.TEXTURE0 + textureUnit);
                    const tex = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, tex);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.uniform1i(loc, textureUnit);
                    activeTextures.push(tex);
                    textureUnit++;
                }
            }
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        activeTextures.forEach(tex => gl.deleteTexture(tex));
    }

    bake(shaderCode, options = {}) {
        this.width = options.width || this.width;
        this.height = options.height || this.height;
        this.seed = options.seed !== undefined ? options.seed : this.seed;
        const format = options.format || 'dataURL';
        
        if (this.init(shaderCode)) {
            this.render(options.time || 0, options.uniforms || {});
            if (format === 'pixels') {
                const pixels = new Uint8Array(this.width * this.height * 4);
                this.gl.readPixels(0, 0, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
                return pixels;
            } else if (format === 'bitmap' && typeof createImageBitmap !== 'undefined') {
                return createImageBitmap(this.canvas);
            }
            
            // OffscreenCanvas support (for Workers)
            if (typeof OffscreenCanvas !== 'undefined' && this.canvas instanceof OffscreenCanvas) {
                if (this.canvas.transferToImageBitmap) return this.canvas.transferToImageBitmap();
            }

            return this.canvas.toDataURL ? this.canvas.toDataURL() : null;
        }
        return null;
    }

    static _getWorker() {
        if (!this._workerPool) {
            this._workerPool = [];
            this._workerId = 0;
            this._workerQueue = [];
        }

        // Reuse an idle worker if available
        const idleWorker = this._workerPool.find(w => !w.busy);
        if (idleWorker) return idleWorker;

        // Create a new worker if pool is small
        if (this._workerPool.length < 4) {
            const classCode = TexGen.toString();
            const workerCode = [
                'const UTILS = ' + JSON.stringify(UTILS) + ';',
                'const TOKEN_MAP = ' + JSON.stringify(TOKEN_MAP) + ';',
                'const TexGen = (' + classCode + ');',
                'let tgInstance = null;',
                'self.onmessage = async (e) => {',
                '    try {',
                '        const { id, shaderCode, options } = e.data;',
                '        if (!tgInstance) tgInstance = new TexGen(options);',
                '        const result = await tgInstance.bake(shaderCode, options);',
                '        self.postMessage({ id, result });',
                '    } catch (err) {',
                '        self.postMessage({ id: e.data.id, error: String(err.message || err) });',
                '    }',
                '};'
            ].join('\n');

            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));
            const workerEntry = { worker, busy: false, callbacks: new Map() };
            
            worker.onmessage = (e) => {
                const { id, result, error } = e.data;
                const cb = workerEntry.callbacks.get(id);
                if (cb) {
                    if (error) {
                        cb.reject(new Error(error));
                    } else if (typeof ImageBitmap !== 'undefined' && result instanceof ImageBitmap) {
                        // Convert ImageBitmap to DataURL on main thread
                        const cvs = document.createElement('canvas');
                        cvs.width = result.width; cvs.height = result.height;
                        const ctx = cvs.getContext('2d');
                        ctx.drawImage(result, 0, 0);
                        cb.resolve(cvs.toDataURL());
                    } else {
                        cb.resolve(result);
                    }
                    workerEntry.callbacks.delete(id);
                }
                workerEntry.busy = false;
                this._processQueue();
            };

            this._workerPool.push(workerEntry);
            return workerEntry;
        }

        return null; // Must queue
    }

    static _processQueue() {
        if (this._workerQueue.length === 0) return;
        const workerEntry = this._getWorker();
        if (!workerEntry) return;

        const task = this._workerQueue.shift();
        this._executeTask(workerEntry, task);
    }

    static _executeTask(workerEntry, task) {
        const id = this._workerId++;
        workerEntry.busy = true;
        workerEntry.callbacks.set(id, task);
        workerEntry.worker.postMessage({ id, shaderCode: task.shaderCode, options: task.options });
    }

    static async bakeAsync(shaderCode, options = {}) {
        if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
            const tg = new TexGen();
            return tg.bake(shaderCode, options);
        }

        return new Promise((resolve, reject) => {
            const task = { shaderCode, options, resolve, reject };
            const workerEntry = this._getWorker();
            
            if (workerEntry) {
                this._executeTask(workerEntry, task);
            } else {
                this._workerQueue.push(task);
            }
        });
    }
}

(function (root, factory) {
    if (typeof define === 'function' && define.amd) { define([], factory); }
    else if (typeof module === 'object' && module.exports) { module.exports = factory(); }
    else { root.TexGen = factory(); }
}(typeof self !== 'undefined' ? self : this, function () { return TexGen; }));

(function (root, factory) {
    if (typeof define === 'function' && define.amd) { define([], factory); }
    else if (typeof module === 'object' && module.exports) { module.exports = factory(); }
    else { root.TexGen = factory(); }
}(typeof self !== 'undefined' ? self : this, function () { return TexGen; }));