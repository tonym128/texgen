void main() {
    float n = fbm(vUv * 10.0, 10.0);
    vec3 col = mix(vec3(0.0, 0.2, 0.5), vec3(0.0, 0.8, 1.0), n);
    gl_FragColor = vec4(col, 1.0);
}