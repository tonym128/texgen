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

        this.gl = this.canvas.getContext ? this.canvas.getContext('webgl', { preserveDrawingBuffer: true }) : null;
        this.ext = null;
        if (this.gl) {
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

    static decompress(base64) {
        try {
            let decompressed;
            if (typeof atob === 'function') {
                decompressed = atob(base64);
            } else if (typeof Buffer !== 'undefined') {
                decompressed = Buffer.from(base64, 'base64').toString('utf8');
            } else {
                return null;
            }
            
            for (const [token, replacement] of Object.entries(TOKEN_MAP)) {
                decompressed = decompressed.split(replacement).join(token);
            }
            return decompressed;
        } catch(e) { return null; }
    }

    _createShader(type, src) {
        const gl = this.gl;
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error("Shader Error:", gl.getShaderInfoLog(s));
            return null;
        }
        return s;
    }

    init(shaderCode) {
        const gl = this.gl;
        if (!gl) {
            console.error("WebGL not supported");
            return false;
        }

        if (this.program) gl.deleteProgram(this.program);
        if (this.vs) gl.deleteShader(this.vs);
        if (this.fs) gl.deleteShader(this.fs);

        const vsSrc = `
            attribute vec2 p;
            varying vec2 vUvRaw;
            void main() {
                vUvRaw = p * 0.5 + 0.5;
                gl_Position = vec4(p, 0, 1);
            }
        `;

        const cleanedShader = shaderCode.replace(/\/\/\s*@slider.*$/gm, '').replace(/\/\/\s*@color.*$/gm, '');
        const extensionHeader = this.ext ? "#extension GL_OES_standard_derivatives : enable\n" : "";

        const fsSrc = `
            ${extensionHeader}
            precision mediump float;
            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec3 u_lightDir;
            uniform vec3 u_viewDir;
            varying vec2 vUvRaw;
            #define vUv fract(vUvRaw)
            ${UTILS}
            ${cleanedShader.includes('void main') ? cleanedShader : `void main() { ${cleanedShader} }`}
        `;

        this.vs = this._createShader(gl.VERTEX_SHADER, vsSrc);
        this.fs = this._createShader(gl.FRAGMENT_SHADER, fsSrc);
        if (!this.vs || !this.fs) return false;

        this.program = gl.createProgram();
        gl.attachShader(this.program, this.vs);
        gl.attachShader(this.program, this.fs);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error("Program Link Error:", gl.getProgramInfoLog(this.program));
            return false;
        }

        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

        return true;
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
                }
            }
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    bake(shaderCode, options = {}) {
        this.width = options.width || this.width;
        this.height = options.height || this.height;
        this.seed = options.seed !== undefined ? options.seed : this.seed;
        
        if (this.init(shaderCode)) {
            this.render(options.time || 0, options.uniforms || {});
            return this.canvas.toDataURL();
        }
        return null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TexGen;
} else if (typeof define === 'function' && define.amd) {
    define([], () => TexGen);
} else {
    window.TexGen = TexGen;
}

// ESM Support
export default TexGen;
