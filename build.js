const fs = require('fs');
const path = require('path');

const corePath = path.resolve(__dirname, 'src/texgen.core.js');
const esmPath = path.resolve(__dirname, 'texgen.mjs');
const umdPath = path.resolve(__dirname, 'texgen.js');

const core = fs.readFileSync(corePath, 'utf8').trim();

// 1. Generate ESM (.mjs)
const esmContent = `${core}

export default TexGen;
`;
fs.writeFileSync(esmPath, esmContent);
console.log('Build: texgen.mjs generated.');

// 2. Generate UMD (.js)
const umdContent = `${core}

` + 
`(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TexGen = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    return TexGen;
}));
`;

fs.writeFileSync(umdPath, umdContent);
console.log('Build: texgen.js (UMD) generated.');
