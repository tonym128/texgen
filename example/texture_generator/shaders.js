export const UTILS = `// --- Utility Functions ---
uniform float u_seed;
float random (in vec2 st) {
    return fract(sin(dot(st.xy + u_seed, vec2(12.9898,78.233))) * 43758.5453123);
}

// Seamless Tiling Noise
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

// --- Voronoi & Cellular Noise ---
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

// Shape Helpers
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// --- PBR & Bump Mapping Helpers ---
struct PBRData {
    vec3 albedo;
    float roughness;
    float metallic;
    float ambientOcclusion;
    vec3 normal;
};

// Calculate normal from a scalar height value using screen-space derivatives
vec3 calculateNormal(float height, float strength) {
    vec3 normal = vec3(dFdx(height), dFdy(height), 0.01 / strength);
    return normalize(normal);
}

// Simple PBR Lighting approximation for preview
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

    // Fresnel (Schlick)
    vec3 F0 = mix(vec3(0.04), pbr.albedo, pbr.metallic);
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);

    // Specular (Cook-Torrance DNDF approximation)
    float alpha = pbr.roughness * pbr.roughness;
    float D = alpha / (3.14159 * pow(dotNH * dotNH * (alpha - 1.0) + 1.0, 2.0));
    
    // Geometry (Smith)
    float k = alpha * 0.5;
    float G = (dotNL / (dotNL * (1.0 - k) + k)) * (dotNV / (dotNV * (1.0 - k) + k));

    vec3 specular = (D * F * G) / (4.0 * dotNL * dotNV + 0.001);
    vec3 diffuse = (1.0 - F) * (1.0 - pbr.metallic) * pbr.albedo / 3.14159;

    return (diffuse + specular) * lightCol * dotNL + pbr.albedo * 0.05 * pbr.ambientOcclusion;
}
`;

export const TOKEN_MAP = {
            'void main()': '§m', 'gl_FragColor': '§f', 'vec2': '§2', 'vec3': '§3', 'vec4': '§4', 'float': '§l',
            'uniform': '§u', 'varying': '§v', 'u_time': '§t', 'vUv': '§U', 'fbm': '§b', 'noise': '§n',
            'random': '§r', 'smoothstep': '§s', 'mix': '§x', 'fract': '§c', 'floor': '§o', 'distance': '§d', 'length': '§g'
        };;

export const compressShader = (code) => {
    let compressed = code.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
    for (const [token, replacement] of Object.entries(TOKEN_MAP)) {
        compressed = compressed.split(token).join(replacement);
    }
    return btoa(compressed);
};

export const decompressShader = (base64) => {
    let decompressed = atob(base64);
    for (const [token, replacement] of Object.entries(TOKEN_MAP)) {
        decompressed = decompressed.split(replacement).join(token);
    }
    return decompressed;
};

