/**
 * TexGen Compression Script - Flight Sim Edition
 * 
 * Use this script to regenerate the compressed Base64 strings for game.js
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

const terrain = `void main() {
    vec2 st = vUv * 4.0;
    float n = fbm(st, 4.0);
    float h = smoothstep(0.2, 0.8, n);
    vec3 deepWater = vec3(0.0, 0.1, 0.3);
    vec3 shallowWater = vec3(0.1, 0.4, 0.6);
    vec3 sand = vec3(0.8, 0.7, 0.5);
    vec3 grass = vec3(0.2, 0.4, 0.1);
    vec3 rock = vec3(0.4, 0.35, 0.3);
    vec3 snow = vec3(0.9, 0.95, 1.0);
    vec3 col = mix(deepWater, shallowWater, smoothstep(0.0, 0.3, h));
    col = mix(col, sand, smoothstep(0.3, 0.35, h));
    col = mix(col, grass, smoothstep(0.35, 0.5, h));
    col = mix(col, rock, smoothstep(0.6, 0.75, h));
    col = mix(col, snow, smoothstep(0.8, 0.9, h));
    if (u_bakeMode == 2) {
        gl_FragColor = vec4(vec3(max(0.2, h)), 1.0);
    } else {
        gl_FragColor = vec4(col, 1.0);
    }
}`;

const sky = `uniform float u_tod;
uniform float u_sunY;
void main() {
    float t = u_time * 0.05;
    float c1 = fbm(vUv * 2.0 + vec2(t, t * 0.3), 2.0);
    float c2 = fbm(vUv * 5.0 - vec2(t * 1.5, 0.0), 5.0);
    float clouds = smoothstep(0.4, 0.7, c1 * c2 + c1 * 0.5);
    vec3 night = vec3(0.01, 0.02, 0.1);
    vec3 twilight = vec3(0.2, 0.1, 0.3);
    vec3 sunset = vec3(1.0, 0.4, 0.1);
    vec3 day = vec3(0.4, 0.7, 1.0);
    vec3 skyCol = mix(night, twilight, smoothstep(-0.5, -0.1, u_sunY));
    skyCol = mix(skyCol, sunset, smoothstep(-0.1, 0.1, u_sunY));
    skyCol = mix(skyCol, day, smoothstep(0.1, 0.5, u_sunY));
    float sunAngle = u_tod * 6.283 - 1.57;
    vec2 sunPos = vec2(0.5 + cos(sunAngle)*0.4, 0.5 + sin(sunAngle)*0.4);
    vec2 moonPos = vec2(0.5 - cos(sunAngle)*0.4, 0.5 - sin(sunAngle)*0.4);
    float sun = smoothstep(0.04, 0.03, length(vUv - sunPos));
    float sunGlow = smoothstep(0.4, 0.0, length(vUv - sunPos));
    float moon = smoothstep(0.03, 0.025, length(vUv - moonPos));
    float rays = 0.0;
    if (u_sunY > 0.0) {
        vec2 raySt = vUv - sunPos;
        float r = length(raySt);
        float a = atan(raySt.y, raySt.x);
        rays = pow(abs(sin(a * 12.0 + t * 5.0)), 10.0) * smoothstep(0.8, 0.0, r) * u_sunY;
    }
    vec2 starUv = vUv + vec2(u_tod * 0.2, 0.0);
    float stars = step(0.998, random(starUv));
    stars *= (0.7 + 0.3 * sin(u_time * 2.0 + random(vUv) * 62.8));
    stars *= smoothstep(0.1, -0.3, u_sunY);
    vec3 finalCol = mix(skyCol, vec3(1.0), clouds * 0.5 * smoothstep(-0.1, 0.2, u_sunY));
    finalCol += sun * vec3(1.0, 1.0, 0.8) + sunGlow * sunset * 0.5 * max(0.0, u_sunY);
    finalCol += moon * vec3(0.8, 0.9, 1.0) + stars;
    finalCol += rays * vec3(1.0, 0.8, 0.4) * 0.5;
    gl_FragColor = vec4(finalCol, 1.0);
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
