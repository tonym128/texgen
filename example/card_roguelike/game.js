// game.js - Procedural Card Roguelike (Alien Evolution)

const CARD_SHADERS = {
    // Ornate Frames
    frame: `uniform float u_type; // 0=Gold, 1=Silver, 2=Stone, 3=Crystal
    void main() {
        float d = sdBox(vUv - 0.5, vec2(0.45, 0.47));
        float inner = sdBox(vUv - 0.5, vec2(0.4, 0.42));
        vec3 col = vec3(0.1);
        if (u_type < 0.5) col = vec3(1.0, 0.8, 0.2);
        else if (u_type < 1.5) col = vec3(0.8, 0.8, 0.9);
        else if (u_type < 2.5) col = vec3(0.4, 0.4, 0.45);
        else col = vec3(0.0, 1.0, 1.0);
        float n = fbm(vUv * 10.0, 10.0);
        col *= (0.8 + 0.4 * n);
        float mask = smoothstep(0.01, -0.01, d) * smoothstep(-0.01, 0.01, inner);
        gl_FragColor = vec4(col, mask);
    }`,

    // Card Arts
    fire: `void main() {
        vec2 p = vUv - 0.5;
        float n = fbm(vUv * 6.0 - vec2(0.0, u_time * 2.0), 6.0);
        vec3 col = mix(vec3(1.0, 0.1, 0.0), vec3(1.0, 0.8, 0.0), n);
        gl_FragColor = vec4(col * smoothstep(0.4, 0.1, length(p) + n * 0.2), 1.0);
    }`,
    void: `void main() {
        float d = voronoi(vUv * 8.0 + u_time * 0.5);
        gl_FragColor = vec4(mix(vec3(0.1, 0.0, 0.2), vec3(0.5, 0.0, 1.0), d), 1.0);
    }`,
    nature: `void main() {
        float n = fbm(vUv * 10.0, 10.0);
        vec3 col = mix(vec3(0.1, 0.4, 0.1), vec3(0.4, 0.8, 0.2), n);
        gl_FragColor = vec4(col * smoothstep(0.4, 0.5, n), 1.0);
    }`,
    toxic: `void main() {
        float n = fbm(vUv * 8.0 + u_time * 0.3, 8.0);
        vec3 col = mix(vec3(0.0, 0.2, 0.0), vec3(0.5, 1.0, 0.0), n);
        gl_FragColor = vec4(col * step(0.4, n), 1.0);
    }`,

    // Avatars
    player: `void main() {
        vec2 p = vUv - 0.5;
        float body = sdBox(p + vec2(0.0, 0.2), vec2(0.25, 0.3));
        float head = length(p - vec2(0.0, 0.25)) - 0.18;
        float eye = smoothstep(0.06, 0.05, length(abs(p - vec2(0.0, 0.25)) - vec2(0.08, 0.02)));
        vec3 skin = mix(vec3(0.1, 0.5, 0.2), vec3(0.4, 0.9, 0.3), fbm(vUv * 5.0, 5.0));
        float mask = smoothstep(0.01, -0.01, min(body, head));
        vec3 col = mix(skin, vec3(0.0), eye);
        gl_FragColor = vec4(col * mask, 1.0);
    }`,
    enemy: `void main() {
        vec2 p = vUv - 0.5;
        float n = fbm(vUv * 5.0 + u_time * 0.2, 5.0);
        vec3 col = mix(vec3(0.1), vec3(0.8, 0.2, 0.2), n);
        float eye = smoothstep(0.05, 0.0, length(p - vec2(0.15, 0.1))) + 
                    smoothstep(0.05, 0.0, length(p - vec2(-0.15, 0.1)));
        col = mix(col, vec3(1.0, 1.0, 0.0), eye);
        gl_FragColor = vec4(col * smoothstep(0.45, 0.4, length(p)), 1.0);
    }`,

    // Card Back
    back: `void main() {
        float d = sdBox(vUv - 0.5, vec2(0.45, 0.47));
        float grid = step(0.9, fract(vUv.x * 10.0)) + step(0.9, fract(vUv.y * 10.0));
        vec3 col = mix(vec3(0.1, 0.1, 0.2), vec3(0.2, 0.4, 0.8), grid);
        gl_FragColor = vec4(col * step(d, 0.0), 1.0);
    }`
};

