const TOKEN_MAP = {
    'void main()': '$m', 'gl_FragColor': '$f', 'vec2': '$2', 'vec3': '$3', 'vec4': '$4', 'float': '$l',
    'uniform': '$u', 'varying': '$v', 'u_time': '$t', 'vUv': '$U', 'fbm': '$b', 'noise': '$n',
    'random': '$r', 'smoothstep': '$s', 'mix': '$x', 'fract': '$c', 'floor': '$o', 'distance': '$d', 'length': '$g',
    'voronoi': '$O' // using $O because voronoi is custom
};

const compressShader = (code) => {
    let compressed = code.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
    for (const [token, replacement] of Object.entries(TOKEN_MAP)) {
        compressed = compressed.split(token).join(replacement);
    }
    return Buffer.from(compressed).toString('base64');
};

const SHADERS = {
    wood: `void main() { float n = fbm(vUv * vec2(2.0, 10.0), 5.0); vec3 color = mix(vec3(0.5, 0.25, 0.1), vec3(0.7, 0.4, 0.2), n); float grain = fract(vUv.y * 10.0 + n * 2.0); color *= 0.8 + 0.2 * step(0.1, grain); gl_FragColor = vec4(color, 1.0); }`,

    metal: `void main() { vec2 st = vUv - 0.5; float d = length(st); float spec = smoothstep(0.2, 0.0, length(st - vec2(-0.15, -0.15))); float n = fbm(vUv * 5.0, 5.0); vec3 color = mix(vec3(0.7, 0.75, 0.8), vec3(0.9, 0.95, 1.0), n) + spec; float mask = smoothstep(0.48, 0.45, d); gl_FragColor = vec4(color, mask); }`,

    skin: `void main() { float n = fbm(vUv * 20.0, 3.0); float n2 = fbm(vUv * 50.0, 2.0); vec3 baseColor = vec3(0.85, 0.65, 0.55); vec3 shadowColor = vec3(0.75, 0.5, 0.4); vec3 color = mix(shadowColor, baseColor, n + n2 * 0.1); gl_FragColor = vec4(color, 1.0); }`,

    carpet: `void main() { vec2 st = vUv * 10.0; float v = voronoi(st); float v2 = voronoi(st + vec2(10.0)); vec3 color1 = vec3(0.8, 0.1, 0.3); vec3 color2 = vec3(0.2, 0.6, 0.8); vec3 color3 = vec3(0.9, 0.8, 0.1); vec3 color = mix(color1, color2, v); color = mix(color, color3, v2 * 0.5); gl_FragColor = vec4(color, 1.0); }`,

    hole: `void main() { vec2 st = vUv - 0.5; float d = length(st); float mask = smoothstep(0.5, 0.45, d); float shadow = smoothstep(0.45, 0.3, d); vec3 color = mix(vec3(0.0), vec3(0.1), shadow); gl_FragColor = vec4(color, mask); }`,

    goal: `void main() { vec2 st = vUv - 0.5; float d = length(st); float ring1 = smoothstep(0.5, 0.4, d) - smoothstep(0.3, 0.2, d); float ring2 = smoothstep(0.2, 0.1, d) - smoothstep(0.1, 0.0, d); vec3 col = vec3(1.0, 0.9, 0.0) * (0.7 + 0.3 * sin(u_time * 5.0)); gl_FragColor = vec4(col, (ring1 + ring2) * 0.5); }`
};


if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SHADERS, compressShader, TOKEN_MAP };
}

if (typeof require !== 'undefined' && require.main === module) {
    console.log('--- COMPRESSED SHADER PAYLOADS ---');
    for (const [key, code] of Object.entries(SHADERS)) {
        console.log(`${key}: '${compressShader(code)}',`);
    }
}

