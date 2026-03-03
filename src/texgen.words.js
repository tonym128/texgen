/**
 * TexGen Words Addon
 * A natural language interface for TexGen
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) { define(['TexGen'], factory); }
    else if (typeof module === 'object' && module.exports) { module.exports = factory(require('../texgen.js')); }
    else { root.TexGenWords = factory(root.TexGen); }
}(typeof self !== 'undefined' ? self : this, function (TexGen) {

    const WORDS = {
        // COLORS (32)
        "red": "c = vec3(1.0, 0.1, 0.1);",
        "green": "c = vec3(0.1, 0.8, 0.1);",
        "blue": "c = vec3(0.1, 0.1, 1.0);",
        "yellow": "c = vec3(1.0, 1.0, 0.1);",
        "cyan": "c = vec3(0.1, 1.0, 1.0);",
        "magenta": "c = vec3(1.0, 0.1, 1.0);",
        "white": "c = vec3(1.0);",
        "black": "c = vec3(0.0);",
        "gray": "c = vec3(0.5);",
        "orange": "c = vec3(1.0, 0.5, 0.0);",
        "purple": "c = vec3(0.5, 0.0, 0.5);",
        "pink": "c = vec3(1.0, 0.7, 0.7);",
        "brown": "c = vec3(0.4, 0.2, 0.1);",
        "teal": "c = vec3(0.0, 0.5, 0.5);",
        "olive": "c = vec3(0.5, 0.5, 0.0);",
        "maroon": "c = vec3(0.5, 0.0, 0.0);",
        "navy": "c = vec3(0.0, 0.0, 0.5);",
        "azure": "c = vec3(0.0, 0.5, 1.0);",
        "beige": "c = vec3(0.96, 0.96, 0.86);",
        "coral": "c = vec3(1.0, 0.5, 0.3);",
        "crimson": "c = vec3(0.86, 0.08, 0.24);",
        "gold": "c = vec3(1.0, 0.84, 0.0);",
        "indigo": "c = vec3(0.29, 0.0, 0.51);",
        "ivory": "c = vec3(1.0, 1.0, 0.94);",
        "khaki": "c = vec3(0.94, 0.9, 0.55);",
        "lavender": "c = vec3(0.9, 0.9, 0.98);",
        "lime": "c = vec3(0.75, 1.0, 0.0);",
        "mint": "c = vec3(0.98, 1.0, 0.94);",
        "orchid": "c = vec3(0.85, 0.44, 0.84);",
        "salmon": "c = vec3(0.98, 0.5, 0.45);",
        "silver": "c = vec3(0.75, 0.75, 0.75);",
        "violet": "c = vec3(0.93, 0.51, 0.93);",

        // SHAPES (32)
        "circle": "f = 1.0 - smoothstep(0.4, 0.41, length(p - 0.5)); c = mix(c, c*f, 0.5);",
        "box": "vec2 d = abs(p - 0.5) - 0.3; f = 1.0 - smoothstep(0.0, 0.01, max(d.x, d.y)); c = mix(c, c*f, 0.5);",
        "ring": "f = abs(length(p - 0.5) - 0.3); f = 1.0 - smoothstep(0.02, 0.03, f); c = mix(c, c*f, 0.5);",
        "star": "float a = atan(p.y-0.5, p.x-0.5); float r = length(p-0.5)*2.0; f = 1.0 - smoothstep(0.5+0.2*cos(a*5.0), 0.51+0.2*cos(a*5.0), r); c = mix(c, c*f, 0.5);",
        "cross": "vec2 d2 = abs(p-0.5); f = 1.0 - smoothstep(0.1, 0.11, min(d2.x, d2.y)) * smoothstep(0.4, 0.41, max(d2.x, d2.y)); c = mix(c, c*f, 0.5);",
        "heart": "vec2 q = (p-0.5)*2.0; q.y -= 0.25; float a2 = atan(q.x, q.y)/3.14159; float r2 = length(q); f = 1.0 - smoothstep(0.0, 0.01, r2 - (sqrt(abs(q.x))*0.5 + 0.5) * (0.8 - q.y*0.2)); c = mix(c, c*f, 0.5);",
        "line": "f = 1.0 - smoothstep(0.01, 0.02, abs(p.x - p.y)); c = mix(c, c*f, 0.5);",
        "dot": "f = 1.0 - smoothstep(0.05, 0.06, length(p - 0.5)); c = mix(c, c*f, 0.5);",
        "point": "f = 1.0 - smoothstep(0.01, 0.02, length(p - 0.5)); c = mix(c, c*f, 0.5);",
        "grid": "f = (sin(p.x*20.0)*0.5+0.5) * (sin(p.y*20.0)*0.5+0.5); c = mix(c, c*f, 0.5);",
        "stripes": "f = sin(p.x*20.0)*0.5+0.5; c = mix(c, c*f, 0.5);",
        "wave": "f = sin(p.x*20.0 + p.y*10.0)*0.5+0.5; c = mix(c, c*f, 0.5);",
        "spiral": "float a3 = atan(p.y-0.5, p.x-0.5); float r3 = length(p-0.5); f = sin(a3*5.0 + r3*20.0)*0.5+0.5; c = mix(c, c*f, 0.5);",
        "hex": "vec2 q2 = abs(p-0.5); f = 1.0 - smoothstep(0.4, 0.41, max(q2.x*0.866 + q2.y*0.5, q2.y)); c = mix(c, c*f, 0.5);",
        "triangle": "vec2 q3 = p-0.5; f = 1.0 - smoothstep(0.0, 0.01, max(abs(q3.x)*0.866 + q3.y*0.5, -q3.y) - 0.3); c = mix(c, c*f, 0.5);",
        "diamond": "vec2 q4 = abs(p-0.5); f = 1.0 - smoothstep(0.3, 0.31, q4.x + q4.y); c = mix(c, c*f, 0.5);",
        "pentagon": "float a4 = atan(p.x-0.5, p.y-0.5); float r4 = length(p-0.5); f = 1.0 - smoothstep(0.3, 0.31, r4 * cos(a4 - floor(a4*0.636+0.5)*1.57)); c = mix(c, c*f, 0.5);",
        "hexagon": "vec2 q5 = abs(p-0.5); f = 1.0 - smoothstep(0.3, 0.31, max(q5.x*0.866 + q5.y*0.5, q5.y)); c = mix(c, c*f, 0.5);",
        "octagon": "vec2 q6 = abs(p-0.5); float d3 = max(max(q6.x, q6.y), (q6.x+q6.y)*0.707); f = 1.0 - smoothstep(0.3, 0.31, d3); c = mix(c, c*f, 0.5);",
        "star5": "float a88 = atan(p.y-0.5, p.x-0.5); float r88 = length(p-0.5)*2.5; f = 1.0 - smoothstep(0.5+0.2*cos(a88*5.0), 0.51+0.2*cos(a88*5.0), r88); c = mix(c, c*f, 0.5);",
        "moon": "f = smoothstep(0.3, 0.31, length(p-0.4)) - smoothstep(0.3, 0.31, length(p-0.5)); c = mix(c, c*f, 0.5);",
        "leaf": "vec2 q7 = (p-0.5)*2.0; float a5 = atan(q7.x, q7.y); float r5 = length(q7); f = 1.0 - smoothstep(0.0, 0.01, r5 - (0.5 + 0.5*sin(a5)) * (0.5 + 0.5*cos(a5*3.0))); c = mix(c, c*f, 0.5);",
        "flower": "float a6 = atan(p.y-0.5, p.x-0.5); float r6 = length(p-0.5)*2.0; f = 1.0 - smoothstep(0.6+0.2*sin(a6*6.0), 0.61+0.2*sin(a6*6.0), r6); c = mix(c, c*f, 0.5);",
        "gear": "float a7 = atan(p.y-0.5, p.x-0.5); float r7 = length(p-0.5)*2.0; f = 1.0 - smoothstep(0.6+0.1*sign(sin(a7*12.0)), 0.61+0.1*sign(sin(a7*12.0)), r7); c = mix(c, c*f, 0.5);",
        "bolt": "vec2 q8 = p-0.5; f = 1.0 - smoothstep(0.0, 0.01, abs(q8.x+q8.y) + abs(q8.x-q8.y) - 0.4); c = mix(c, c*f, 0.5);",
        "arrow": "vec2 q9 = p-0.5; f = 1.0 - smoothstep(0.0, 0.01, max(abs(q9.x)-0.1, abs(q9.y)-0.4)) + 1.0 - smoothstep(0.0, 0.01, max(abs(q9.x+q9.y-0.4), abs(q9.x-q9.y+0.4))); c = mix(c, c*f, 0.5);",
        "shield": "vec2 q10 = p-0.5; f = 1.0 - smoothstep(0.3, 0.31, length(vec2(q10.x, q10.y + q10.x*q10.x))); c = mix(c, c*f, 0.5);",
        "sword": "vec2 q11 = p-0.5; f = 1.0 - smoothstep(0.02, 0.03, abs(q11.x) + abs(q11.y-0.2)*0.1); c = mix(c, c*f, 0.5);",
        "cloud": "f = fbm(p*3.0, 10.0); f = smoothstep(0.4, 0.6, f); c = mix(c, c*f, 0.5);",
        "mountain": "f = p.y < (fbm(vec2(p.x, 0.0)*3.0, 10.0)*0.5 + 0.2) ? 1.0 : 0.0; c = mix(c, c*f, 0.5);",
        "tree": "vec2 q12 = p-0.5; f = (abs(q12.x) < 0.05 && q12.y < 0.0) ? 1.0 : 0.0; f += (length(q12-vec2(0.0, 0.2)) < 0.2) ? 1.0 : 0.0; c = mix(c, c*f, 0.5);",
        "sun": "f = 1.0 - smoothstep(0.2, 0.22, length(p - vec2(0.8, 0.8))); c = mix(c, vec3(1.0, 0.9, 0.5)*f, 0.5*f);",
        "blob": "f = fbm(p*3.0 + u_time*0.5, 10.0); f = smoothstep(0.3, 0.7, f); c = mix(c, c*f, 0.5);",

        // GENERATORS (32)
        "noise": "f = noise(p*10.0, 10.0); c = mix(c, vec3(f), 0.5);",
        "fbm": "f = fbm(p*5.0, 10.0); c = mix(c, vec3(f), 0.5);",
        "voronoi": "f = voronoi(p*10.0); c = mix(c, vec3(f), 0.5);",
        "cells": "f = 1.0 - voronoi(p*10.0); c = mix(c, vec3(f*f), 0.5);",
        "clouds": "f = fbm(p*2.0, 10.0); c = mix(c, vec3(f), 0.5);",
        "fire": "f = fbm(p*vec2(2.0, 1.0) - vec2(0.0, u_time*0.5), 10.0); c = mix(c, vec3(f*f*2.0, f*0.5, 0.0), f);",
        "water": "f = fbm(p*5.0 + u_time*0.2, 10.0); c = mix(c, vec3(0.0, 0.3, 0.6+f*0.4), 0.5);",
        "marble": "f = sin(p.x*10.0 + fbm(p*5.0, 10.0)*10.0)*0.5+0.5; c = mix(c, vec3(f), 0.5);",
        "wood": "f = sin(length(p-0.5)*20.0 + fbm(p*5.0, 10.0)*5.0)*0.5+0.5; c = mix(c, vec3(0.4, 0.2, 0.1)*f, 0.5);",
        "stone": "f = fbm(p*10.0, 10.0)*0.5 + noise(p*50.0, 10.0)*0.1; c = mix(c, vec3(f), 0.5);",
        "brick": "vec2 b = floor(p*vec2(8, 16)); f = mod(b.x + mod(b.y, 2.0)*0.5, 1.0) < 0.9 ? 1.0 : 0.0; c = mix(c, vec3(0.5, 0.2, 0.1)*f, 0.5);",
        "checker": "f = mod(floor(p.x*8.0) + floor(p.y*8.0), 2.0); c = mix(c, vec3(f), 0.5);",
        "plasma": "f = sin(p.x*10.0 + u_time) + sin(p.y*10.0 + u_time) + sin((p.x+p.y)*10.0 + u_time); f = f*0.3+0.5; c = mix(c, vec3(f, 1.0-f, sin(f*3.14)), 0.5);",
        "lava": "f = fbm(p*3.0, 10.0); c = mix(c, vec3(f*f*4.0, f*f, 0.0), f);",
        "smoke": "f = fbm(p*4.0 + u_time*0.1, 10.0); c = mix(c, vec3(f), f*0.5);",
        "mist": "f = fbm(p*2.0 + u_time*0.05, 10.0); c = mix(c, vec3(0.8, 0.8, 0.9), f*0.3);",
        "aura": "f = pow(1.0 - length(p-0.5), 3.0) * fbm(p*5.0+u_time, 10.0); c += vec3(0.2, 0.5, 1.0)*f;",
        "energy": "f = abs(fbm(p*10.0 + u_time, 10.0) - 0.5) * 2.0; f = 1.0 - smoothstep(0.0, 0.1, f); c += vec3(0.5, 1.0, 1.0)*f;",
        "crystal": "f = voronoi(p*10.0); f = 1.0 - smoothstep(0.0, 0.1, abs(f-0.5)); c = mix(c, vec3(0.7, 0.9, 1.0), f);",
        "sand": "f = noise(p*100.0, 100.0); c = mix(c, vec3(0.9, 0.8, 0.6), f*0.2);",
        "grass": "f = fbm(p*vec2(10.0, 2.0), 10.0); c = mix(c, vec3(0.2, 0.5, 0.1), f);",
        "fur": "f = noise(p*vec2(100.0, 5.0), 10.0); c = mix(c, vec3(0.3, 0.2, 0.1), f);",
        "cloth": "f = sin(p.x*100.0)*sin(p.y*100.0)*0.5+0.5; c = mix(c, c*(0.8+0.2*f), 0.5);",
        "glass": "c = mix(c, vec3(0.8, 0.9, 1.0), 0.2); c += vec3(1.0)*pow(max(0.0, 1.0-length(p-0.5)), 5.0);",
        "ice": "f = fbm(p*5.0, 10.0); c = mix(c, vec3(0.9, 0.95, 1.0), 0.5+f*0.5);",
        "liquid": "f = fbm(p*3.0 + u_time, 10.0); c = mix(c, vec3(0.2, 0.4, 0.8), f);",
        "gas": "f = fbm(p*2.0 + u_time*0.2, 10.0); c = mix(c, vec3(0.7, 1.0, 0.7), f*0.4);",
        "digital": "vec2 b2 = floor(p*20.0); f = random(b2); c = mix(c, vec3(0.0, f, 0.0), 0.5*f);",
        "glitch": "float g = random(vec2(floor(p.y*20.0 + u_time), 0.0)); p.x += (g-0.5)*0.1*step(0.9, random(vec2(u_time, 1.0)));",
        "retro": "c = floor(c*4.0)/4.0;",
        "modern": "c = mix(c, vec3(length(c)), 0.8); c *= vec3(1.1, 1.0, 1.2);",
        "abstract": "f = sin(p.x*10.0 + sin(p.y*10.0)); c = mix(c, vec3(f, 1.0-f, 0.5), 0.5);",

        // OPERATIONS (32)
        "add": "c += vec3(0.1);",
        "subtract": "c -= vec3(0.1);",
        "multiply": "c *= 1.1;",
        "divide": "c /= 1.1;",
        "mix": "c = mix(c, vec3(0.5), 0.5);",
        "blend": "c = (c + vec3(0.5)) * 0.5;",
        "overlay": "c = c < vec3(0.5) ? 2.0*c*vec3(0.5) : 1.0-2.0*(1.0-c)*(1.0-vec3(0.5));",
        "screen": "c = 1.0 - (1.0-c)*(1.0-vec3(0.5));",
        "dodge": "c = c / (1.0 - vec3(0.5) + 0.001);",
        "burn": "c = 1.0 - (1.0-c)/vec3(0.5);",
        "hardlight": "c = vec3(0.5) < vec3(0.5) ? 2.0*c*vec3(0.5) : 1.0-2.0*(1.0-c)*(1.0-vec3(0.5));",
        "softlight": "c = (1.0-2.0*vec3(0.5))*c*c + 2.0*vec3(0.5)*c;",
        "difference": "c = abs(c - vec3(0.5));",
        "exclusion": "c = c + vec3(0.5) - 2.0*c*vec3(0.5);",
        "darken": "c = min(c, vec3(0.5));",
        "lighten": "c = max(c, vec3(0.5));",
        "average": "c = (c + vec3(0.5)) / 2.0;",
        "negate": "c = 1.0 - c;",
        "invert": "c = 1.0 - c;",
        "absolute": "c = abs(c);",
        "power": "c = pow(c, vec3(2.0));",
        "root": "c = sqrt(c);",
        "sine": "c = sin(c*3.14)*0.5+0.5;",
        "cosine": "c = cos(c*3.14)*0.5+0.5;",
        "tangent": "c = tan(c*0.5);",
        "floor": "c = floor(c*10.0)/10.0;",
        "ceil": "c = ceil(c*10.0)/10.0;",
        "round": "c = floor(c*10.0+0.5)/10.0;",
        "smooth": "c = smoothstep(0.0, 1.0, c);",
        "sharpen": "c = c*2.0 - 0.5;",
        "blur": "c = mix(c, vec3(0.5), 0.2);",
        "warp": "p += (vec2(noise(p*10.0, 10.0), noise(p*10.0+1.0, 10.0))-0.5)*0.1;",

        // MODIFIERS (32)
        "small": "p *= 2.0;",
        "large": "p *= 0.5;",
        "tiny": "p *= 4.0;",
        "huge": "p *= 0.25;",
        "wide": "p.x *= 0.5;",
        "tall": "p.y *= 0.5;",
        "thin": "p.x *= 2.0;",
        "thick": "p.y *= 2.0;",
        "bright": "c *= 1.5;",
        "dark": "c *= 0.5;",
        "soft": "c = mix(c, vec3(0.5), 0.2);",
        "hard": "c = step(0.5, c);",
        "sharp": "c = smoothstep(0.45, 0.55, c);",
        "fuzzy": "c = mix(c, vec3(noise(p*10.0, 10.0)), 0.2);",
        "rough": "c += vec3((random(p)-0.5)*0.1);",
        "smooth_mod": "c = smoothstep(0.0, 1.0, c);", // Renamed to avoid conflict
        "metallic": "c = mix(c, vec3(0.8, 0.8, 0.85), 0.5); c += vec3(pow(max(0.0, 1.0-length(p-0.5)), 10.0));",
        "shiny": "c += vec3(pow(max(0.0, 1.0-length(p-0.5)), 5.0)*0.5);",
        "matte": "c *= 0.8;",
        "glowing": "c += vec3(1.0, 0.5, 0.2) * (1.0-length(p-0.5)) * 0.5;",
        "transparent": "/* alpha placeholder */",
        "opaque": "/* alpha placeholder */",
        "vivid": "c = mix(vec3(length(c)), c, 2.0);",
        "pale": "c = mix(vec3(length(c)), c, 0.5);",
        "neon": "c = mix(c, vec3(0.1, 1.0, 0.1), 0.5); c *= 2.0;",
        "pastel": "c = mix(c, vec3(1.0), 0.5);",
        "earthy": "c *= vec3(0.6, 0.5, 0.4);",
        "cold": "c *= vec3(0.8, 0.9, 1.2);",
        "warm": "c *= vec3(1.2, 1.0, 0.8);",
        "hot": "c *= vec3(1.5, 0.8, 0.5);",
        "icy": "c = mix(c, vec3(0.9, 0.95, 1.0), 0.5);",
        "dusty": "c *= 0.9; c += vec3((random(p)-0.5)*0.05);",

        // SPATIAL (32)
        "move": "p += 0.1;",
        "shift": "p += 0.2;",
        "slide": "p.x += u_time * 0.1;",
        "rotate": "float r8 = 0.5; float s8 = sin(r8); float c8 = cos(r8); p = (p-0.5) * mat2(c8, -s8, s8, c8) + 0.5;",
        "spin": "float r9 = u_time; float s9 = sin(r9); float c9 = cos(r9); p = (p-0.5) * mat2(c9, -s9, s9, c9) + 0.5;",
        "turn": "float r10 = 1.57; float s10 = sin(r10); float c10 = cos(r10); p = (p-0.5) * mat2(c10, -s10, s10, c10) + 0.5;",
        "scale": "p = (p-0.5)*1.1 + 0.5;",
        "grow": "p = (p-0.5)*(1.0-u_time*0.1) + 0.5;",
        "shrink": "p = (p-0.5)*(1.0+u_time*0.1) + 0.5;",
        "stretch": "p.x *= 0.9;",
        "squeeze": "p.x *= 1.1;",
        "mirror": "p = abs(p-0.5)+0.5;",
        "flip": "p = 1.0 - p;",
        "repeat": "p = fract(p*2.0);",
        "tile": "p = fract(p*4.0);",
        "zoom": "p = (p-0.5)*0.5 + 0.5;",
        "perspective": "p.x /= (p.y + 0.5);",
        "distort": "p += sin(p.yx*10.0)*0.05;",
        "twist": "float a11 = length(p-0.5)*5.0; float s11 = sin(a11); float c11 = cos(a11); p = (p-0.5) * mat2(c11, -s11, s11, c11) + 0.5;",
        "bend": "p.x += p.y*p.y*0.5;",
        "warp_spatial": "p += vec2(sin(p.y*10.0), cos(p.x*10.0))*0.05;",
        "ripple": "p += sin(length(p-0.5)*20.0 - u_time*5.0)*0.02;",
        "wave_spatial": "p.y += sin(p.x*10.0 + u_time)*0.1;",
        "flow": "p.x += u_time*0.2; p.y += sin(p.x*5.0)*0.05;",
        "swirl": "float a12 = 1.0/length(p-0.5); float s12 = sin(a12); float c12 = cos(a12); p = (p-0.5) * mat2(c12, -s12, s12, c12) + 0.5;",
        "vortex": "float a13 = u_time/length(p-0.5); float s13 = sin(a13); float c13 = cos(a13); p = (p-0.5) * mat2(c13, -s13, s13, c13) + 0.5;",
        "pinch": "p = pow(abs(p-0.5), vec2(1.2))*sign(p-0.5)+0.5;",
        "bulge": "p = pow(abs(p-0.5), vec2(0.8))*sign(p-0.5)+0.5;",
        "offset": "p += vec2(0.1, 0.2);",
        "align": "p = floor(p*10.0)/10.0;",
        "center": "p = (p-0.5)*0.8 + 0.5;",
        "edge": "f = step(0.45, max(abs(p.x-0.5), abs(p.y-0.5))); c = mix(c, vec3(1.0), f);",

        // MATERIALS (32)
        "plastic": "c = mix(c, vec3(0.9), 0.1); c += vec3(pow(max(0.0, 1.0-length(p-0.5)), 20.0));",
        "metal": "c = mix(c, vec3(0.7), 0.5); c += vec3(pow(max(0.0, 1.0-length(p-0.5)), 5.0));",
        "rock_mat": "f = fbm(p*10.0, 10.0); c = mix(c, vec3(0.4, 0.35, 0.3), f);",
        "sand_mat": "f = noise(p*50.0, 10.0); c = mix(c, vec3(0.8, 0.7, 0.5), f*0.3);",
        "grass_mat": "f = fbm(p*vec2(5.0, 20.0), 10.0); c = mix(c, vec3(0.1, 0.4, 0.1), f);",
        "fur_mat": "f = noise(p*vec2(100.0, 10.0), 10.0); c = mix(c, vec3(0.3, 0.2, 0.1), f);",
        "cloth_mat": "f = sin(p.x*80.0)*sin(p.y*80.0)*0.5+0.5; c *= (0.9+0.1*f);",
        "glass_mat": "c = mix(c, vec3(0.9, 1.0, 1.0), 0.3); c += vec3(pow(max(0.0, 1.0-length(p-0.5)), 15.0));",
        "ice_mat": "f = fbm(p*8.0, 10.0); c = mix(c, vec3(0.8, 0.9, 1.0), 0.4+f*0.4);",
        "lava_mat": "f = fbm(p*4.0, 10.0); c = mix(c, vec3(1.0, 0.3, 0.0)*f*f*2.0, f);",
        "plasma_mat": "f = fbm(p*5.0 + u_time, 10.0); c = mix(c, vec3(0.5, 0.0, 1.0), f);",
        "liquid_mat": "f = noise(p*3.0 + u_time, 10.0); c = mix(c, vec3(0.2, 0.5, 0.7), f);",
        "gas_mat": "f = fbm(p*2.0 + u_time, 10.0); c = mix(c, vec3(0.8, 1.0, 0.8), f*0.5);",
        "smoke_mat": "f = fbm(p*3.0, 10.0); c = mix(c, vec3(0.6), f*0.5);",
        "mist_mat": "f = noise(p*2.0, 10.0); c = mix(c, vec3(0.9), f*0.3);",
        "aura_mat": "f = 1.0-length(p-0.5); c += vec3(0.0, 0.5, 1.0)*f*f;",
        "energy_mat": "f = abs(sin(length(p-0.5)*10.0 - u_time)); c += vec3(0.5, 1.0, 1.0)*f*0.2;",
        "crystal_mat": "f = voronoi(p*15.0); c = mix(c, vec3(0.8, 0.9, 1.0), step(0.9, f));",
        "gold_mat": "c = vec3(1.0, 0.8, 0.2); c += vec3(pow(max(0.0, 1.0-length(p-0.5)), 8.0));",
        "silver_mat": "c = vec3(0.9, 0.9, 0.95); c += vec3(pow(max(0.0, 1.0-length(p-0.5)), 8.0));",
        "copper_mat": "c = vec3(0.8, 0.4, 0.2); c += vec3(pow(max(0.0, 1.0-length(p-0.5)), 8.0));",
        "steel_mat": "c = vec3(0.6, 0.6, 0.65); c += vec3(pow(max(0.0, 1.0-length(p-0.5)), 12.0));",
        "iron_mat": "c = vec3(0.3, 0.3, 0.35); c += vec3((random(p)-0.5)*0.1);",
        "bronze_mat": "c = vec3(0.5, 0.4, 0.2); c += vec3((fbm(p*10.0, 10.0)-0.5)*0.1);",
        "chrome_mat": "c = vec3(0.9, 0.9, 1.0); c += vec3(pow(max(0.0, 1.0-length(p-0.5)), 2.0)*0.5);",
        "carbon_mat": "c = vec3(0.1, 0.1, 0.1); f = sin(p.x*200.0)*sin(p.y*200.0); c += vec3(f*0.05);",
        "rubber_mat": "c = vec3(0.05, 0.05, 0.05);",
        "paper_mat": "c = vec3(0.95, 0.95, 0.9); f = noise(p*100.0, 10.0); c -= vec3(f*0.05);",
        "leather_mat": "f = voronoi(p*20.0); c = vec3(0.3, 0.15, 0.1) * (0.8+0.2*f);",
        "silk_mat": "f = sin(p.x*10.0 + fbm(p*5.0, 10.0)*5.0); c = mix(c, vec3(0.9, 0.7, 0.8), f*0.2+0.8);",
        "velvet_mat": "f = 1.0-length(p-0.5); c *= (0.5+0.5*f); c += vec3(0.2, 0.0, 0.1)*(1.0-f);",
        "diamond_mat": "f = voronoi(p*5.0); c = mix(c, vec3(0.9, 1.0, 1.0), 0.5); c += vec3(step(0.95, f)*0.5);",

        // FLOW (32)
        "then": "/* separator */",
        "and": "/* separator */",
        "with": "/* separator */",
        "onto": "/* separator */",
        "under": "/* separator */",
        "over": "/* separator */",
        "inside": "p = (p-0.5)*2.0 + 0.5;",
        "outside": "p = (p-0.5)*0.5 + 0.5;",
        "between": "p = fract(p*2.0);",
        "around": "float r14 = length(p-0.5); p = vec2(r14, atan(p.y-0.5, p.x-0.5)/6.28 + 0.5);",
        "through": "p.x += p.y;",
        "across": "p.y += p.x;",
        "along": "p += vec2(u_time*0.1);",
        "against": "p -= vec2(u_time*0.1);",
        "from": "p = p;",
        "to": "p = p;",
        "into": "p = p*p;",
        "upon": "p = sqrt(abs(p));",
        "beneath": "c *= 0.8;",
        "above": "c *= 1.2;",
        "beside": "p.x += 0.5;",
        "near": "p = (p-0.5)*0.9 + 0.5;",
        "far": "p = (p-0.5)*1.1 + 0.5;",
        "again": "/* loop placeholder */",
        "twice": "/* loop placeholder */",
        "thrice": "/* loop placeholder */",
        "forever": "/* time modifier */",
        "slowly": "/* time modifier */",
        "fast": "/* time modifier */",
        "pulse": "c *= sin(u_time*5.0)*0.2+0.8;",
        "flash": "c += vec3(step(0.9, sin(u_time*10.0)));",
        "drift": "p += u_time*0.05;"
    };

    class WordParser {
        constructor() {
            this.words = WORDS;
        }

        parse(sentence) {
            const tokens = sentence.toLowerCase().split(/[\s,]+/);
            let shaderParts = ["vec3 c = vec3(0.0);", "vec2 p = vUv;", "float f = 0.0;"];
            let seed = null;
            let width = 512;
            let height = 512;

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                
                // Modifiers like seed:123
                if (token.startsWith('seed:')) {
                    seed = parseFloat(token.split(':')[1]);
                    continue;
                }
                if (token.startsWith('width:')) {
                    width = parseInt(token.split(':')[1]);
                    continue;
                }
                if (token.startsWith('height:')) {
                    height = parseInt(token.split(':')[1]);
                    continue;
                }

                if (this.words[token]) {
                    shaderParts.push("// " + token);
                    shaderParts.push(this.words[token]);
                } else if (this.words[token + "_mat"]) {
                    shaderParts.push("// " + token);
                    shaderParts.push(this.words[token + "_mat"]);
                } else if (this.words[token + "_spatial"]) {
                    shaderParts.push("// " + token);
                    shaderParts.push(this.words[token + "_spatial"]);
                } else if (this.words[token + "_mod"]) {
                    shaderParts.push("// " + token);
                    shaderParts.push(this.words[token + "_mod"]);
                }
            }

            shaderParts.push("gl_FragColor = vec4(c, 1.0);");
            
            return {
                shader: shaderParts.join("\n"),
                seed: seed,
                width: width,
                height: height
            };
        }
    }

    TexGen.Words = WordParser;
    return WordParser;

}));