class CardRoguelike {
    constructor() {
        this.hand = [];
        this.enemyHand = [];
        this.player = { hp: 100, maxHp: 100, block: 0 };
        this.enemy = { hp: 100, maxHp: 100, block: 0, name: "Gloom Weaver" };
        this.isEnemyTurn = false;
        this.victory = false;
        
        this.playerPool = [
            { name: "Acid Spit", type: "toxic", cost: 1, val: 12, effect: "dmg" },
            { name: "Void Rift", type: "void", cost: 2, val: 25, effect: "dmg" },
            { name: "Plasma Burst", type: "fire", cost: 1, val: 10, effect: "dmg" },
            { name: "Bio-Shield", type: "nature", cost: 1, val: 12, effect: "block" },
            { name: "Solar Flare", type: "fire", cost: 2, val: 20, effect: "dmg" }
        ];

        this.enemyPool = [
            { name: "Shadow Strike", type: "void", cost: 1, val: 10, effect: "dmg" },
            { name: "Void Surge", type: "void", cost: 2, val: 18, effect: "dmg" },
            { name: "Dark Aegis", type: "void", cost: 1, val: 15, effect: "block" },
            { name: "Abyssal Maw", type: "toxic", cost: 2, val: 22, effect: "dmg" }
        ];

        this.init();
    }

    async init() {
        this.renderActor('player', CARD_SHADERS.player);
        this.renderActor('enemy', CARD_SHADERS.enemy);
        const tg = new TexGen();
        this.enemyCardBack = tg.bake(CARD_SHADERS.back, { width: 100, height: 140 });
        this.setupEnemyHand();
        this.drawHand();
        this.updateStats();
    }

    renderActor(id, shader) {
        const canvas = document.getElementById(`${id}-canvas`);
        const tg = new TexGen({ canvas, width: 256, height: 256 });
        tg.init(shader);
        tg.render(Math.random() * 100);
    }

    setupEnemyHand() {
        const oldCards = document.querySelectorAll('.enemy-card-hidden');
        oldCards.forEach(c => c.remove());
        this.enemyHand = [];
        const enemyArea = document.getElementById('enemy-actor');
        for (let i = 0; i < 3; i++) {
            const data = this.enemyPool[Math.floor(Math.random() * this.enemyPool.length)];
            const el = document.createElement('div');
            el.className = 'enemy-card-hidden';
            const offset = (i - 1) * 30;
            el.style.cssText = `position: absolute; width: 60px; height: 84px; top: -40px; left: calc(50% + ${offset}px); z-index: -1; border-radius: 4px; overflow: hidden; transform: rotate(${offset/2}deg); transition: all 0.5s;`;
            el.innerHTML = `<img src="${this.enemyCardBack}" style="width:100%; height:100%;">`;
            enemyArea.appendChild(el);
            this.enemyHand.push({ el, data });
        }
    }

    updateStats() {
        document.getElementById('player-hp-fill').style.width = `${(this.player.hp / this.player.maxHp) * 100}%`;
        document.getElementById('enemy-hp-fill').style.width = `${(this.enemy.hp / this.enemy.maxHp) * 100}%`;
        document.getElementById('player-hp-text').innerText = `${this.player.hp} / ${this.player.maxHp}`;
        document.getElementById('enemy-hp-text').innerText = `${this.enemy.hp} / ${this.enemy.maxHp}`;
        document.getElementById('player-block').innerText = this.player.block > 0 ? `🛡️ ${this.player.block}` : '';
        document.getElementById('enemy-block').innerText = this.enemy.block > 0 ? `🛡️ ${this.enemy.block}` : '';
    }

    drawHand() {
        if (this.isEnemyTurn || this.victory) return;
        const handEl = document.getElementById('hand');
        handEl.innerHTML = '';
        this.player.block = 0;
        this.updateStats();
        for (let i = 0; i < 5; i++) {
            const data = this.playerPool[Math.floor(Math.random() * this.playerPool.length)];
            handEl.appendChild(this.createCardElement(data));
        }
        this.updateCardRotations();
        this.log("Your Turn");
    }

    createCardElement(data, isEnemy = false) {
        const card = document.createElement('div');
        card.className = isEnemy ? 'card revealed-enemy-card' : 'card';
        const tg = new TexGen();
        const frameType = isEnemy ? 2 : (data.cost > 1 ? 3 : 1);
        const frameUrl = tg.bake(CARD_SHADERS.frame, { width: 180, height: 260, uniforms: { u_type: frameType } });
        const artUrl = tg.bake(CARD_SHADERS[data.type], { width: 150, height: 110, time: Math.random() * 1000 });
        card.innerHTML = `<div class="card-cost">${data.cost}</div><img src="${frameUrl}" class="card-frame"><img src="${artUrl}" class="card-art"><div class="card-info"><div class="card-name">${data.name}</div><div class="card-desc">${data.effect === 'dmg' ? 'Attack' : 'Block'} ${data.val}</div></div>`;
        if (!isEnemy) card.onclick = () => this.playCard(card, data);
        return card;
    }

    updateCardRotations() {
        const cards = document.querySelectorAll('#hand .card');
        cards.forEach((card, i) => {
            const offset = i - (cards.length - 1) / 2;
            card.style.transform = `rotate(${offset * 6}deg) translateY(${Math.abs(offset) * 8}px)`;
        });
    }

