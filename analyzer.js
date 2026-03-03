const fs = require('fs');
const path = require('path');

const examples = [
    'platformer', 'maze3d', 'marble_roller', 'flight_sim', 'card_roguelike', 'solitaire', 'typescript_gallery', 'texture_streaming', 'multipass_post'
];

examples.forEach(ex => {
    let p = path.join('example', ex, 'game.js');
    if (!fs.existsSync(p)) {
        p = path.join('example', ex, 'src', 'main.ts');
        if (!fs.existsSync(p)) {
            console.log(ex, "NO SCRIPT FOUND");
            return;
        }
    }
    const content = fs.readFileSync(p, 'utf8');
    
    // Find literal shader strings or compressed shaders
    let count = 0;
    let size = 0;
    
    // Check for COMPRESSED_SHADERS
    const compressedMatch = content.match(/COMPRESSED_SHADERS\s*=\s*{([^}]*)}/);
    if (compressedMatch) {
        const objStr = "{" + compressedMatch[1] + "}";
        // extract string lengths
        const strings = compressedMatch[1].match(/['"`](.*?)['"`]/g) || [];
        count += strings.length;
        strings.forEach(s => size += s.length - 2); // subtract quotes
    } else {
        // Find other bake/init patterns
        // Like: tgWords.parse("...")
        let strings = [];
        const tgWordsMatch = content.match(/tgWords\.parse\(['"`](.*?)['"`]\)/g);
        if (tgWordsMatch) {
            tgWordsMatch.forEach(m => {
                const s = m.match(/['"`](.*?)['"`]/)[1];
                strings.push(s);
            });
        }
        
        // Literal shaders like `void main() { ... }` or const XXX_SHADER = `...`
        // Count `...` strings containing `void main`
        const glslMatch = content.match(/`([^`]*void main\(\)[^`]*)`/g);
        if (glslMatch) {
            glslMatch.forEach(s => {
                strings.push(s);
            });
        }

        // Just roughly count things if no obvious ones
        if (strings.length > 0) {
            count += strings.length;
            strings.forEach(s => size += s.length);
        } else {
            console.log(ex, "No clear textures found");
        }
    }
    
    console.log(`${ex}: ${count} textures, ${size} bytes`);
});