export const shaders = {
    island: `void main() {
    float scale = 4.0;
    vec2 st = vUv * scale;
    float n = fbm(st + u_time * 0.05, scale);
    vec3 water = vec3(0.0, 0.2, 0.5);
    vec3 grass = vec3(0.2, 0.5, 0.1);
    vec3 mount = vec3(0.5, 0.5, 0.5);
    vec3 color = mix(water, grass, smoothstep(0.4, 0.5, n));
    color = mix(color, mount, smoothstep(0.7, 0.8, n));
    gl_FragColor = vec4(color, 1.0);
}`,
    water: `void main() {
    float scale = 8.0;
    vec2 st = vUv * scale;
    float n1 = fbm(st + u_time * 0.2, scale);
    float n2 = fbm(st - u_time * 0.3, scale);
    float ripple = sin(st.x * 1.5 + n1 * 6.0) * 0.5 + 0.5;
    ripple *= sin(st.y * 1.2 + n2 * 4.0) * 0.5 + 0.5;
    vec3 deep = vec3(0.0, 0.1, 0.3);
    vec3 shallow = vec3(0.1, 0.6, 0.8);
    vec3 color = mix(deep, shallow, ripple * (n1 + n2) * 0.5);
    gl_FragColor = vec4(color, 1.0);
}`,
    grass: `void main() {
    float scale = 16.0;
    vec2 st = vUv * scale;
    float n = fbm(st + u_time * 0.05, scale);
    vec3 darkGreen = vec3(0.1, 0.3, 0.05);
    vec3 lightGreen = vec3(0.4, 0.6, 0.1);
    vec3 color = mix(darkGreen, lightGreen, n);
    float wind = sin(st.x * 3.0 + u_time * 5.0 + n * 10.0);
    color += wind * 0.05;
    gl_FragColor = vec4(color, 1.0);
}`,
    sand: `void main() {
    float scale = 4.0;
    vec2 st = vUv * scale;
    float n = fbm(st * 4.0, scale * 4.0);
    float ripple = sin(vUv.x * 31.415 + vUv.y * 12.56 + n * 5.0) * 0.5 + 0.5;
    vec3 base = vec3(0.8, 0.7, 0.5);
    vec3 shadow = vec3(0.65, 0.55, 0.4);
    vec3 color = mix(shadow, base, ripple * 0.6 + 0.4);
    gl_FragColor = vec4(color, 1.0);
}`,
    stone: `void main() {
    float scale = 4.0;
    vec2 st = vUv * scale;
    float n = fbm(st, scale);
    vec3 color = mix(vec3(0.3), vec3(0.5, 0.5, 0.45), smoothstep(0.4, 0.5, n));
    gl_FragColor = vec4(color, 1.0);
}`,
    clouds: `void main() {
    float scale = 4.0;
    vec2 st = vUv * scale;
    float n = fbm(st + u_time * 0.1, scale);
    vec3 sky = vec3(0.4, 0.6, 0.9);
    vec3 color = mix(sky, vec3(1.0), smoothstep(0.4, 0.8, n));
    gl_FragColor = vec4(color, 1.0);
}`,
    marble: `void main() {
    float scale = 4.0;
    vec2 st = vUv * scale;
    float n = fbm(st + fbm(st * 2.0, scale * 2.0), scale);
    vec3 color = mix(vec3(0.95), vec3(0.2, 0.2, 0.25), pow(n, 3.0));
    gl_FragColor = vec4(color, 1.0);
}`,
    concrete: `void main() {
    float scale = 10.0;
    float n = fbm(vUv * scale, scale);
    vec3 color = vec3(0.6) + n * 0.1;
    gl_FragColor = vec4(color, 1.0);
}`,
    ice: `void main() {
    float scale = 4.0;
    float n = fbm(vUv * scale, scale);
    vec3 color = mix(vec3(0.7, 0.9, 1.0), vec3(1.0), n);
    gl_FragColor = vec4(color, 0.8);
}`,
    muddy_trenches: `void main() {
    float h = fbm(vUv * 5.0, 5.0);
    vec3 color = mix(vec3(0.2, 0.1, 0.05), vec3(0.4, 0.3, 0.2), h);
    float wet = smoothstep(0.6, 0.7, fbm(vUv * 10.0 + u_time * 0.1, 10.0));
    color = mix(color, vec3(0.1, 0.1, 0.15), wet);
    gl_FragColor = vec4(color, 1.0);
}`,
    mossy_cobble: `void main() {
    vec2 st = vUv * 5.0;
    float d = length(fract(st) - 0.5);
    float moss = fbm(vUv * 10.0, 10.0);
    vec3 color = mix(vec3(0.3), vec3(0.5), smoothstep(0.4, 0.45, d));
    color = mix(color, vec3(0.1, 0.3, 0.05), smoothstep(0.4, 0.6, moss));
    gl_FragColor = vec4(color, 1.0);
}`,
    pixel_dirt: `void main() {
    vec2 st = floor(vUv * 32.0) / 32.0;
    float n = fbm(st * 5.0, 5.0);
    vec3 color = mix(vec3(0.3, 0.2, 0.1), vec3(0.5, 0.4, 0.2), n);
    gl_FragColor = vec4(color, 1.0);
}`,
    bricks: `void main() {
    vec2 st = vUv * vec2(4.0, 8.0);
    if(fract(st.y * 0.5) > 0.5) st.x += 0.5;
    vec2 f = fract(st);
    float brick = step(0.05, f.x) * step(0.05, f.y) * step(f.x, 0.95) * step(f.y, 0.95);
    vec3 color = mix(vec3(0.3), vec3(0.6, 0.3, 0.2), brick);
    gl_FragColor = vec4(color, 1.0);
}`,
    wood: `void main() {
    float scale = 4.0;
    vec2 st = vUv * scale;
    float n = fbm(st * vec2(1.0, 4.0), scale * 4.0);
    float rings = fract(length(vUv - 0.5) * 10.0 + n);
    rings = smoothstep(0.4, 0.5, rings) - smoothstep(0.5, 0.6, rings);
    vec3 base = vec3(0.4, 0.2, 0.1);
    vec3 dark = vec3(0.2, 0.1, 0.05);
    vec3 color = mix(base, dark, n + rings * 0.3);
    gl_FragColor = vec4(color, 1.0);
}`,
    planks: `void main() {
    vec2 st = vUv * vec2(2.0, 10.0);
    vec2 ipos = floor(st);
    vec2 fpos = fract(st);
    float n = random(mod(ipos, vec2(2.0, 10.0)));
    vec3 color = mix(vec3(0.4, 0.25, 0.1), vec3(0.5, 0.35, 0.2), n);
    color *= 0.9 + 0.2 * fbm(vUv * vec2(10.0, 40.0), 20.0);
    float gap = step(0.02, fpos.x) * step(0.02, fpos.y);
    color = mix(vec3(0.05), color, gap);
    gl_FragColor = vec4(color, 1.0);
}`,
    panels: `void main() {
    float scale = 3.0;
    vec2 st = vUv * scale;
    vec2 ipos = floor(st);
    vec2 fpos = fract(st);
    vec3 color = vec3(0.5) + random(mod(ipos, scale)) * 0.1;
    float d = sdBox(fpos - 0.5, vec2(0.47));
    color = mix(vec3(0.2), color, smoothstep(0.0, 0.02, d));
    gl_FragColor = vec4(color, 1.0);
}`,
    industrial: `void main() {
    float scale = 8.0;
    vec2 st = vUv * scale;
    if(fract(st.y * 0.5) > 0.5) st.x += 0.5;
    vec2 fpos = fract(st);
    float a = 0.785;
    mat2 rot = mat2(cos(a), -sin(a), sin(a), cos(a));
    vec2 p = rot * (fpos - 0.5);
    float d = sdBox(p, vec2(0.3, 0.1));
    vec3 color = vec3(0.4);
    float mask = smoothstep(0.01, -0.01, d);
    color = mix(color, vec3(0.5), mask);
    gl_FragColor = vec4(color, 1.0);
}`,
    rusty_grate: `void main() {
    vec2 st = fract(vUv * 10.0);
    float hole = sdCircle(st - 0.5, 0.3);
    float rust = fbm(vUv * 10.0, 10.0);
    vec3 color = mix(vec3(0.4), vec3(0.4, 0.2, 0.1), rust);
    float mask = step(0.0, hole);
    gl_FragColor = vec4(color * mask, mask);
}`,
    warning_sign: `void main() {
    vec2 st = vUv * 10.0;
    float stripe = step(0.5, fract(st.x + st.y));
    vec3 color = mix(vec3(0.0), vec3(1.0, 0.8, 0.0), stripe);
    gl_FragColor = vec4(color, 1.0);
}`,
    corrugated_metal: `void main() {
    float ridge = sin(vUv.x * 62.83);
    vec3 color = vec3(0.5) + ridge * 0.1;
    gl_FragColor = vec4(color, 1.0);
}`,
    caution_tape: `void main() {
    float strip = step(0.4, vUv.y) * step(vUv.y, 0.6);
    float stripe = step(0.5, fract(vUv.x * 20.0 + vUv.y * 20.0));
    vec3 color = mix(vec3(0.1), vec3(1.0, 0.8, 0.0), stripe);
    gl_FragColor = vec4(color, strip);
}`,
    industrial_pipes: `void main() {
    float pipe = sin(vUv.y * 31.415);
    vec3 color = vec3(0.4) + pipe * 0.1;
    gl_FragColor = vec4(color, 1.0);
}`,
    chainlink: `void main() {
    float scale = 10.0;
    vec2 st = vUv * scale;
    vec2 f = fract(st);
    float wire = min(abs(f.x - f.y), abs(f.x - (1.0 - f.y)));
    float mask = smoothstep(0.05, 0.0, wire);
    gl_FragColor = vec4(vec3(0.7), mask);
}`,
    hazard: `void main() {
    float scale = 10.0;
    vec2 st = vUv * scale;
    float stripe = fract(st.x + st.y);
    gl_FragColor = vec4(mix(vec3(0.1), vec3(1.0, 0.8, 0.0), step(0.5, stripe)), 1.0);
}`,
    scifi: `void main() {
    float scale = 4.0;
    vec2 st = vUv * scale;
    vec3 color = vec3(0.1 + random(floor(st)) * 0.05);
    gl_FragColor = vec4(color, 1.0);
}`,
    space_hull: `void main() {
    float scale = 5.0;
    vec2 st = vUv * scale;
    vec3 color = vec3(0.2 + random(floor(st)) * 0.1);
    gl_FragColor = vec4(color, 1.0);
}`,
    pbr_gold: `void main() {
    float h = fbm(vUv * 4.0, 4.0);
    PBRData pbr;
    pbr.albedo = vec3(1.0, 0.76, 0.33);
    pbr.roughness = 0.2 + h * 0.3;
    pbr.metallic = 1.0;
    pbr.ambientOcclusion = 1.0 - h * 0.5;
    pbr.normal = calculateNormal(h, 0.5);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.5)), 1.0);
}`,
    pbr_copper: `void main() {
    float h = fbm(vUv * 8.0, 8.0);
    PBRData pbr;
    pbr.albedo = vec3(0.72, 0.45, 0.2);
    pbr.roughness = 0.2 + h * 0.2;
    pbr.metallic = 1.0;
    pbr.ambientOcclusion = 1.0 - h * 0.3;
    pbr.normal = calculateNormal(h * 0.05, 0.8);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.5)), 1.0);
}`,
    pbr_silver: `void main() {
    float n = noise(vUv * vec2(1.0, 100.0), 100.0);
    PBRData pbr;
    pbr.albedo = vec3(0.95);
    pbr.roughness = 0.1 + n * 0.5;
    pbr.metallic = 1.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(n * 0.005, 0.5);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.5)), 1.0);
}`,
    pbr_iron: `void main() {
    float h = fbm(vUv * 10.0, 10.0);
    PBRData pbr;
    pbr.albedo = vec3(0.2);
    pbr.roughness = 0.5 + h * 0.3;
    pbr.metallic = 1.0;
    pbr.ambientOcclusion = 1.0 - h * 0.5;
    pbr.normal = calculateNormal(h, 0.5);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.2)), 1.0);
}`,
    pbr_bronze: `void main() {
    float h = fbm(vUv * 5.0, 5.0);
    PBRData pbr;
    pbr.albedo = mix(vec3(0.5, 0.3, 0.1), vec3(0.2, 0.4, 0.3), h * 0.5);
    pbr.roughness = 0.3 + h * 0.4;
    pbr.metallic = 0.9;
    pbr.ambientOcclusion = 1.0 - h * 0.4;
    pbr.normal = calculateNormal(h * 0.05, 0.6);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.4)), 1.0);
}`,
    pbr_steel: `void main() {
    float n = fbm(vUv * 20.0, 20.0);
    float scratches = pow(random(vUv * 100.0), 10.0);
    PBRData pbr;
    pbr.albedo = vec3(0.7);
    pbr.roughness = 0.2 + n * 0.2 + scratches * 0.5;
    pbr.metallic = 1.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(n * 0.02 + scratches * 0.05, 0.5);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.5)), 1.0);
}`,
    pbr_chrome: `void main() {
    PBRData pbr;
    pbr.albedo = vec3(1.0);
    pbr.roughness = 0.02;
    pbr.metallic = 1.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = vec3(0,0,1);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(2.0)), 1.0);
}`,
    pbr_rust: `void main() {
    float h = fbm(vUv * 4.0, 4.0);
    float rust_n = fbm(vUv * 8.0 + 1.23, 8.0);
    PBRData pbr;
    float isRust = smoothstep(0.4, 0.6, rust_n);
    pbr.albedo = mix(vec3(0.7), vec3(0.4, 0.15, 0.05), isRust);
    pbr.roughness = mix(0.3, 0.9, isRust);
    pbr.metallic = mix(1.0, 0.0, isRust);
    pbr.ambientOcclusion = 1.0 - h * 0.5;
    pbr.normal = calculateNormal(h * 0.1, 0.5);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.5)), 1.0);
}`,
    pbr_rusted_hull: `void main() {
    float h = fbm(vUv * 4.0, 4.0);
    float rust = smoothstep(0.3, 0.7, fbm(vUv * 12.0 + 5.67, 12.0));
    PBRData pbr;
    pbr.albedo = mix(vec3(0.3), vec3(0.4, 0.15, 0.05), rust);
    pbr.roughness = mix(0.4, 0.9, rust);
    pbr.metallic = mix(1.0, 0.0, rust);
    pbr.ambientOcclusion = 1.0 - h * 0.3;
    pbr.normal = calculateNormal(h * 0.1 + rust * 0.05, 0.6);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.2)), 1.0);
}`,
    pbr_obsidian: `void main() {
    float v = voronoi(vUv * 5.0);
    PBRData pbr;
    pbr.albedo = vec3(0.02, 0.02, 0.03);
    pbr.roughness = 0.1 + v * 0.2;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(v * 0.5, 1.0);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.8)), 1.0);
}`,
    pbr_ruby: `void main() {
    float h = fbm(vUv * 10.0, 10.0);
    PBRData pbr;
    pbr.albedo = vec3(0.8, 0.0, 0.1);
    pbr.roughness = 0.1 + h * 0.1;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(h * 0.1, 0.5);
    vec3 col = applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(2.0));
    gl_FragColor = vec4(col, 0.8);
}`,
    pbr_emerald: `void main() {
    float v = voronoi(vUv * 8.0);
    PBRData pbr;
    pbr.albedo = vec3(0.0, 0.6, 0.2);
    pbr.roughness = 0.2 + v * 0.3;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0 - v * 0.2;
    pbr.normal = calculateNormal(v, 0.8);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.5)), 1.0);
}`,
    pbr_sapphire: `void main() {
    float h = fbm(vUv * 12.0, 12.0);
    PBRData pbr;
    pbr.albedo = vec3(0.05, 0.1, 0.6);
    pbr.roughness = 0.05 + h * 0.1;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(h * 0.05, 0.4);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(2.0)), 0.9);
}`,
    pbr_pearl: `void main() {
    float n = fbm(vUv * 5.0, 5.0);
    PBRData pbr;
    vec3 iridescent = 0.8 + 0.2 * cos(6.283 * (n + vec3(0, 0.33, 0.67)));
    pbr.albedo = iridescent;
    pbr.roughness = 0.1 + n * 0.1;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(n * 0.02, 0.3);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.5)), 1.0);
}`,
    pbr_carbon: `void main() {
    vec2 st = vUv * 20.0;
    float d = fract(floor(st.x) + floor(st.y) * 0.5) > 0.5 ? fract(st.x) : fract(st.y);
    PBRData pbr;
    pbr.albedo = vec3(0.05);
    pbr.roughness = mix(0.1, 0.4, d);
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0 - d * 0.2;
    pbr.normal = calculateNormal(d * 0.05, 0.5);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.2)), 1.0);
}`,
    pbr_wood_lacquer: `void main() {
    float n = fbm(vUv * vec2(2.0, 15.0), 15.0);
    PBRData pbr;
    pbr.albedo = mix(vec3(0.4, 0.2, 0.1), vec3(0.2, 0.1, 0.05), n);
    pbr.roughness = 0.05;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(n * 0.01, 0.2);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.5)), 1.0);
}`,
    pbr_concrete_wet: `void main() {
    float n = fbm(vUv * 20.0, 20.0);
    float wet = smoothstep(0.4, 0.6, fbm(vUv * 5.0 + u_time * 0.05, 5.0));
    PBRData pbr;
    pbr.albedo = vec3(0.4 + n * 0.1);
    pbr.roughness = mix(0.7, 0.1, wet);
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0 - n * 0.2;
    pbr.normal = calculateNormal(n * 0.05, 0.5);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.3)), 1.0);
}`,
    pbr_mud: `void main() {
    float h = fbm(vUv * 5.0, 5.0);
    float wet = smoothstep(0.6, 0.8, fbm(vUv * 10.0, 10.0));
    PBRData pbr;
    pbr.albedo = mix(vec3(0.2, 0.1, 0.05), vec3(0.1, 0.08, 0.05), wet);
    pbr.roughness = mix(0.9, 0.2, wet);
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0 - h * 0.5;
    pbr.normal = calculateNormal(h * 0.2 + wet * 0.05, 0.8);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.1)), 1.0);
}`,
    pbr_snow: `void main() {
    float h = fbm(vUv * 10.0, 10.0);
    float sparkle = step(0.99, random(vUv * 500.0));
    PBRData pbr;
    pbr.albedo = vec3(0.95, 0.98, 1.0);
    pbr.roughness = 0.8 - h * 0.3;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0 - h * 0.2;
    pbr.normal = calculateNormal(h * 0.1, 0.4);
    vec3 col = applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.5));
    gl_FragColor = vec4(col + sparkle * 0.5, 1.0);
}`,
    pbr_sand_wet: `void main() {
    float h = fbm(vUv * 15.0, 15.0);
    float ripple = sin(vUv.x * 20.0 + h * 5.0) * 0.5 + 0.5;
    PBRData pbr;
    pbr.albedo = vec3(0.6, 0.5, 0.4);
    pbr.roughness = mix(0.8, 0.2, ripple * 0.5);
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0 - h * 0.2;
    pbr.normal = calculateNormal(h * 0.05 + ripple * 0.1, 0.6);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.4)), 1.0);
}`,
    pbr_lava_crust: `void main() {
    float n = fbm(vUv * 6.0, 6.0);
    float fire = smoothstep(0.7, 0.9, n);
    PBRData pbr;
    pbr.albedo = mix(vec3(0.05), vec3(1.0, 0.2, 0.0), fire);
    pbr.roughness = mix(0.9, 0.2, fire);
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0 - n * 0.5;
    pbr.normal = calculateNormal(n * 0.2, 0.8);
    vec3 col = applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.0));
    gl_FragColor = vec4(col + fire * vec3(2.0, 0.5, 0.0), 1.0);
}`,
    pbr_mossy_stone: `void main() {
    float h = fbm(vUv * 5.0, 5.0);
    float moss = smoothstep(0.4, 0.6, fbm(vUv * 15.0 + 1.23, 15.0));
    PBRData pbr;
    pbr.albedo = mix(vec3(0.4), vec3(0.1, 0.3, 0.05), moss);
    pbr.roughness = mix(0.7, 0.9, moss);
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0 - h * 0.4;
    pbr.normal = calculateNormal(h * 0.2 + moss * 0.1, 0.8);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.3)), 1.0);
}`,
    pbr_velvet: `void main() {
    float n = fbm(vUv * 50.0, 50.0);
    PBRData pbr;
    pbr.albedo = vec3(0.5, 0.0, 0.05);
    pbr.roughness = 0.9 + n * 0.1;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(n * 0.01, 0.2);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.8)), 1.0);
}`,
    pbr_denim: `void main() {
    vec2 st = vUv * 100.0;
    float weave = step(0.5, fract(st.x + st.y));
    PBRData pbr;
    pbr.albedo = mix(vec3(0.1, 0.2, 0.4), vec3(0.15, 0.25, 0.5), weave);
    pbr.roughness = 0.8;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(weave * 0.01, 0.1);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.4)), 1.0);
}`,
    pbr_leather: `void main() {
    float h = fbm(vUv * 10.0, 10.0);
    float cracks = pow(1.0 - voronoi(vUv * 15.0), 5.0);
    PBRData pbr;
    pbr.albedo = vec3(0.3, 0.15, 0.1) * (1.0 - cracks * 0.5);
    pbr.roughness = 0.6 + h * 0.3 + cracks * 0.2;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0 - cracks;
    pbr.normal = calculateNormal(h * 0.05 - cracks * 0.05, 0.5);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.2)), 1.0);
}`,
    pbr_leather_worn: `void main() {
    float h = fbm(vUv * 10.0, 10.0);
    float cracks = pow(1.0 - voronoi(vUv * 15.0), 5.0);
    PBRData pbr;
    pbr.albedo = vec3(0.3, 0.15, 0.1) * (1.0 - cracks * 0.5);
    pbr.roughness = 0.6 + h * 0.3 + cracks * 0.2;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0 - cracks;
    pbr.normal = calculateNormal(h * 0.05 - cracks * 0.05, 0.5);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.2)), 1.0);
}`,
    pbr_plastic: `void main() {
    float scale = 4.0;
    float h = fbm(vUv * scale, scale);
    PBRData pbr;
    pbr.albedo = vec3(0.1, 0.4, 0.8);
    pbr.roughness = 0.1 + h * 0.1;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(h * 0.01, 0.2);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.5)), 1.0);
}`,
    pbr_plastic_matte: `void main() {
    float n = random(vUv * 500.0);
    PBRData pbr;
    pbr.albedo = vec3(0.1, 0.1, 0.12);
    pbr.roughness = 0.7 + n * 0.1;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(n * 0.005, 0.1);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.5)), 1.0);
}`,
    pbr_gold_leaf: `void main() {
    float h = fbm(vUv * 20.0, 20.0);
    PBRData pbr;
    pbr.albedo = vec3(1.0, 0.8, 0.3);
    pbr.roughness = 0.1 + h * 0.4;
    pbr.metallic = 1.0;
    pbr.ambientOcclusion = 1.0 - h * 0.2;
    pbr.normal = calculateNormal(h * 0.15, 1.2);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.6)), 1.0);
}`,
    pbr_diamond_encrusted: `void main() {
    float n = random(vUv * 1000.0);
    float spark = step(0.995, n);
    PBRData pbr;
    pbr.albedo = vec3(0.9);
    pbr.roughness = 0.1;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(n, 2.0);
    vec3 col = applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(2.0));
    gl_FragColor = vec4(col + spark * vec3(2.0), 1.0);
}`,
    pbr_marble_polished: `void main() {
    float n = fbm(vUv * 3.0 + fbm(vUv * 6.0, 6.0), 3.0);
    PBRData pbr;
    pbr.albedo = mix(vec3(0.95), vec3(0.2, 0.2, 0.25), pow(n, 3.0));
    pbr.roughness = 0.05;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(n * 0.01, 0.1);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.6)), 1.0);
}`,
    pbr_ice_cracked: `void main() {
    float v = voronoi(vUv * 5.0);
    float cracks = smoothstep(0.0, 0.02, v);
    PBRData pbr;
    pbr.albedo = mix(vec3(1.0), vec3(0.7, 0.9, 1.0), cracks);
    pbr.roughness = 0.1 + (1.0 - cracks) * 0.5;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = cracks;
    pbr.normal = calculateNormal(cracks * 0.1, 0.5);
    vec3 col = applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.8));
    gl_FragColor = vec4(col, 0.8);
}`,
    pbr_opal: `void main() {
    float n = fbm(vUv * 5.0, 5.0);
    PBRData pbr;
    vec3 iridescent = 0.8 + 0.2 * cos(6.283 * (n + vec3(0, 0.33, 0.67) + u_time * 0.1));
    pbr.albedo = iridescent;
    pbr.roughness = 0.1;
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(n * 0.02, 0.3);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.5)), 1.0);
}`,
    pbr_forged_carbon: `void main() {
    float v = voronoi(vUv * 10.0);
    float chunks = step(0.5, random(floor(vUv * 10.0)));
    PBRData pbr;
    pbr.albedo = vec3(0.05);
    pbr.roughness = mix(0.1, 0.3, chunks);
    pbr.metallic = 0.0;
    pbr.ambientOcclusion = 1.0;
    pbr.normal = calculateNormal(v * 0.05, 0.5);
    gl_FragColor = vec4(applyPBRLighting(pbr, u_lightDir, u_viewDir, vec3(1.2)), 1.0);
}`,
    fire: `void main() {
    float n = fbm(vUv * 4.0 - vec2(0.0, u_time * 2.0), 4.0);
    gl_FragColor = vec4(vec3(1.0, 0.5, 0.0) * n, n);
}`,
    lava: `void main() {
    float n = fbm(vUv * 6.0 - u_time * 0.2, 6.0);
    gl_FragColor = vec4(mix(vec3(0.1), vec3(1.0, 0.2, 0.0), n), 1.0);
}`,
    lava_bubbles: `void main() {
    float n = fbm(vUv * 4.0 - u_time * 0.2, 4.0);
    float bubble = smoothstep(0.8, 0.9, fbm(vUv * 10.0 + u_time, 10.0));
    gl_FragColor = vec4(vec3(1.0, 0.5, 0.0) * (n + bubble), 1.0);
}`,
    magic_portal: `void main() {
    vec2 p = vUv - 0.5;
    float r = length(p);
    float a = atan(p.y, p.x);
    float swirl = fbm(vec2(r * 5.0 - u_time, a * 2.0), 5.0);
    gl_FragColor = vec4(vec3(0.5, 0.0, 1.0) * swirl, smoothstep(0.5, 0.0, r));
}`,
    potion_liquid: `void main() {
    float n = fbm(vUv * 5.0 + u_time * 0.5, 5.0);
    gl_FragColor = vec4(mix(vec3(1.0, 0.0, 0.5), vec3(1.0, 0.5, 0.0), n), 0.9);
}`,
    alien_sludge: `void main() {
    float n = fbm(vUv * 10.0 + u_time * 0.5, 10.0);
    gl_FragColor = vec4(mix(vec3(0.1, 0.0, 0.2), vec3(0.4, 0.8, 0.2), n), 1.0);
}`,
    neon_grid: `void main() {
    vec2 st = fract(vUv * 10.0);
    float grid = step(0.95, st.x) + step(0.95, st.y);
    gl_FragColor = vec4(vec3(0.0, 1.0, 1.0) * grid, 1.0);
}`,
    energy_shield: `void main() {
    float d = length(vUv - 0.5);
    float pulse = sin(u_time * 2.0 - d * 10.0) * 0.5 + 0.5;
    gl_FragColor = vec4(vec3(0.0, 0.5, 1.0) * pulse, pulse);
}`,
    plasma_pipe: `void main() {
    float flow = fbm(vUv * vec2(5.0, 1.0) - vec2(u_time, 0.0), 5.0);
    gl_FragColor = vec4(vec3(0.8, 0.2, 1.0) * flow, 1.0);
}`,
    thermal_view: `void main() {
    float h = fbm(vUv * 5.0 + u_time * 0.2, 5.0);
    gl_FragColor = vec4(0.5 + 0.5 * cos(6.283 * (h + vec3(0.0, 0.33, 0.67))), 1.0);
}`,
    radar_screen: `void main() {
    float d = length(vUv - 0.5);
    float sweep = fract((atan(vUv.y - 0.5, vUv.x - 0.5) / 6.283) - u_time * 0.2);
    gl_FragColor = vec4(vec3(0.0, 1.0, 0.0) * sweep * step(d, 0.5), 1.0);
}`,
    cyber_pulse: `void main() {
    float d = length(vUv - 0.5);
    float pulse = fract(d * 10.0 - u_time);
    gl_FragColor = vec4(vec3(0.0, 0.5, 1.0) * (1.0 - pulse), 1.0);
}`,
    cyber_glow: `void main() {
    float n = fbm(vUv * 5.0 - u_time * 0.2, 5.0);
    gl_FragColor = vec4(vec3(1.0, 0.0, 0.5) * n, 1.0);
}`,
    oil_slick: `void main() {
    float n = fbm(vUv * 5.0 + u_time * 0.1, 5.0);
    gl_FragColor = vec4(0.5 + 0.5 * cos(6.283 * (n + vec3(0.0, 0.33, 0.67))), 1.0);
}`,
    toon_clouds: `void main() {
    float n = fbm(vUv * 3.0 + u_time * 0.1, 3.0);
    gl_FragColor = vec4(vec3(step(0.5, n)), 1.0);
}`,
    rainbow_path: `void main() {
    gl_FragColor = vec4(0.5 + 0.5 * cos(6.283 * (vUv.x + u_time * 0.2 + vec3(0.0, 0.33, 0.67))), 1.0);
}`,
    checkerboard: `void main() {
    vec2 st = floor(vUv * 8.0);
    gl_FragColor = vec4(vec3(mod(st.x + st.y, 2.0)), 1.0);
}`,
    candy_ground: `void main() {
    float swirl = fract(atan(vUv.y-0.5, vUv.x-0.5)*3.0/6.283 + length(vUv-0.5)*5.0);
    gl_FragColor = vec4(mix(vec3(1.0), vec3(1.0, 0.0, 0.5), step(0.5, swirl)), 1.0);
}`,
    dots: `void main() {
    gl_FragColor = vec4(vec3(step(0.3, length(fract(vUv*10.0)-0.5))), 1.0);
}`,
    hexagons: `void main() {
    gl_FragColor = vec4(vec3(voronoi(vUv * 10.0)), 1.0);
}`,
    stars: `void main() {
    gl_FragColor = vec4(vec3(step(0.98, random(vUv))), 1.0);
}`,
    weave: `void main() {
    vec2 st = vUv * 20.0;
    gl_FragColor = vec4(vec3(step(0.5, fract(floor(st.x) + floor(st.y)*0.5))), 1.0);
}`,
    para_bricks: `uniform float u_scale; // @slider 2.0, 20.0, 10.0
uniform float u_mortar; // @slider 0.0, 0.2, 0.05
void main() {
    vec2 st = vUv * u_scale * vec2(1.0, 2.0);
    if(fract(st.y * 0.5) > 0.5) st.x += 0.5;
    vec2 f = fract(st);
    float brick = step(u_mortar, f.x) * step(u_mortar, f.y) * step(f.x, 1.0 - u_mortar) * step(f.y, 1.0 - u_mortar);
    vec3 color = mix(vec3(0.8), vec3(0.7, 0.3, 0.2), brick);
    gl_FragColor = vec4(color, 1.0);
}`,
    para_stripes: `uniform float u_freq; // @slider 1.0, 50.0, 10.0
void main() {
    gl_FragColor = vec4(vec3(step(0.5, fract(vUv.x * u_freq))), 1.0);
}`,
    para_grid: `uniform float u_thick; // @slider 0.01, 0.2, 0.05
void main() {
    vec2 st = fract(vUv * 10.0);
    float grid = step(1.0 - u_thick, st.x) + step(1.0 - u_thick, st.y);
    gl_FragColor = vec4(vec3(grid), 1.0);
}`,
    para_waves: `uniform float u_amp; // @slider 0.1, 2.0, 0.5
void main() {
    gl_FragColor = vec4(vec3(step(0.5, fract(vUv.y * 10.0 + sin(vUv.x * 10.0) * u_amp))), 1.0);
}`,
    para_circles: `uniform float u_rad; // @slider 0.1, 0.5, 0.3
void main() {
    gl_FragColor = vec4(vec3(step(u_rad, length(fract(vUv * 5.0) - 0.5))), 1.0);
}`,
    para_polka: `void main() {
    gl_FragColor = vec4(vec3(step(0.2, length(fract(vUv * 10.0) - 0.5))), 1.0);
}`,
    para_checker: `void main() {
    vec2 st = floor(vUv * 8.0);
    gl_FragColor = vec4(vec3(mod(st.x + st.y, 2.0)), 1.0);
}`,
    alien_skin: `void main() {
    gl_FragColor = vec4(mix(vec3(0.2, 0.0, 0.3), vec3(0.5, 0.2, 0.6), fbm(vUv * 10.0, 10.0)), 1.0);
}`,
    alien_veins: `void main() {
    gl_FragColor = vec4(vec3(0.8, 0.0, 0.2) * step(0.9, fbm(vUv * 20.0, 20.0)), 1.0);
}`,
    alien_flesh: `void main() {
    gl_FragColor = vec4(mix(vec3(0.6, 0.1, 0.2), vec3(0.9, 0.5, 0.6), noise(vUv * 10.0, 10.0)), 1.0);
}`,
    alien_eyes: `void main() {
    gl_FragColor = vec4(vec3(voronoi(vUv * 5.0)), 1.0);
}`,
    alien_tech: `void main() {
    gl_FragColor = vec4(vec3(0.0, 1.0, 0.5) * step(0.95, fract(voronoi(vUv * 8.0) * 10.0)), 1.0);
}`,
    dragon_scales: `void main() {
    gl_FragColor = vec4(vec3(0.2, 0.5, 0.1) * voronoi(vUv * 10.0), 1.0);
}`,
    camo_jungle: `void main() {
    gl_FragColor = vec4(mix(vec3(0.1, 0.3, 0.05), vec3(0.3, 0.2, 0.1), fbm(vUv * 4.0, 4.0)), 1.0);
}`,
    metal: `void main() {
    float scale = 4.0;
    vec2 st = vUv * scale;
    float n = fbm(st * vec2(1.0, 20.0) + vec2(0.0, u_time * 0.1), scale * 20.0);
    vec3 color = vec3(0.7, 0.72, 0.75) + n * 0.1;
    float spec = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 8.0) * 0.4;
    color += spec;
    gl_FragColor = vec4(color, 1.0);
}`
};
