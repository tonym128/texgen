// game.js - Multi-Pass Post-Processing Example

const DEFAULT_PASS1 = `void main() {
    vec2 st = vUv * 5.0;
    vec2 ipos = floor(st);
    vec2 fpos = fract(st);
    
    // Stable noise per tile
    float n = random(ipos + 42.0); 
    float d = length(fpos - 0.5);
    
    // Smooth circles that pulse slightly
    float pulse = 0.5 + 0.5 * sin(u_time * 2.0 + n * 10.0);
    float mask = step(0.7, n) * smoothstep(0.3, 0.25, d);
    mask *= 0.8 + 0.2 * pulse;
    
    // Thicker, slower, smoother moving lines
    float linePos = fract(vUv.x * 4.0 + u_time * 0.2);
    float line = smoothstep(0.0, 0.05, linePos) - smoothstep(0.05, 0.1, linePos);
    
    gl_FragColor = vec4(vec3(mask + line * 0.5), 1.0);
}`;

const DEFAULT_PASS2 = `uniform sampler2D u_tex0;
void main() {
    // 9-tap box blur for better stability
    vec3 col = vec3(0.0);
    vec2 off = 3.5 / u_resolution;
    
    for(int x=-1; x<=1; x++) {
        for(int y=-1; y<=1; y++) {
            col += texture2D(u_tex0, vUv + vec2(float(x)*off.x, float(y)*off.y)).rgb;
        }
    }
    col /= 9.0;
    
    // Colorize with a cyan-to-blue gradient
    vec3 blueGlow = mix(vec3(0.0, 0.4, 1.0), vec3(0.0, 1.0, 0.8), col.r);
    gl_FragColor = vec4(col * blueGlow * 3.0, 1.0);
}`;

const DEFAULT_FINAL = `uniform sampler2D u_base;
uniform sampler2D u_bloom;
void main() {
    vec3 base = texture2D(u_base, vUv).rgb;
    vec3 bloom = texture2D(u_bloom, vUv).rgb;
    
    // Screen blend for highlights
    vec3 color = base + bloom;
    color += vec3(0.01, 0.02, 0.05); // Room tint
    
    gl_FragColor = vec4(color, 1.0);
}`;

class MultiPassDemo {
    constructor() {
        this.tg1 = new TexGen({ canvas: document.getElementById('canvas-pass1'), width: 512, height: 512 });
        this.tg2 = new TexGen({ canvas: document.getElementById('canvas-pass2'), width: 512, height: 512 });
        this.tgFinal = new TexGen({ canvas: document.getElementById('canvas-final'), width: 1024, height: 1024 });

        this.editors = {
            pass1: document.getElementById('edit-pass1'),
            pass2: document.getElementById('edit-pass2'),
            final: document.getElementById('edit-final')
        };

        this.errors = {
            pass1: document.getElementById('err-pass1'),
            pass2: document.getElementById('err-pass2'),
            final: document.getElementById('err-final')
        };

        this.init();
    }

    init() {
        this.editors.pass1.value = DEFAULT_PASS1.trim();
        this.editors.pass2.value = DEFAULT_PASS2.trim();
        this.editors.final.value = DEFAULT_FINAL.trim();

        const setupEditor = (key, tg) => {
            this.editors[key].oninput = () => {
                this.errors[key].style.display = 'none';
                try {
                    tg.updateShader(this.editors[key].value);
                } catch (e) {
                    this.errors[key].innerText = e.message;
                    this.errors[key].style.display = 'block';
                }
            };
        };

        this.tg1.init(this.editors.pass1.value);
        this.tg2.init(this.editors.pass2.value);
        this.tgFinal.init(this.editors.final.value);

        setupEditor('pass1', this.tg1);
        setupEditor('pass2', this.tg2);
        setupEditor('final', this.tgFinal);

        requestAnimationFrame((t) => this.loop(t));
    }

    loop(t) {
        const time = t / 1000;

        // 1. Render base pattern
        this.tg1.render(time);

        // 2. Render blur pass using tg1 as input
        this.tg2.render(time, {
            u_tex0: this.tg1
        });

        // 3. Composite final output using both
        this.tgFinal.render(time, {
            u_base: this.tg1,
            u_bloom: this.tg2
        });

        requestAnimationFrame((t) => this.loop(t));
    }
}

window.onload = () => new MultiPassDemo();
