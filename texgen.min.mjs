var g=`
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
#define SOBEL(func, uv, strength) normalize(vec3(     func(uv - vec2(1.0/u_resolution.x, 0.0)) - func(uv + vec2(1.0/u_resolution.x, 0.0)),     func(uv - vec2(0.0, 1.0/u_resolution.y)) - func(uv + vec2(0.0, 1.0/u_resolution.y)),     2.0 / strength))

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
`,u={"void main()":"$m",gl_FragColor:"$f",vec2:"$2",vec3:"$3",vec4:"$4",float:"$l",uniform:"$u",varying:"$v",u_time:"$t",vUv:"$U",fbm:"$b",noise:"$n",random:"$r",smoothstep:"$s",mix:"$x",fract:"$c",floor:"$o",distance:"$d",length:"$g"},m=class l{constructor(r={}){if(r.canvas?this.canvas=r.canvas:typeof document<"u"?this.canvas=document.createElement("canvas"):typeof OffscreenCanvas<"u"?this.canvas=new OffscreenCanvas(r.width||512,r.height||512):(console.warn("TexGen: No canvas environment detected. Pass a mock canvas or use headless-gl."),this.canvas={}),r.gl)this.gl=r.gl;else{let t=r.webgl2?"webgl2":"webgl";this.gl=this.canvas.getContext?this.canvas.getContext(t,{preserveDrawingBuffer:!0}):null,!this.gl&&r.webgl2&&this.canvas.getContext&&(this.gl=this.canvas.getContext("webgl",{preserveDrawingBuffer:!0}))}this.isWebGL2=this.gl&&typeof WebGL2RenderingContext<"u"&&this.gl instanceof WebGL2RenderingContext,this.ext=null,this.gl&&!this.isWebGL2&&(this.ext=this.gl.getExtension("OES_standard_derivatives")),this.width=r.width||512,this.height=r.height||512,this.seed=r.seed!==void 0?r.seed:Math.random()*100,this.program=null,this.vs=null,this.fs=null,this.buffer=null}static decompress(r,t=null){try{let e;if(typeof atob=="function")e=atob(r);else if(typeof Buffer<"u")e=Buffer.from(r,"base64").toString("utf8");else return null;let n=t?Object.assign({},u,t):u,i=Object.entries(n).sort((o,a)=>a[1].length-o[1].length);for(let[o,a]of i)e=e.split(a).join(o);return e}catch{return null}}static compress(r,t=null){let e=r.replace(/\/\/.*$/gm,"").replace(/\s+/g," ").trim(),n=t?Object.assign({},u,t):u,i=Object.entries(n).sort((o,a)=>a[0].length-o[0].length);for(let[o,a]of i)e=e.split(o).join(a);return typeof btoa=="function"?btoa(e):typeof Buffer<"u"?Buffer.from(e).toString("base64"):null}static parseMetadata(r){let t={uniforms:{}},e=/uniform\s+float\s+(\w+);\s*\/\/\s*@slider\s*([\d\.-]+)\s*,\s*([\d\.-]+)\s*,\s*([\d\.-]+)/g,n=/uniform\s+vec3\s+(\w+);\s*\/\/\s*@color\s*(#([0-9a-fA-F]{3}){1,2})/g,i;for(;(i=e.exec(r))!==null;)t.uniforms[i[1]]={type:"float",min:parseFloat(i[2]),max:parseFloat(i[3]),default:parseFloat(i[4])};for(;(i=n.exec(r))!==null;)t.uniforms[i[1]]={type:"color",default:i[2]};return t}static getMetadataSchema(){return{$schema:"http://json-schema.org/draft-07/schema#",title:"TexGen Metadata",type:"object",properties:{uniforms:{type:"object",additionalProperties:{oneOf:[{type:"object",properties:{type:{const:"float"},min:{type:"number"},max:{type:"number"},default:{type:"number"}},required:["type","min","max","default"]},{type:"object",properties:{type:{const:"color"},default:{type:"string",pattern:"^#([0-9a-fA-F]{3}){1,2}$"}},required:["type","default"]}]}}}}}_createShader(r,t){let e=this.gl,n=e.createShader(r);if(e.shaderSource(n,t),e.compileShader(n),!e.getShaderParameter(n,e.COMPILE_STATUS)){let i=e.getShaderInfoLog(n);throw console.error("Shader Error:",i),new Error(`Shader Compilation Error:
`+i)}return n}init(r){let t=this.gl;if(!t)throw new Error("WebGL not supported");this.program&&t.deleteProgram(this.program),this.vs&&t.deleteShader(this.vs),this.fs&&t.deleteShader(this.fs);let e=r.replace(/\/\/\s*@slider.*$/gm,"").replace(/\/\/\s*@color.*$/gm,""),n=this.isWebGL2&&e.includes("#version 300 es"),i=e.replace(/#version 300 es/g,"").trim();i=i.includes("void main")?i:"void main() { "+i+" }";let o=n?`#version 300 es
in vec2 p;
out vec2 vUvRaw;
void main() {
    vUvRaw = p * 0.5 + 0.5;
    gl_Position = vec4(p, 0.0, 1.0);
}`:`attribute vec2 p;
varying vec2 vUvRaw;
void main() {
    vUvRaw = p * 0.5 + 0.5;
    gl_Position = vec4(p, 0.0, 1.0);
}`,a=!this.isWebGL2&&this.ext?`#extension GL_OES_standard_derivatives : enable
`:"",s=n?`#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_lightDir;
uniform vec3 u_viewDir;
in vec2 vUvRaw;
out vec4 fragColor;
#define vUv fract(vUvRaw)
#define gl_FragColor fragColor
`+g+`
`+i:a+`#ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
#else
    precision mediump float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_lightDir;
uniform vec3 u_viewDir;
varying vec2 vUvRaw;
#define vUv fract(vUvRaw)
`+g+`
`+i;if(this.vs=this._createShader(t.VERTEX_SHADER,o),this.fs=this._createShader(t.FRAGMENT_SHADER,s),this.program=t.createProgram(),t.attachShader(this.program,this.vs),t.attachShader(this.program,this.fs),t.linkProgram(this.program),!t.getProgramParameter(this.program,t.LINK_STATUS)){let c=t.getProgramInfoLog(this.program);throw console.error("Program Link Error:",c),new Error(`Program Link Error:
`+c)}return this.buffer=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this.buffer),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW),!0}updateShader(r){return this.init(r)}render(r=0,t={}){let e=this.gl;if(!e||!this.program)return;this.canvas.width=this.width,this.canvas.height=this.height,e.viewport(0,0,this.width,this.height),e.useProgram(this.program);let n=e.getAttribLocation(this.program,"p");e.enableVertexAttribArray(n),e.bindBuffer(e.ARRAY_BUFFER,this.buffer),e.vertexAttribPointer(n,2,e.FLOAT,!1,0,0),e.uniform1f(e.getUniformLocation(this.program,"u_time"),r),e.uniform2f(e.getUniformLocation(this.program,"u_resolution"),this.width,this.height),e.uniform3f(e.getUniformLocation(this.program,"u_lightDir"),1,1,1),e.uniform3f(e.getUniformLocation(this.program,"u_viewDir"),0,0,1),e.uniform1f(e.getUniformLocation(this.program,"u_seed"),this.seed),e.uniform1i(e.getUniformLocation(this.program,"u_bakeMode"),t.u_bakeMode||0);let i=0,o=[];for(let[a,s]of Object.entries(t)){if(a==="u_bakeMode")continue;let c=e.getUniformLocation(this.program,a);if(c){if(Array.isArray(s))s.length===2?e.uniform2fv(c,s):s.length===3?e.uniform3fv(c,s):s.length===4&&e.uniform4fv(c,s);else if(typeof s=="number")e.uniform1f(c,s);else if(s&&(s instanceof HTMLCanvasElement||typeof OffscreenCanvas<"u"&&s instanceof OffscreenCanvas||s instanceof l||typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement)){let d=s instanceof l?s.canvas:s;e.activeTexture(e.TEXTURE0+i);let f=e.createTexture();e.bindTexture(e.TEXTURE_2D,f),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,d),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.uniform1i(c,i),o.push(f),i++}}}e.drawArrays(e.TRIANGLE_STRIP,0,4),o.forEach(a=>e.deleteTexture(a))}bake(r,t={}){this.width=t.width||this.width,this.height=t.height||this.height,this.seed=t.seed!==void 0?t.seed:this.seed;let e=t.format||"dataURL";if(this.init(r)){if(this.render(t.time||0,t.uniforms||{}),e==="pixels"){let n=new Uint8Array(this.width*this.height*4);return this.gl.readPixels(0,0,this.width,this.height,this.gl.RGBA,this.gl.UNSIGNED_BYTE,n),n}else if(e==="bitmap"&&typeof createImageBitmap<"u")return createImageBitmap(this.canvas);return typeof OffscreenCanvas<"u"&&this.canvas instanceof OffscreenCanvas&&this.canvas.transferToImageBitmap?this.canvas.transferToImageBitmap():this.canvas.toDataURL?this.canvas.toDataURL():null}return null}static _getWorker(){this._workerPool||(this._workerPool=[],this._workerId=0,this._workerQueue=[]);let r=this._workerPool.find(t=>!t.busy);if(r)return r;if(this._workerPool.length<4){let t=l.toString(),e=["const UTILS = "+JSON.stringify(g)+";","const TOKEN_MAP = "+JSON.stringify(u)+";","const TexGen = ("+t+");","let tgInstance = null;","self.onmessage = async (e) => {","    try {","        const { id, shaderCode, options } = e.data;","        if (!tgInstance) tgInstance = new TexGen(options);","        const result = await tgInstance.bake(shaderCode, options);","        self.postMessage({ id, result });","    } catch (err) {","        self.postMessage({ id: e.data.id, error: String(err.message || err) });","    }","};"].join(`
`),n=new Blob([e],{type:"application/javascript"}),i=new Worker(URL.createObjectURL(n)),o={worker:i,busy:!1,callbacks:new Map};return i.onmessage=a=>{let{id:s,result:c,error:d}=a.data,f=o.callbacks.get(s);if(f){if(d)f.reject(new Error(d));else if(typeof ImageBitmap<"u"&&c instanceof ImageBitmap){let h=document.createElement("canvas");h.width=c.width,h.height=c.height,h.getContext("2d").drawImage(c,0,0),f.resolve(h.toDataURL())}else f.resolve(c);o.callbacks.delete(s)}o.busy=!1,this._processQueue()},this._workerPool.push(o),o}return null}static _processQueue(){if(this._workerQueue.length===0)return;let r=this._getWorker();if(!r)return;let t=this._workerQueue.shift();this._executeTask(r,t)}static _executeTask(r,t){let e=this._workerId++;r.busy=!0,r.callbacks.set(e,t),r.worker.postMessage({id:e,shaderCode:t.shaderCode,options:t.options})}static async bakeAsync(r,t={}){return typeof Worker>"u"||typeof OffscreenCanvas>"u"?new l().bake(r,t):new Promise((e,n)=>{let i={shaderCode:r,options:t,resolve:e,reject:n},o=this._getWorker();o?this._executeTask(o,i):this._workerQueue.push(i)})}};(function(l,r){typeof define=="function"&&define.amd?define([],r):typeof module=="object"&&module.exports?module.exports=r():l.TexGen=r()})(typeof self<"u"?self:void 0,function(){return m});var p=m;export{p as default};
