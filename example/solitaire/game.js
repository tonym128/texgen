// game.js - Procedural Solitaire

const SHADERS = {
    felt: `void main() {
        vec2 st = vUv * 100.0;
        float n = random(floor(st)) * 0.5 + 0.5;
        vec3 col = mix(vec3(0.05, 0.25, 0.1), vec3(0.1, 0.35, 0.15), n);
        float d = length(vUv - 0.5);
        col *= smoothstep(0.8, 0.2, d);
        gl_FragColor = vec4(col, 1.0);
    }`,
    back: `void main() {
        vec2 p = vUv - 0.5;
        float d = sdBox(p, vec2(0.48, 0.48));
        float inner = sdBox(p, vec2(0.42, 0.42));
        float grid = step(0.8, fract(vUv.x * 15.0 + sin(vUv.y * 30.0) * 0.2)) + 
                     step(0.8, fract(vUv.y * 15.0 + sin(vUv.x * 30.0) * 0.2));
        vec3 patternCol = mix(vec3(0.6, 0.1, 0.15), vec3(0.8, 0.2, 0.2), grid);
        patternCol *= 0.8 + 0.4 * fbm(vUv * 5.0, 5.0);
        vec3 borderCol = vec3(0.95);
        vec3 finalCol = mix(borderCol, patternCol, step(inner, 0.0));
        float mask = smoothstep(0.02, 0.0, d);
        gl_FragColor = vec4(finalCol * mask, mask);
    }`,
    paper: `void main() {
        float d = sdBox(vUv - 0.5, vec2(0.48, 0.48));
        float n = fbm(vUv * 20.0, 20.0);
        vec3 col = mix(vec3(0.95, 0.95, 0.9), vec3(1.0, 1.0, 0.98), n);
        float mask = smoothstep(0.02, 0.0, d);
        gl_FragColor = vec4(col * mask, mask);
    }`
};

const SUITS = ['hearts', 'diams', 'clubs', 'spades'];
const SYM = { hearts: '♥', diams: '♦', clubs: '♣', spades: '♠' };
const COLOR = { hearts: 'red', diams: 'red', clubs: 'black', spades: 'black' };
const VALS = { 1:'A', 11:'J', 12:'Q', 13:'K' };
const F_SUITS = { f0: 'spades', f1: 'hearts', f2: 'clubs', f3: 'diams' };

class Solitaire {
    constructor() {
        this.deck = [];
        this.piles = {
            stock: [], waste: [],
            f0: [], f1: [], f2: [], f3: [],
            t0: [], t1: [], t2: [], t3: [], t4: [], t5: [], t6: []
        };
        this.textures = { back: '', paper: '' };
        this.dragData = null;
        this.lastClickTime = 0;
        this.lastClickCard = null;
        this.init();
    }

    async init() {
        this.resize();
        window.addEventListener('resize', () => { this.resize(); this.renderAll(); });

        const tg = new TexGen();
        const bgCanvas = document.getElementById('bg-canvas');
        if (bgCanvas) {
            bgCanvas.width = window.innerWidth;
            bgCanvas.height = window.innerHeight;
            const bgTg = new TexGen({ canvas: bgCanvas });
            bgTg.init(SHADERS.felt); bgTg.render();
        }
        this.textures.back = tg.bake(SHADERS.back, { width: 160, height: 224 });
        this.textures.paper = tg.bake(SHADERS.paper, { width: 160, height: 224 });
        
        this.setupInput();
        this.startNewGame();
    }

    resize() {
        const w = window.innerWidth;
        const availableW = w - 40;
        this.cw = Math.min(120, Math.floor(availableW / 8));
        this.ch = Math.floor(this.cw * 1.4);
        this.gapX = Math.floor(availableW / 7);
        this.margin = Math.floor((w - (this.gapX * 6 + this.cw)) / 2);

        const style = document.getElementById('dynamic-card-css') || document.createElement('style');
        style.id = 'dynamic-card-css';
        style.innerHTML = `
            .card, .pile-slot { width: ${this.cw}px; height: ${this.ch}px; }
            .card-inner { border-radius: ${this.cw * 0.08}px; }
            .val { font-size: ${this.cw * 0.22}px; }
            .suit { font-size: ${this.cw * 0.2}px; }
            .center-suit { font-size: ${this.cw * 0.4}px; }
        `;
        if (!style.parentElement) document.head.appendChild(style);

        const bgCanvas = document.getElementById('bg-canvas');
        if (bgCanvas) {
            bgCanvas.width = window.innerWidth;
            bgCanvas.height = window.innerHeight;
            const bgTg = new TexGen({ canvas: bgCanvas });
            bgTg.init(SHADERS.felt); bgTg.render();
        }

        this.drawSlots();
    }

