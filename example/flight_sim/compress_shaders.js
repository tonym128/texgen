/**
 * TexGen Compression Script
 * 
 * Use this script to regenerate the compressed Base64 strings for game.js
 * if you modify the original shader source code below.
 * 
 * Usage: node compress_shaders.js
 */

const TOKEN_MAP = {
    'void main()': '$m', 'gl_FragColor': '$f', 'vec2': '$2', 'vec3': '$3', 'vec4': '$4', 'float': '$l',
    'uniform': '$u', 'varying': '$v', 'u_time': '$t', 'vUv': '$U', 'fbm': '$b', 'noise': '$n',
    'random': '$r', 'smoothstep': '$s', 'mix': '$x', 'fract': '$c', 'floor': '$o', 'distance': '$d', 'length': '$g'
};

const compressShader = (code) => {
    let compressed = code.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim();
    for (const [token, replacement] of Object.entries(TOKEN_MAP)) {
        compressed = compressed.split(token).join(replacement);
    }
    return Buffer.from(compressed).toString('base64');
};

// --- Original Shader Sources ---

const terrain = `void main() {
    vec2 st = vUv * 4.0;
    float n = fbm(st, 4.0);
    float h = smoothstep(0.2, 0.8, n);
    vec3 deepWater = vec3(0.0, 0.2, 0.5);
    vec3 shallowWater = vec3(0.1, 0.6, 0.8);
    vec3 sand = vec3(0.8, 0.7, 0.5);
    vec3 grass = vec3(0.2, 0.5, 0.1);
    vec3 rock = vec3(0.4, 0.4, 0.45);
    vec3 snow = vec3(0.9, 0.95, 1.0);
    vec3 col = mix(deepWater, shallowWater, smoothstep(0.0, 0.3, h));
    col = mix(col, sand, smoothstep(0.3, 0.35, h));
    col = mix(col, grass, smoothstep(0.35, 0.5, h));
    col = mix(col, rock, smoothstep(0.6, 0.75, h));
    col = mix(col, snow, smoothstep(0.8, 0.9, h));
    if (u_bakeMode == 2) {
        float displacement = max(0.3, h);
        gl_FragColor = vec4(vec3(displacement), 1.0);
    } else {
        gl_FragColor = vec4(col, 1.0);
    }
}`;

const sky = `uniform float u_tod;
void main() {
    float t = u_time * 0.1;
    float clouds = fbm(vUv * 3.0 + vec2(t, 0.0), 3.0);
    clouds *= fbm(vUv * 8.0 - vec2(t * 0.5, 0.0), 8.0);
    float sunY = cos(u_tod * 6.283);
    float dayCycle = smoothstep(-0.2, 0.4, sunY);
    vec3 nightSky = vec3(0.01, 0.02, 0.08);
    vec3 sunsetSky = mix(vec3(0.9, 0.3, 0.1), vec3(0.1, 0.1, 0.4), vUv.y);
    vec3 daySky = mix(vec3(0.3, 0.6, 1.0), vec3(0.1, 0.4, 0.8), vUv.y);
    vec3 sky = mix(nightSky, sunsetSky, smoothstep(-0.3, 0.1, sunY));
    sky = mix(sky, daySky, dayCycle);
    float sunAngle = u_tod * 6.283 - 1.57;
    vec2 sunPos = vec2(0.5 + cos(sunAngle)*0.4, 0.5 + sin(sunAngle)*0.4);
    float dToSun = length(vUv - sunPos);
    float sun = smoothstep(0.04, 0.03, dToSun);
    float rays = 0.0;
    if (u_SunY > 0.0) {
        float a = atan(vUv.y - sunPos.y, vUv.x - sunPos.x);
        rays = pow(abs(sin(a * 8.0 + t * 2.0)), 8.0) * smoothstep(0.6, 0.0, dToSun) * u_SunY;
    }
    float stars = step(0.997, random(vUv + floor(t))) * (1.0 - dayCycle);
    vec3 col = mix(sky, vec3(1.0), clouds * 0.4 * dayCycle);
    col += vec3(1.0, 0.9, 0.6) * sun;
    col += vec3(1.0, 0.7, 0.3) * rays * 0.6;
    col += vec3(1.0) * stars;
    gl_FragColor = vec4(col, 1.0);
}`;

const wood = `void main() {
    float n = fbm(vUv * vec2(1.0, 10.0), 10.0);
    vec3 color = mix(vec3(0.4, 0.2, 0.1), vec3(0.6, 0.4, 0.2), n);
    float grain = fract(vUv.y * 10.0);
    color *= 0.9 + 0.2 * step(0.1, grain);
    gl_FragColor = vec4(color, 1.0);
}`;

const steel = `void main() {
    float n = fbm(vUv * 20.0, 20.0);
    vec3 color = vec3(0.6, 0.62, 0.65) + n * 0.1;
    gl_FragColor = vec4(color, 1.0);
}`;

const metal = `void main() {
    float n = fbm(vUv * 5.0, 5.0);
    vec3 color = vec3(0.8, 0.8, 0.85) + n * 0.2;
    gl_FragColor = vec4(color, 1.0);
}`;

console.log('--- COMPRESSED SHADER PAYLOADS ---');
console.log('TERRAIN:', compressShader(terrain));
console.log('SKY:', compressShader(sky));
console.log('WOOD:', compressShader(wood));
console.log('STEEL:', compressShader(steel));
console.log('METAL:', compressShader(metal));