    async playCard(el, data) {
        if (this.isEnemyTurn || this.victory) return;
        
        // Get absolute position before moving
        const rect = el.getBoundingClientRect();
        
        // Move to body to escape container clipping/perspective
        document.body.appendChild(el);
        el.style.position = 'fixed';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        el.style.margin = '0';
        el.style.zIndex = '5000';
        el.style.pointerEvents = 'none';
        el.style.transition = 'all 0.6s cubic-bezier(0.5, 0, 0.5, 1)';
        
        // Trigger reflow
        el.offsetHeight;

        if (data.effect === 'dmg') {
            // Fly to Enemy (approx center-right)
            el.style.left = '70%';
            el.style.top = '30%';
            el.style.transform = 'scale(0.3) rotate(720deg)';
        } else {
            // Fly to Player (approx center-left)
            el.style.left = '20%';
            el.style.top = '30%';
            el.style.transform = 'scale(0.3) rotate(-720deg)';
        }
        el.style.opacity = '0';

        // Wait for mid-flight impact
        await new Promise(r => setTimeout(r, 400));

        if (data.effect === 'dmg') {
            let dmg = data.val;
            if (this.enemy.block >= dmg) { this.enemy.block -= dmg; }
            else { dmg -= this.enemy.block; this.enemy.block = 0; this.enemy.hp = Math.max(0, this.enemy.hp - dmg); }
            this.animateHit('enemy-actor');
            this.spawnFloatingText(`-${data.val}`, 'enemy-actor', 'dmg-text');
        } else {
            if (data.effect === 'block') {
                this.player.block += data.val;
                this.spawnFloatingText(`+${data.val}`, 'player-actor', 'block-text');
            } else {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + data.val);
                this.spawnFloatingText(`+${data.val}`, 'player-actor', 'block-text');
            }
        }

        this.updateStats();
        this.log(`Played ${data.name}`);

        if (this.enemy.hp <= 0) {
            this.showVictory();
            return;
        }

        await new Promise(r => setTimeout(r, 200));
        el.remove();
        this.startEnemyTurn();
    }

    showVictory() {
        this.victory = true;
        document.getElementById('victory-screen').style.display = 'flex';
        this.log("VICTORY!");
    }

    async startEnemyTurn() {
        if (this.victory) return;
        this.isEnemyTurn = true;
        document.getElementById('new-hand-btn').disabled = true;
        this.log("Enemy Turn...");
        await new Promise(r => setTimeout(r, 800));

        if (this.enemyHand.length > 0) {
            const cardObj = this.enemyHand.pop();
            const { el, data } = cardObj;
            const revealedCard = this.createCardElement(data, true);
            revealedCard.style.cssText = `position: fixed; width: 180px; height: 260px; left: 70%; top: 30%; z-index: 1000; transform: rotateY(90deg) scale(0.5); transition: all 0.6s cubic-bezier(0.5, 0, 0.5, 1); pointer-events: none;`;
            document.body.appendChild(revealedCard);
            el.style.opacity = '0';
            await new Promise(r => setTimeout(r, 50));
            revealedCard.style.transform = "rotateY(0deg) scale(1.0)";
            revealedCard.style.left = "20%"; 
            revealedCard.style.top = "40%";
            await new Promise(r => setTimeout(r, 300));
            if (data.effect === 'dmg') {
                let dmg = data.val;
                if (this.player.block >= dmg) { this.player.block -= dmg; }
                else { dmg -= this.player.block; this.player.block = 0; this.player.hp = Math.max(0, this.player.hp - dmg); }
                this.animateHit('player-actor');
                this.spawnFloatingText(`-${data.val}`, 'player-actor', 'dmg-text');
            } else {
                this.enemy.block += data.val;
                this.spawnFloatingText(`+${data.val}`, 'enemy-actor', 'block-text');
            }
            this.updateStats();
            if (this.player.hp <= 0) { alert("The Alien has fallen! Restarting..."); location.reload(); }
            await new Promise(r => setTimeout(r, 300));
            revealedCard.style.opacity = "0";
            setTimeout(() => revealedCard.remove(), 600);
        }
        await new Promise(r => setTimeout(r, 600));
        this.isEnemyTurn = false;
        document.getElementById('new-hand-btn').disabled = false;
        if (document.querySelectorAll('#hand .card').length === 0) { this.setupEnemyHand(); this.drawHand(); }
    }

    animateHit(id) {
        const el = document.getElementById(id);
        el.classList.add('hit');
        setTimeout(() => el.classList.remove('hit'), 300);
    }

    log(msg) { document.getElementById('log').innerText = msg; }

    spawnFloatingText(text, parentId, className) {
        const parent = document.getElementById(parentId);
        const el = document.createElement('div');
        el.className = `floating-text ${className}`;
        el.innerText = text;
        el.style.left = '50%'; el.style.top = '40%';
        parent.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }
}

const game = new CardRoguelike();