    drawSlots() {
        const c = document.getElementById('slots-container');
        if (!c) return;
        c.innerHTML = '';
        const addSlot = (id, x, y, icon = '') => {
            const el = document.createElement('div');
            el.className = 'pile-slot'; el.id = id; el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.pointerEvents = 'auto';
            if (icon) {
                el.style.display = 'flex'; el.style.justifyContent = 'center'; el.style.alignItems = 'center';
                el.style.fontSize = `${this.cw * 0.4}px`; el.style.color = 'rgba(255,255,255,0.1)'; el.innerHTML = icon;
            }
            c.appendChild(el); return { x, y };
        };
        this.slotPos = {
            stock: addSlot('stock', this.margin, 20, '↺'),
            waste: addSlot('waste', this.margin + this.gapX, 20),
            f0: addSlot('f0', this.margin + this.gapX * 3, 20, '♠'),
            f1: addSlot('f1', this.margin + this.gapX * 4, 20, '♥'),
            f2: addSlot('f2', this.margin + this.gapX * 5, 20, '♣'),
            f3: addSlot('f3', this.margin + this.gapX * 6, 20, '♦')
        };
        for (let i = 0; i < 7; i++) this.slotPos['t' + i] = addSlot('t' + i, this.margin + i * this.gapX, this.ch + 50);
    }

    startNewGame() {
        const victory = document.getElementById('victory-overlay');
        if (victory) victory.style.display = 'none';
        const c = document.getElementById('cards-container');
        if (!c) return;
        c.innerHTML = ''; this.deck = [];
        SUITS.forEach(s => {
            for (let v = 1; v <= 13; v++) {
                const displayVal = VALS[v] || v;
                const el = document.createElement('div'); el.className = `card ${COLOR[s]}`;
                el.innerHTML = `<div class="card-inner"><div class="top-left"><div class="val">${displayVal}</div><div class="suit">${SYM[s]}</div></div><div class="center-suit">${SYM[s]}</div><div class="bottom-right"><div class="val">${displayVal}</div><div class="suit">${SYM[s]}</div></div></div>`;
                c.appendChild(el); this.deck.push({ id: s + v, suit: s, val: v, color: COLOR[s], faceUp: false, el });
            }
        });
        for (let i = this.deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]; }
        Object.keys(this.piles).forEach(k => this.piles[k] = []);
        let dIdx = 0;
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = this.deck[dIdx++]; card.faceUp = (row === col); this.piles['t' + col].push(card);
            }
        }
        while (dIdx < this.deck.length) { const card = this.deck[dIdx++]; card.faceUp = false; this.piles.stock.push(card); }
        this.renderAll();
    }

    renderAll() {
        let z = 10;
        const renderPile = (pileKey, getPos) => {
            this.piles[pileKey].forEach((c, idx) => {
                const pos = getPos(idx); c.el.style.transform = `translate(${pos.x}px, ${pos.y}px)`; c.el.style.zIndex = z++; this.updateCardVisual(c);
            });
        };
        renderPile('stock', i => ({ x: this.slotPos.stock.x, y: this.slotPos.stock.y - (i * 0.2) }));
        renderPile('waste', i => ({ x: this.slotPos.waste.x, y: this.slotPos.waste.y }));
        for (let i = 0; i < 4; i++) renderPile('f' + i, () => ({ x: this.slotPos['f' + i].x, y: this.slotPos['f' + i].y }));
        for (let col = 0; col < 7; col++) {
            const pile = this.piles['t' + col]; let curY = this.slotPos['t' + col].y;
            pile.forEach((c, idx) => {
                c.el.style.transform = `translate(${this.slotPos['t' + col].x}px, ${curY}px)`; c.el.style.zIndex = z++; this.updateCardVisual(c);
                curY += c.faceUp ? Math.floor(this.ch * 0.22) : Math.floor(this.ch * 0.1);
            });
        }
    }

    updateCardVisual(c) {
        const inner = c.el.querySelector('.card-inner');
        if (c.faceUp) {
            c.el.classList.remove('face-down'); c.el.classList.add('face-up');
            inner.style.backgroundImage = `url(${this.textures.paper})`;
        } else {
            c.el.classList.add('face-down'); c.el.classList.remove('face-up');
            inner.style.backgroundImage = `url(${this.textures.back})`;
        }
    }

    setupInput() {
        // Desktop
        document.addEventListener('mousedown', e => this.onDown(e));
        document.addEventListener('mousemove', e => this.onMove(e));
        document.addEventListener('mouseup', e => this.onUp(e));

        // Mobile
        document.addEventListener('touchstart', e => {
            const touch = e.touches[0];
            // Create a fake mouse event for shared logic
            const fakeEvent = { button: 0, clientX: touch.clientX, clientY: touch.clientY, target: touch.target };
            this.onDown(fakeEvent);
        }, { passive: false });

        document.addEventListener('touchmove', e => {
            if (!this.dragData) return;
            e.preventDefault(); // Prevent scrolling while dragging
            const touch = e.touches[0];
            const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
            this.onMove(fakeEvent);
        }, { passive: false });

        document.addEventListener('touchend', e => {
            if (!this.dragData) return;
            this.onUp();
        });
    }

    onDown(e) {
        if (e.button !== 0) return;
        const cardEl = e.target.closest('.card');
        const slotEl = e.target.closest('.pile-slot');
        const now = Date.now();
        const isDoubleClick = (now - this.lastClickTime < 300) && (this.lastClickCard === cardEl);
        this.lastClickTime = now;
        this.lastClickCard = cardEl;
        if (slotEl && slotEl.id === 'stock' && this.piles.stock.length === 0) {
            while (this.piles.waste.length > 0) { const c = this.piles.waste.pop(); c.faceUp = false; this.piles.stock.push(c); }
            this.renderAll(); return;
        }
        if (!cardEl) return;
        let originPile = null, originIndex = -1, foundCard = null;
        for (const [pk, pile] of Object.entries(this.piles)) {
            originIndex = pile.findIndex(c => c.el === cardEl);
            if (originIndex !== -1) { originPile = pk; foundCard = pile[originIndex]; break; }
        }
        if (!foundCard) return;
        if (isDoubleClick && foundCard.faceUp) {
            const foundations = ['f0', 'f1', 'f2', 'f3'];
            for (const fId of foundations) {
                if (this.isValidMove(foundCard, fId, 1)) {
                    this.piles[originPile].splice(originIndex, 1);
                    this.piles[fId].push(foundCard);
                    this.renderAll(); this.checkWin(); return;
                }
            }
        }
        if (originPile === 'stock') {
            const c = this.piles.stock.pop(); c.faceUp = true; this.piles.waste.push(c); this.renderAll(); return;
        }
        if (originPile.startsWith('t') && !foundCard.faceUp && originIndex === this.piles[originPile].length - 1) {
            foundCard.faceUp = true; this.renderAll(); return;
        }
        if (!foundCard.faceUp) return;
        if (originPile === 'waste' && originIndex !== this.piles.waste.length - 1) return;
        if (originPile.startsWith('f') && originIndex !== this.piles[originPile].length - 1) return;
        const cardsToDrag = this.piles[originPile].slice(originIndex);
        this.dragData = { originPile, originIndex, cards: cardsToDrag, startX: e.clientX, startY: e.clientY, baseTransforms: cardsToDrag.map(c => c.el.style.transform) };
        cardsToDrag.forEach(c => c.el.classList.add('dragging'));
    }

    onMove(e) {
        if (!this.dragData) return;
        const dx = e.clientX - this.dragData.startX, dy = e.clientY - this.dragData.startY;
        this.dragData.cards.forEach((c, i) => {
            const match = this.dragData.baseTransforms[i].match(/translate\(([-\d\.]+)px,\s*([-\d\.]+)px\)/);
            if (match) {
                const ox = parseFloat(match[1]), oy = parseFloat(match[2]);
                c.el.style.transform = `translate(${ox + dx}px, ${oy + dy}px)`;
            }
        });
    }

    onUp(e) {
        if (!this.dragData) return;
        const cards = this.dragData.cards, topCard = cards[0];
        const rect = topCard.el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        cards.forEach(c => c.el.classList.remove('dragging'));
        let targetPile = null;
        const targets = ['t0','t1','t2','t3','t4','t5','t6', 'f0','f1','f2','f3'];
        for (const pk of targets) {
            const slotEl = document.getElementById(pk);
            if (!slotEl) continue;
            const r = slotEl.getBoundingClientRect();
            let tx = r.left, ty = r.top, tw = r.width, th = r.height;
            if (pk.startsWith('t')) th = 1000;
            if (cx >= tx && cx <= tx + tw && cy >= ty && cy <= ty + th) { targetPile = pk; break; }
        }
        if (targetPile && this.isValidMove(topCard, targetPile, cards.length)) {
            this.piles[this.dragData.originPile].splice(this.dragData.originIndex);
            this.piles[targetPile].push(...cards);
            this.checkWin();
        }
        this.dragData = null; this.renderAll();
    }

    isValidMove(card, targetPile, count) {
        const dest = this.piles[targetPile];
        const destCard = dest.length > 0 ? dest[dest.length - 1] : null;
        if (targetPile.startsWith('f')) {
            if (count > 1) return false;
            if (card.suit !== F_SUITS[targetPile]) return false;
            if (!destCard) return card.val === 1;
            return card.val === destCard.val + 1;
        }
        if (targetPile.startsWith('t')) {
            if (!destCard) return card.val === 13;
            return card.color !== destCard.color && card.val === destCard.val - 1;
        }
        return false;
    }

    checkWin() {
        const won = this.piles.f0.length === 13 && this.piles.f1.length === 13 && 
                    this.piles.f2.length === 13 && this.piles.f3.length === 13;
        const victory = document.getElementById('victory-overlay');
        if (won && victory) victory.style.display = 'flex';
    }
}

window.Solitaire = Solitaire;
window.onload = () => { window.game = new Solitaire(); };
