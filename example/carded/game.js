import { evaluatePokerHand } from "./pokerLogic.js";
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- GLOBAL CACHE & ASSETS ---
const cardFrontCache = {};
let cardBackTex = null;

// --- GLOBAL STATE ---
const State = {
    isHost: false,
    peer: null,
    connections: [],
    hostConnection: null,
    myId: null,
    myName: 'Player',
    players: {}, 
    dealer: { hand: [] },
    turnOrder: [],
    turnIndex: 0,
    gameType: null,
    gameState: 'lobby', 
    deck: [],
    db: null,
    SQL: null
};

// --- UI ELEMENTS ---
const UI = {
    lobby: document.getElementById('lobby'),
    hud: document.getElementById('hud'),
    playerName: document.getElementById('player-name'),
    hostId: document.getElementById('host-id'),
    btnHost: document.getElementById('btn-host'),
    btnJoin: document.getElementById('btn-join'),
    roomIdDisplay: document.getElementById('room-id-display'),
    playersList: document.getElementById('players-list'),
    statusText: document.getElementById('status-text'),
    controls: document.getElementById('controls'),
    dbStatus: document.getElementById('db-status'),
    notification: document.getElementById('notification'),
    historyPanel: document.getElementById('history-panel'),
    historyContent: document.getElementById('history-content'),
    historyFilters: document.getElementById('history-filters'),
    historyDate: document.getElementById('history-date'),
    btnViewHistory: document.getElementById('btn-view-history'),
    btnCloseHistory: document.getElementById('btn-close-history'),
    btnExportDb: document.getElementById('btn-export-db'),
    btnImportDb: document.getElementById('btn-import-db'),
    importDbFile: document.getElementById('import-db-file')
};

let notifyTimeout = null;
function showNotification(msg, duration = 3000) {
    if (!UI.notification) return;
    
    if (notifyTimeout) {
        clearTimeout(notifyTimeout);
    }
    
    UI.notification.textContent = msg;
    UI.notification.style.display = 'block';
    
    notifyTimeout = setTimeout(() => { 
        if (UI.notification) UI.notification.style.display = 'none'; 
    }, duration);
}

// --- DATABASE (sql.js) ---
async function initDatabase(existingBuffer = null) {
    if (!State.SQL) {
        // @ts-ignore
        State.SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` });
    }
    if (existingBuffer) {
        State.db = new State.SQL.Database(new Uint8Array(existingBuffer));
        if (UI.dbStatus) UI.dbStatus.textContent = "SQLite: Synced from Host";
    } else {
        State.db = new State.SQL.Database();
        State.db.run(`
            CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT, joined_at INTEGER);
            CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, type TEXT, started_at INTEGER, ended_at INTEGER, status TEXT);
            CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY AUTOINCREMENT, game_id TEXT, player_id TEXT, score_change INTEGER, final_score INTEGER);
            CREATE TABLE IF NOT EXISTS actions (id INTEGER PRIMARY KEY AUTOINCREMENT, game_id TEXT, player_id TEXT, action_type TEXT, details TEXT, timestamp INTEGER);
        `);
        if (UI.dbStatus) UI.dbStatus.textContent = "SQLite: Initialized (Host)";
    }
    updateHistoryUI();
}

/**
 * Merges another SQLite database buffer into the current one.
 * Useful for syncing history between players who have played in different sessions.
 */
async function mergeDatabase(otherBuffer) {
    if (!State.db || !State.SQL) return;
    const otherDb = new State.SQL.Database(new Uint8Array(otherBuffer));
    
    // Helper to merge tables
    const mergeTable = (tableName, pkey) => {
        const rows = otherDb.exec(`SELECT * FROM ${tableName}`);
        if (rows[0]) {
            const columns = rows[0].columns;
            rows[0].values.forEach(row => {
                const placeholders = columns.map(() => '?').join(',');
                State.db.run(`INSERT OR IGNORE INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`, row);
            });
        }
    };

    mergeTable('players', 'id');
    mergeTable('games', 'id');
    mergeTable('scores', 'id');
    mergeTable('actions', 'id');
    
    otherDb.close();
    updateHistoryUI();
}

function dbSavePlayer(id, name) {
    if (!State.isHost || !State.db) return;
    State.db.run("INSERT OR IGNORE INTO players (id, name, joined_at) VALUES (?, ?, ?)", [id, name, Date.now()]);
    State.db.run("UPDATE players SET name = ? WHERE id = ?", [name, id]);
}

function dbLogScore(gameId, playerId, change, final) {
    if (!State.isHost || !State.db) return;
    State.db.run("INSERT INTO scores (game_id, player_id, score_change, final_score) VALUES (?, ?, ?, ?)", 
        [gameId, playerId, change, final]);
}

function dbLogAction(gameId, playerId, actionType, details) {
    if (!State.isHost || !State.db) return;
    State.db.run("INSERT INTO actions (game_id, player_id, action_type, details, timestamp) VALUES (?, ?, ?, ?, ?)", 
        [gameId, playerId, actionType, details, Date.now()]);
}

function exportDatabase() {
    if (!State.db) return;
    const data = State.db.export();
    const blob = new Blob([data], { type: "application/x-sqlite3" });
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = "carded_history.sqlite";
    a.click();
}

if (UI.btnExportDb) UI.btnExportDb.addEventListener('click', exportDatabase);

// --- UI INITIALIZATION ---
if (UI.playerName) {
    const savedName = localStorage.getItem('carded_player_name');
    if (savedName) UI.playerName.value = savedName;
}

if (UI.roomIdDisplay) {
    UI.roomIdDisplay.style.cursor = 'pointer';
    UI.roomIdDisplay.title = 'Click to copy';
    UI.roomIdDisplay.addEventListener('click', () => {
        const roomId = UI.roomIdDisplay.textContent;
        if (roomId && roomId !== '---') {
            navigator.clipboard.writeText(roomId).then(() => {
                showNotification("Room ID copied to clipboard!");
            });
        }
    });
}

// --- NETWORKING (PeerJS) ---
function initNetworking(hostIdToJoin = null) {
    State.myName = UI.playerName.value || 'Player';
    localStorage.setItem('carded_player_name', State.myName);
    
    // Generate a random ID for host, or let PeerJS assign one for client
    const peerId = hostIdToJoin ? null : 'carded-' + Math.random().toString(36).substr(2, 6);
    
    // @ts-ignore
    State.peer = new Peer(peerId, {
        debug: 2
    });

    State.peer.on('open', (id) => {
        State.myId = id;
        UI.lobby.style.display = 'none';
        UI.hud.style.display = 'block';
        
        if (hostIdToJoin) {
            State.isHost = false;
            UI.roomIdDisplay.textContent = hostIdToJoin;
            connectToHost(hostIdToJoin);
        } else {
            State.isHost = true;
            UI.roomIdDisplay.textContent = id;
            UI.btnImportDb.style.display = 'inline-block';
            initDatabase().then(() => {
                addPlayer(id, State.myName);
                buildHostControls();
            });
        }
    });

    if (!hostIdToJoin) {
        // Host listening for connections
        State.peer.on('connection', (conn) => {
            conn.on('open', () => {
                State.connections.push(conn);
                
                // Send initial state & DB to new client
                const dbData = State.db.export();
                conn.send({
                    type: 'INIT_STATE',
                    players: State.players,
                    gameState: State.gameState,
                    gameType: State.gameType,
                    dealer: State.dealer,
                    turnOrder: State.turnOrder,
                    turnIndex: State.turnIndex,
                    pokerState: State.pokerState,
                    dbData: dbData
                });

                conn.on('data', (data) => handleNetworkData(data, conn.peer));
                
                conn.on('close', () => {
                    State.connections = State.connections.filter(c => c !== conn);
                    removePlayer(conn.peer);
                });
            });
        });
    }
}

function connectToHost(hostId) {
    State.hostConnection = State.peer.connect(hostId);
    State.hostConnection.on('open', () => {
        // Send join request
        State.hostConnection.send({
            type: 'JOIN',
            name: State.myName
        });
    });
    State.hostConnection.on('data', (data) => handleNetworkData(data, hostId));
    State.hostConnection.on('close', () => {
        showNotification("Disconnected from host");
        setTimeout(() => location.reload(), 2000);
    });
}

function broadcast(data) {
    if (!State.isHost) return;
    State.connections.forEach(conn => conn.send(data));
}

function sendToHost(data) {
    if (State.isHost) {
        handleNetworkData(data, State.myId);
    } else if (State.hostConnection) {
        State.hostConnection.send(data);
    }
}

function handleNetworkData(data, senderId) {
    if (data.type === 'JOIN' && State.isHost) {
        addPlayer(senderId, data.name);
    } else if (data.type === 'INIT_STATE' && !State.isHost) {
        State.players = data.players;
        State.gameState = data.gameState;
        State.gameType = data.gameType;
        State.needsCameraReset = true;
        if (data.dealer) State.dealer = data.dealer;
        if (data.turnOrder) State.turnOrder = data.turnOrder;
        if (data.turnIndex !== undefined) State.turnIndex = data.turnIndex;
        if (data.pokerState) State.pokerState = data.pokerState;
        initDatabase(data.dbData).then(() => {
            updatePlayersList();
            updateTableGraphics();
        });
    } else if (data.type === 'STATE_UPDATE') {
        Object.assign(State, data.state);
        updatePlayersList();
        updateTableGraphics();
        if (State.isHost) broadcast({ type: 'STATE_UPDATE', state: data.state });
    } else if (data.type === 'PLAYER_JOINED') {
        State.players[data.id] = data.player;
        updatePlayersList();
    } else if (data.type === 'PLAYER_LEFT') {
        delete State.players[data.id];
        updatePlayersList();
    } else if (data.type === 'GAME_ACTION') {
        if (State.isHost) {
            processGameAction(senderId, data.action, data.payload);
        }
    } else if (data.type === 'SYNC_DB' && !State.isHost) {
         initDatabase(data.dbData);
    } else if (data.type === 'NOTIFICATION') {
         showNotification(data.msg);
    }
}

function addPlayer(id, name) {
    State.players[id] = { name: name, balance: 1000, hands: [], currentHandIndex: 0, status: 'waiting' };
    dbSavePlayer(id, name);
    if (State.isHost) {
        broadcast({ type: 'PLAYER_JOINED', id: id, player: State.players[id] });
    }
    updatePlayersList();
    showNotification(`${name} joined`);
}

function removePlayer(id) {
    const name = State.players[id]?.name;
    delete State.players[id];
    if (State.isHost) broadcast({ type: 'PLAYER_LEFT', id: id });
    updatePlayersList();
    if (name) showNotification(`${name} left`);
}

function updatePlayersList() {
    UI.playersList.innerHTML = Object.entries(State.players).map(([id, p]) =>
        `<span>${p.name} ($${p.balance !== undefined ? p.balance : 0})</span>`
    ).join(' | ');

    if (State.isHost && State.gameState === 'lobby') {
        buildHostControls();
    } else if (State.gameState === 'playing' || State.gameState.startsWith('blackjack') || State.gameState.startsWith('poker')) {
        // Both host and clients need client controls when playing
        if (State.isHost) buildHostControls();
        buildClientControls();
    }
}
if (UI.btnHost) UI.btnHost.addEventListener('click', () => initNetworking());
if (UI.btnJoin) UI.btnJoin.addEventListener('click', () => {
    const hostId = UI.hostId.value.trim();
    if (hostId) initNetworking(hostId);
});

// --- GRAPHICS (Three.js & TexGen) ---
let scene, camera, renderer, tableMesh, controls;
let targetCameraPos = null;
let targetCameraLookAt = null;
const cardMeshes = {}; // id -> mesh

function initGraphics() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.fog = new THREE.FogExp2(0x111111, 0.02);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 15);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    
    // Stop auto-camera if user interacts
    controls.addEventListener('start', () => {
        targetCameraPos = null;
        targetCameraLookAt = null;
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 15, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Table
    const tableGeo = new THREE.CylinderGeometry(15, 15, 0.5, 64);
    const tableMat = new THREE.MeshStandardMaterial({ 
        color: 0x115522,
        roughness: 0.8,
        map: createTexGenTableTexture()
    });
    tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.y = -0.25;
    tableMesh.receiveShadow = true;
    scene.add(tableMesh);

    // Edge of table
    const edgeGeo = new THREE.TorusGeometry(15.2, 0.4, 16, 100);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x442211, roughness: 0.5 });
    const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
    edgeMesh.position.y = 0;
    edgeMesh.rotation.x = Math.PI / 2;
    edgeMesh.receiveShadow = true;
    edgeMesh.castShadow = true;
    scene.add(edgeMesh);

    window.addEventListener('resize', onWindowResize);
    animate();
}

const TABLE_SHADER = `
void main() {
    float n1 = noise(vUv * 20.0, 20.0);
    float n2 = noise(vUv * 50.0, 50.0);
    vec3 base = mix(vec3(0.1, 0.4, 0.2), vec3(0.05, 0.2, 0.1), n2 * 0.5);
    base *= (0.5 + 0.5 * n1);
    float dist = distance(vUv, vec2(0.5));
    float vignette = smoothstep(0.8, 0.2, dist);
    gl_FragColor = vec4(base * vignette, 1.0);
}
`;

const CARD_BACK_SHADER = `
void main() {
    vec2 pos = floor(vUv * vec2(16.0, 32.0));
    float pattern = mod(pos.x + pos.y, 2.0);
    vec3 col = mix(vec3(0.8, 0.1, 0.1), vec3(0.9, 0.2, 0.2), pattern);
    float n = noise(vUv * 50.0, 50.0);
    col *= (1.0 - n * 0.2);
    gl_FragColor = vec4(col, 1.0);
}
`;

const CARD_FRONT_SHADER = `
void main() {
    float n = noise(vUv * 100.0, 100.0);
    vec3 col = vec3(0.95, 0.95, 0.9) - (n * 0.05);
    gl_FragColor = vec4(col, 1.0);
}
`;

function createTexGenTableTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);

    if (window.TexGen && TexGen.bakeAsync) {
        TexGen.bakeAsync(TABLE_SHADER, { width: 1024, height: 1024 }).then(url => {
            const img = new Image();
            img.onload = () => {
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                tex.needsUpdate = true;
            };
            img.src = url;
        });
    }

    return tex;
}

function createTexGenCardBack() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 512;
    const tex = new THREE.CanvasTexture(canvas);

    if (window.TexGen && TexGen.bakeAsync) {
        TexGen.bakeAsync(CARD_BACK_SHADER, { width: 256, height: 512 }).then(url => {
            const img = new Image();
            img.onload = () => {
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                tex.needsUpdate = true;
            };
            img.src = url;
        });
    }

    return tex;
}

function createTexGenCardFront(suit, rank) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);

    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, 0, 256, 512);

    const drawText = () => {
        // Draw Suit and Rank via 2D Context for crisp text
        ctx.fillStyle = (suit === '♥' || suit === '♦') ? '#d00' : '#000';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Top left
        ctx.fillText(rank, 40, 60);
        ctx.font = '50px Arial';
        ctx.fillText(suit, 40, 110);

        // Bottom right (inverted)
        ctx.save();
        ctx.translate(256, 512);
        ctx.rotate(Math.PI);
        ctx.font = 'bold 60px Arial';
        ctx.fillText(rank, 40, 60);
        ctx.font = '50px Arial';
        ctx.fillText(suit, 40, 110);
        ctx.restore();

        // Draw center suits based on rank
        const w = 256;
        const h = 512;
        
        if (['J', 'Q', 'K'].includes(rank)) {
            // Face cards get a single big letter/suit in the middle for now
            ctx.font = '120px Arial';
            ctx.fillText(rank, w/2, h/2 - 20);
            ctx.font = '80px Arial';
            ctx.fillText(suit, w/2, h/2 + 60);
        } else if (rank === 'A') {
            ctx.font = '150px Arial';
            ctx.fillText(suit, w/2, h/2);
        } else {
            // Number cards
            const num = parseInt(rank);
            ctx.font = '45px Arial';
            
            // Standard casino pips layout map
            const pips = [];
            
            // Columns
            const cx = w/2;
            const lx = w * 0.3;
            const rx = w * 0.7;
            
            // Rows
            const ty = h * 0.25;
            const tyMid = h * 0.38;
            const my = h * 0.5;
            const byMid = h * 0.62;
            const by = h * 0.75;

            // Generate pip coordinates
            if (num === 1) pips.push({x: cx, y: my, inv: false}); // Actually 'A' handles 1, but just in case
            if (num === 2) { pips.push({x: cx, y: ty, inv: false}, {x: cx, y: by, inv: true}); }
            if (num === 3) { pips.push({x: cx, y: ty, inv: false}, {x: cx, y: my, inv: false}, {x: cx, y: by, inv: true}); }
            if (num === 4) { pips.push({x: lx, y: ty, inv: false}, {x: rx, y: ty, inv: false}, {x: lx, y: by, inv: true}, {x: rx, y: by, inv: true}); }
            if (num === 5) { pips.push({x: lx, y: ty, inv: false}, {x: rx, y: ty, inv: false}, {x: cx, y: my, inv: false}, {x: lx, y: by, inv: true}, {x: rx, y: by, inv: true}); }
            if (num === 6) { pips.push({x: lx, y: ty, inv: false}, {x: rx, y: ty, inv: false}, {x: lx, y: my, inv: false}, {x: rx, y: my, inv: false}, {x: lx, y: by, inv: true}, {x: rx, y: by, inv: true}); }
            if (num === 7) { pips.push({x: lx, y: ty, inv: false}, {x: rx, y: ty, inv: false}, {x: lx, y: my, inv: false}, {x: rx, y: my, inv: false}, {x: lx, y: by, inv: true}, {x: rx, y: by, inv: true}, {x: cx, y: tyMid, inv: false}); }
            if (num === 8) { pips.push({x: lx, y: ty, inv: false}, {x: rx, y: ty, inv: false}, {x: lx, y: my, inv: false}, {x: rx, y: my, inv: false}, {x: lx, y: by, inv: true}, {x: rx, y: by, inv: true}, {x: cx, y: tyMid, inv: false}, {x: cx, y: byMid, inv: true}); }
            if (num === 9) { pips.push({x: lx, y: ty, inv: false}, {x: rx, y: ty, inv: false}, {x: lx, y: tyMid, inv: false}, {x: rx, y: tyMid, inv: false}, {x: lx, y: byMid, inv: true}, {x: rx, y: byMid, inv: true}, {x: lx, y: by, inv: true}, {x: rx, y: by, inv: true}, {x: cx, y: my, inv: false}); }
            if (num === 10) { pips.push({x: lx, y: ty, inv: false}, {x: rx, y: ty, inv: false}, {x: lx, y: tyMid, inv: false}, {x: rx, y: tyMid, inv: false}, {x: lx, y: byMid, inv: true}, {x: rx, y: byMid, inv: true}, {x: lx, y: by, inv: true}, {x: rx, y: by, inv: true}, {x: cx, y: h * 0.32, inv: false}, {x: cx, y: h * 0.68, inv: true}); }

            pips.forEach(pip => {
                ctx.save();
                ctx.translate(pip.x, pip.y);
                if (pip.inv) ctx.rotate(Math.PI);
                ctx.fillText(suit, 0, 0);
                ctx.restore();
            });
        }

        tex.needsUpdate = true;
    };

    if (window.TexGen && TexGen.bakeAsync) {
        TexGen.bakeAsync(CARD_FRONT_SHADER, { width: 256, height: 512 }).then(url => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                drawText();
            };
            img.src = url;
        });
    } else {
        drawText();
    }

    return tex;
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (controls) {
        if (targetCameraPos && targetCameraLookAt) {
            camera.position.lerp(targetCameraPos, 0.05);
            controls.target.lerp(targetCameraLookAt, 0.05);
            // If very close, stop lerping
            if (camera.position.distanceTo(targetCameraPos) < 0.1) {
                targetCameraPos = null;
                targetCameraLookAt = null;
            }
        }
        controls.update();
    }
    
    renderer.render(scene, camera);
}

// --- GAME LOGIC ---
function startGame(type) {
    if (!State.isHost) return;
    State.gameType = type;
    State.needsCameraReset = true;
    
    const gameId = 'G_' + Date.now();
    State.db.run("INSERT INTO games (id, type, started_at, status) VALUES (?, ?, ?, ?)", [gameId, type, Date.now(), 'active']);
    State.currentGameId = gameId;

    if (type === 'poker') {
        State.gameState = 'poker_preflop';
        State.dealer = { hand: [] }; // used for community cards in poker
        State.pokerState = {
            pot: 0,
            currentBet: 0,
            communityCards: [],
            activePlayers: [],
            lastAggressor: null
        };
        
        const pIds = Object.keys(State.players);
        State.turnOrder = pIds;
        State.turnIndex = 0;
        State.pokerState.activePlayers = [...pIds];

        Object.values(State.players).forEach(p => { 
            p.hand = []; 
            p.status = 'playing'; 
            p.bet = 0; // Current round bet
            if (p.balance === undefined) p.balance = 1000;
        });

        initDeck();
        
        // Deal 2 hole cards
        pIds.forEach(id => {
            State.players[id].hand.push(drawCard(), drawCard());
        });
        
        console.log("Poker started");
    } else if (type === 'blackjack') {
        State.gameState = 'blackjack_betting';
        State.dealer = { hand: [] };
        
        // Reset players for betting phase
        Object.values(State.players).forEach(p => { 
            p.hands = []; 
            p.currentHandIndex = 0;
            p.status = 'betting'; 
            p.bet = 0;
            if (p.balance === undefined) p.balance = 1000;
        });
        console.log("Game started, state:", State.gameState);
        
        State.turnOrder = Object.keys(State.players);
        State.turnIndex = 0;
        State.lastNotifiedTurn = null;
    }

    initDeck();
    broadcastState();
}

function initDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    State.deck = [];
    for (let d = 0; d < 4; d++) { // 4 decks
        suits.forEach(s => ranks.forEach(r => State.deck.push({ suit: s, rank: r })));
    }
    // Shuffle
    for (let i = State.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [State.deck[i], State.deck[j]] = [State.deck[j], State.deck[i]];
    }
}

function drawCard() {
    if (State.deck.length === 0) initDeck();
    return State.deck.pop();
}

function processGameAction(playerId, action, payload) {
    if (!State.isHost) return;
    
    if (State.gameType === 'poker') {
        const p = State.players[playerId];
        const ps = State.pokerState;
        
        if (State.gameState.startsWith('poker_') && State.turnOrder[State.turnIndex] === playerId) {
            
            if (action === 'FOLD') {
                p.status = 'folded';
                ps.activePlayers = ps.activePlayers.filter(id => id !== playerId);
                broadcast({ type: 'NOTIFICATION', msg: `${p.name} folds.` });
                dbLogAction(State.currentGameId, playerId, 'FOLD', '');
            } 
            else if (action === 'CALL' || action === 'CHECK') {
                const callAmount = ps.currentBet - p.bet;
                if (callAmount > 0 && p.balance >= callAmount) {
                    p.balance -= callAmount;
                    p.bet += callAmount;
                    ps.pot += callAmount;
                    broadcast({ type: 'NOTIFICATION', msg: `${p.name} calls ${callAmount}.` });
                    dbLogAction(State.currentGameId, playerId, 'CALL', callAmount.toString());
                } else if (callAmount === 0) {
                    broadcast({ type: 'NOTIFICATION', msg: `${p.name} checks.` });
                    dbLogAction(State.currentGameId, playerId, 'CHECK', '');
                }
            }
            else if (action === 'RAISE') {
                const raiseAmount = parseInt(payload.amount);
                const totalToMatch = ps.currentBet - p.bet + raiseAmount;
                if (raiseAmount > 0 && p.balance >= totalToMatch) {
                    p.balance -= totalToMatch;
                    p.bet += totalToMatch;
                    ps.pot += totalToMatch;
                    ps.currentBet += raiseAmount;
                    ps.lastAggressor = playerId;
                    broadcast({ type: 'NOTIFICATION', msg: `${p.name} raises ${raiseAmount}.` });
                    dbLogAction(State.currentGameId, playerId, 'RAISE', raiseAmount.toString());
                }
            }
            
            advancePokerTurn();
            broadcastState();
        }
    } else if (State.gameType === 'blackjack') {
        const p = State.players[playerId];
        
        if (State.gameState === 'blackjack_betting' && action === 'BET') {
            const betAmt = parseInt(payload.amount);
            if (!isNaN(betAmt) && betAmt > 0 && betAmt <= p.balance) {
                p.bet = betAmt;
                p.balance -= betAmt;
                p.status = 'waiting_deal';
                dbLogAction(State.currentGameId, playerId, 'BET', betAmt.toString());
                broadcast({ type: 'NOTIFICATION', msg: `${p.name} bet $${betAmt}` });
                checkBettingEnd();
                broadcastState(); // Broadcast state change so the user's UI updates
            }
        } 
        else if (State.gameState === 'blackjack_playing' && State.turnOrder[State.turnIndex] === playerId) {
            const currentHand = p.hands[p.currentHandIndex];
            
            if (action === 'HIT') {
                const card = drawCard();
                currentHand.cards.push(card);
                dbLogAction(State.currentGameId, playerId, 'HIT', `${card.rank}${card.suit}`);
                broadcast({ type: 'NOTIFICATION', msg: `${p.name} hits and receives ${card.rank}${card.suit}` });
                
                if (calculateBlackjackHand(currentHand.cards) > 21) {
                    currentHand.status = 'bust';
                    broadcast({ type: 'NOTIFICATION', msg: `${p.name} busts!` });
                    advanceTurn();
                }
            } 
            else if (action === 'STAND') {
                currentHand.status = 'stood';
                dbLogAction(State.currentGameId, playerId, 'STAND', '');
                broadcast({ type: 'NOTIFICATION', msg: `${p.name} stands.` });
                advanceTurn();
            }
            else if (action === 'DOUBLE' && currentHand.cards.length === 2 && p.balance >= currentHand.bet) {
                p.balance -= currentHand.bet;
                currentHand.bet *= 2;
                const card = drawCard();
                currentHand.cards.push(card);
                dbLogAction(State.currentGameId, playerId, 'DOUBLE', `${card.rank}${card.suit}`);
                broadcast({ type: 'NOTIFICATION', msg: `${p.name} doubles down and receives ${card.rank}${card.suit}` });
                
                if (calculateBlackjackHand(currentHand.cards) > 21) {
                    currentHand.status = 'bust';
                    broadcast({ type: 'NOTIFICATION', msg: `${p.name} busts!` });
                } else {
                    currentHand.status = 'stood';
                }
                advanceTurn();
            }
            else if (action === 'SPLIT' && currentHand.cards.length === 2 && currentHand.cards[0].rank === currentHand.cards[1].rank && p.balance >= currentHand.bet) {
                p.balance -= currentHand.bet;
                const splitCard = currentHand.cards.pop();
                
                // First hand gets a new card
                currentHand.cards.push(drawCard());
                
                // Create second hand
                p.hands.push({ cards: [splitCard], status: 'playing', bet: currentHand.bet });
                
                // Reset index to ensure we process from first hand
                p.currentHandIndex = 0;
                
                dbLogAction(State.currentGameId, playerId, 'SPLIT', '');
                broadcast({ type: 'NOTIFICATION', msg: `${p.name} splits their hand.` });
            }
            
            broadcastState();
        }
    }
}

function checkBettingEnd() {
    const allBet = Object.values(State.players).every(p => p.status === 'waiting_deal');
    if (allBet) {
        State.gameState = 'blackjack_playing';
        
        // Deal initial cards
        Object.values(State.players).forEach(p => {
            p.hands = [{ cards: [drawCard(), drawCard()], status: 'playing', bet: p.bet }];
            p.status = 'playing';
            
            if (calculateBlackjackHand(p.hands[0].cards) === 21) {
                p.hands[0].status = 'blackjack';
            }
        });
        
        State.dealer.hand = [drawCard(), drawCard()];
        State.turnIndex = 0;
        
        // Skip players with blackjack
        checkCurrentPlayerTurn();
        broadcastState();
    }
}

function checkCurrentPlayerTurn() {
    if (State.turnIndex >= State.turnOrder.length) {
        startDealerTurn();
        return;
    }
    
    const pId = State.turnOrder[State.turnIndex];
    const p = State.players[pId];
    
    // Check if player has any hands still playing
    let hasPlayingHand = false;
    for (let i = 0; i < p.hands.length; i++) {
        if (p.hands[i].status === 'playing') {
            p.currentHandIndex = i;
            hasPlayingHand = true;
            
            // Auto-deal if hand only has 1 card (from split)
            if (p.hands[i].cards.length === 1) {
                p.hands[i].cards.push(drawCard());
                if (calculateBlackjackHand(p.hands[i].cards) === 21) {
                    p.hands[i].status = 'stood'; // Blackjacks after split are usually just 21
                    hasPlayingHand = false; // recheck
                }
            }
            break;
        }
    }
    
    if (!hasPlayingHand) {
        State.turnIndex++;
        checkCurrentPlayerTurn(); // Recursive check for next player
    } else {
        // We found a playing hand, tell the player it's their turn if we haven't just sent this
        if (State.lastNotifiedTurn !== pId) {
            State.lastNotifiedTurn = pId;
            if (State.myId === pId) {
                showNotification("Your Turn to Act!", 3000);
            } else if (State.isHost) {
                State.connections.find(c => c.peer === pId)?.send({ type: 'NOTIFICATION', msg: "Your Turn to Act!" });
            }
        }
    }
}


function advancePokerTurn() {
    const ps = State.pokerState;
    // Mark current player as having acted
    State.players[State.turnOrder[State.turnIndex]].hasActed = true;

    if (ps.activePlayers.length === 1) {
        // Everyone folded, winner!
        endPokerGame(ps.activePlayers[0]);
        return;
    }

    // Move to next active player
    do {
        State.turnIndex = (State.turnIndex + 1) % State.turnOrder.length;
    } while (State.players[State.turnOrder[State.turnIndex]].status !== 'playing');

    // Check if betting round is over
    const allActiveActed = ps.activePlayers.every(id => State.players[id].hasActed);
    const allCalled = ps.activePlayers.every(id => State.players[id].bet === ps.currentBet);
    
    if (allActiveActed && allCalled) {
        advancePokerPhase();
    } else {
        // Still betting
        const pId = State.turnOrder[State.turnIndex];
        if (State.lastNotifiedTurn !== pId) {
            State.lastNotifiedTurn = pId;
            if (State.myId === pId) {
                showNotification("Your Turn!", 3000);
            } else if (State.isHost) {
                State.connections.find(c => c.peer === pId)?.send({ type: 'NOTIFICATION', msg: "Your Turn to Act!" });
            }
        }
    }
}

function advancePokerPhase() {
    const ps = State.pokerState;
    // Reset round bets and acted status
    Object.values(State.players).forEach(p => {
        p.bet = 0;
        p.hasActed = false;
    });
    ps.currentBet = 0;
    ps.lastAggressor = null;
    State.turnIndex = 0;
    // Ensure first active player gets turn
    while (State.players[State.turnOrder[State.turnIndex]].status !== 'playing') {
        State.turnIndex = (State.turnIndex + 1) % State.turnOrder.length;
    }

    if (State.gameState === 'poker_preflop') {
        State.gameState = 'poker_flop';
        ps.communityCards.push(drawCard(), drawCard(), drawCard());
        broadcast({ type: 'NOTIFICATION', msg: "Flop is dealt." });
    } else if (State.gameState === 'poker_flop') {
        State.gameState = 'poker_turn';
        ps.communityCards.push(drawCard());
        broadcast({ type: 'NOTIFICATION', msg: "Turn is dealt." });
    } else if (State.gameState === 'poker_turn') {
        State.gameState = 'poker_river';
        ps.communityCards.push(drawCard());
        broadcast({ type: 'NOTIFICATION', msg: "River is dealt." });
    } else if (State.gameState === 'poker_river') {
        evaluatePokerShowdown();
        return;
    }
    
    // Notify next player
    const pId = State.turnOrder[State.turnIndex];
    State.lastNotifiedTurn = pId;
    if (State.myId === pId) showNotification("Your Turn!", 3000);
}

function endPokerGame(winnerId) {
    State.gameState = 'poker_ended';
    const winName = State.players[winnerId].name;
    const pot = State.pokerState.pot;
    State.players[winnerId].balance += pot;
    broadcast({ type: 'NOTIFICATION', msg: `${winName} wins ${pot}!` });

    // Log scores for history tracking
    Object.keys(State.players).forEach(id => {
        const p = State.players[id];
        // Only tracking simple positive pot gains for history right now, since chips are drawn from balance real-time
        const change = (id === winnerId) ? pot : 0; 
        dbLogScore(State.currentGameId, id, change, p.balance);
    });

    State.db.run("UPDATE games SET ended_at = ?, status = ? WHERE id = ?", [Date.now(), 'completed', State.currentGameId]);
    broadcastState();

    setTimeout(() => { startGame('poker'); }, 5000);
}
function evaluatePokerShowdown() {
    const ps = State.pokerState;
    let bestPlayerId = null;
    let bestHandVal = null;
    
    ps.activePlayers.forEach(id => {
        const hand = evaluatePokerHand(State.players[id].hand, ps.communityCards);
        if (hand) {
            broadcast({ type: 'NOTIFICATION', msg: `${State.players[id].name} has ${hand.rankName}` });
            if (!bestHandVal || hand.tieBreaker > bestHandVal.tieBreaker) {
                bestHandVal = hand;
                bestPlayerId = id;
            }
        }
    });

    if (bestPlayerId) {
        setTimeout(() => endPokerGame(bestPlayerId), 2000);
    } else {
        setTimeout(() => endPokerGame(ps.activePlayers[0]), 2000);
    }
}

function advanceTurn() {
    checkCurrentPlayerTurn();
    if (State.gameState !== 'blackjack_ended') {
        broadcastState();
    }
}

function startDealerTurn() {
    State.gameState = 'blackjack_dealer';
    broadcast({ type: 'NOTIFICATION', msg: "Dealer's turn begins." });
    broadcastState();
    
    // Dealer hits on soft 17 (casino rules vary, let's do stand on all 17s for simplicity)
    setTimeout(() => {
        let dealerScore = calculateBlackjackHand(State.dealer.hand);
        
        const dealerPlayLoop = () => {
            dealerScore = calculateBlackjackHand(State.dealer.hand);
            if (dealerScore < 17) {
                const card = drawCard();
                State.dealer.hand.push(card);
                broadcast({ type: 'NOTIFICATION', msg: `Dealer hits and receives ${card.rank}${card.suit}` });
                broadcastState();
                setTimeout(dealerPlayLoop, 1000);
            } else {
                endBlackjackGame(dealerScore);
            }
        };
        
        dealerPlayLoop();
    }, 1000);
}

function endBlackjackGame(dealerScore) {
    State.gameState = 'blackjack_ended';
    const dealerBust = dealerScore > 21;
    const dealerBlackjack = State.dealer.hand.length === 2 && dealerScore === 21;

    if (dealerBust) {
        broadcast({ type: 'NOTIFICATION', msg: "Dealer Busts!" });
    }

    Object.entries(State.players).forEach(([id, p]) => {
        let totalWin = 0;
        let finalStatus = "";
        
        p.hands.forEach(hand => {
            const score = calculateBlackjackHand(hand.cards);
            let result = 0; // -1 loss, 0 push, 1 win, 1.5 blackjack win
            
            if (hand.status === 'bust') {
                result = -1;
            } else if (hand.status === 'blackjack') {
                if (dealerBlackjack) result = 0;
                else result = 1.5;
            } else { // stood or playing (21)
                if (dealerBlackjack) {
                    result = -1;
                } else if (dealerBust) {
                    result = 1;
                } else if (score > dealerScore) {
                    result = 1;
                } else if (score < dealerScore) {
                    result = -1;
                } else {
                    result = 0; // Push
                }
            }
            
            if (result === 1.5) {
                const payout = hand.bet + (hand.bet * 1.5);
                p.balance += payout;
                totalWin += payout - hand.bet;
                finalStatus = "Blackjack! You Win!";
            } else if (result === 1) {
                const payout = hand.bet * 2;
                p.balance += payout;
                totalWin += hand.bet;
                finalStatus = "You Win!";
            } else if (result === 0) {
                p.balance += hand.bet; // Return bet
                finalStatus = "Push";
            } else {
                totalWin -= hand.bet;
                finalStatus = "You Lose";
            }
            if (hand.status === 'bust') finalStatus = "You Bust";
        });
        
        dbLogScore(State.currentGameId, id, totalWin, p.balance);
        
        // Target individual notifications slightly offset from global dealer bust
        setTimeout(() => {
            if (State.myId === id) {
                 showNotification(finalStatus, 4000);
            } else if (State.isHost) {
                 // Send direct to client
                 State.connections.find(c => c.peer === id)?.send({ type: 'NOTIFICATION', msg: finalStatus });
            }
        }, 1500);
    });
    
    State.db.run("UPDATE games SET ended_at = ?, status = ? WHERE id = ?", [Date.now(), 'completed', State.currentGameId]);
    
    broadcastState();
    
    // Automatically return to betting phase after 5 seconds
    setTimeout(() => {
        startGame('blackjack');
    }, 5000);
}

function calculateBlackjackHand(hand) {
    if (!hand) return 0;
    let score = 0;
    let aces = 0;
    hand.forEach(c => {
        if (['J', 'Q', 'K'].includes(c.rank)) score += 10;
        else if (c.rank === 'A') { score += 11; aces++; }
        else score += parseInt(c.rank);
    });
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
}

function broadcastState() {
    if (!State.isHost) return;
    const stateToSync = {
        players: State.players,
        dealer: State.dealer,
        gameState: State.gameState,
        gameType: State.gameType,
        turnIndex: State.turnIndex,
        turnOrder: State.turnOrder,
        pokerState: State.pokerState,
        deckSize: State.deck.length
    };
    broadcast({ type: 'STATE_UPDATE', state: stateToSync });
    updatePlayersList();
    updateTableGraphics();
}

// --- DYNAMIC UI CONTROLS ---
function buildHostControls() {
    UI.controls.innerHTML = '';
    if (State.gameState === 'lobby') {
        const btnBJ = document.createElement('button');
        btnBJ.textContent = 'Start Blackjack';
        btnBJ.onclick = () => startGame('blackjack');
        UI.controls.appendChild(btnBJ);
        
        const btnPoker = document.createElement('button');
        btnPoker.textContent = 'Start Poker';
        btnPoker.className = 'secondary';
        btnPoker.onclick = () => startGame('poker');
        UI.controls.appendChild(btnPoker);
    } else {
        const btnEnd = document.createElement('button');
        btnEnd.textContent = 'End Game';
        btnEnd.className = 'secondary';
        btnEnd.onclick = () => {
            State.gameState = 'lobby';
            broadcastState();
        };
        UI.controls.appendChild(btnEnd);
        buildClientControls();
    }
}

function buildClientControls() {
    if (State.gameState === 'lobby') {
        if (!State.isHost) UI.controls.innerHTML = '';
        return;
    }
    
    if (State.gameType === 'poker') {
        const p = State.players[State.myId];
        
        // Safely clear old client controls by removing everything that isn't the End Game button
        if (State.isHost) {
            Array.from(UI.controls.children).forEach(child => {
                if (child.textContent !== 'End Game') {
                    child.remove();
                }
            });
        } else {
             UI.controls.innerHTML = '';
        }
        if (!p || p.status !== 'playing') return;
        
        if (State.gameState.startsWith('poker_') && State.turnOrder[State.turnIndex] === State.myId) {
            const ps = State.pokerState;
            const callAmt = ps.currentBet - p.bet;
            
            const btnFold = document.createElement('button');
            btnFold.textContent = 'Fold';
            btnFold.className = 'secondary';
            btnFold.onclick = () => sendToHost({ type: 'GAME_ACTION', action: 'FOLD' });
            UI.controls.appendChild(btnFold);
            
            const btnCheckCall = document.createElement('button');
            btnCheckCall.textContent = callAmt > 0 ? `Call ${callAmt}` : 'Check';
            btnCheckCall.onclick = () => sendToHost({ type: 'GAME_ACTION', action: callAmt > 0 ? 'CALL' : 'CHECK' });
            UI.controls.appendChild(btnCheckCall);
            
            const raiseInput = document.createElement('input');
            raiseInput.type = 'number';
            raiseInput.value = '50';
            raiseInput.style.width = '60px';
            
            const btnRaise = document.createElement('button');
            btnRaise.textContent = 'Raise';
            btnRaise.onclick = () => sendToHost({ type: 'GAME_ACTION', action: 'RAISE', payload: { amount: raiseInput.value } });
            
            UI.controls.appendChild(raiseInput);
            UI.controls.appendChild(btnRaise);
        }
    } else if (State.gameType === 'blackjack') {
        const p = State.players[State.myId];
        
        // Safely clear old client controls by removing everything that isn't the End Game button
        if (State.isHost) {
            Array.from(UI.controls.children).forEach(child => {
                if (child.textContent !== 'End Game') {
                    child.remove();
                }
            });
        } else {
             UI.controls.innerHTML = '';
        }
        
        if (!p) return;
        
        if (State.gameState === 'blackjack_betting' && p.status === 'betting') {
            const betInput = document.createElement('input');
            betInput.type = 'number';
            betInput.value = '100';
            betInput.min = '10';
            betInput.max = p.balance.toString();
            betInput.style.width = '80px';
            
            const btnBet = document.createElement('button');
            btnBet.textContent = 'Place Bet';
            btnBet.onclick = () => sendToHost({ type: 'GAME_ACTION', action: 'BET', payload: { amount: betInput.value }});
            
            UI.controls.appendChild(betInput);
            UI.controls.appendChild(btnBet);
        } 
        else if (State.gameState === 'blackjack_playing' && State.turnOrder[State.turnIndex] === State.myId) {
            const currentHand = p.hands[p.currentHandIndex];
            
            const btnHit = document.createElement('button');
            btnHit.textContent = 'Hit';
            btnHit.onclick = () => sendToHost({ type: 'GAME_ACTION', action: 'HIT' });
            
            const btnStand = document.createElement('button');
            btnStand.textContent = 'Stand';
            btnStand.className = 'secondary';
            btnStand.onclick = () => sendToHost({ type: 'GAME_ACTION', action: 'STAND' });
            
            UI.controls.appendChild(btnHit);
            UI.controls.appendChild(btnStand);
            
            if (currentHand.cards.length === 2 && p.balance >= currentHand.bet) {
                const btnDouble = document.createElement('button');
                btnDouble.textContent = 'Double';
                btnDouble.onclick = () => sendToHost({ type: 'GAME_ACTION', action: 'DOUBLE' });
                UI.controls.appendChild(btnDouble);
                
                if (currentHand.cards[0].rank === currentHand.cards[1].rank) {
                    const btnSplit = document.createElement('button');
                    btnSplit.textContent = 'Split';
                    btnSplit.onclick = () => sendToHost({ type: 'GAME_ACTION', action: 'SPLIT' });
                    UI.controls.appendChild(btnSplit);
                }
            }
        }
    }
}

// --- 3D GRAPHICS UPDATES ---
function getCardFrontTex(suit, rank) {
    if (!window.TexGen) return new THREE.Color(0xffffff);
    const key = suit + rank;
    if (!cardFrontCache[key]) {
        cardFrontCache[key] = createTexGenCardFront(suit, rank);
    }
    return cardFrontCache[key];
}

function updateTableGraphics() {
    if (!cardBackTex && window.TexGen) {
        cardBackTex = createTexGenCardBack();
    }
    
    Object.values(cardMeshes).forEach(mesh => scene.remove(mesh));
    for(let key in cardMeshes) delete cardMeshes[key];

    if (!State.gameState.startsWith('blackjack') && !State.gameState.startsWith('poker') && State.gameState !== 'playing') return;

    let statusStr = `Playing ${State.gameType ? State.gameType.toUpperCase() : 'Game'}`;
    if (State.gameType === 'poker') {
        statusStr += ` (Pot: ${State.pokerState?.pot || 0})`;
        if (State.gameState.startsWith('poker_') && State.gameState !== 'poker_ended') {
             const turnPlayer = State.players[State.turnOrder[State.turnIndex]];
             if (turnPlayer) {
                 statusStr += ` - ${turnPlayer.name}'s Turn`;
                 if (State.turnOrder[State.turnIndex] === State.myId) statusStr += ` (YOUR GO!)`;
             }
        }
    } else if (State.gameType === 'blackjack' && State.gameState === 'blackjack_playing') {
        const turnPlayer = State.players[State.turnOrder[State.turnIndex]];
        if (turnPlayer) {
            statusStr += ` - ${turnPlayer.name}'s Turn`;
            if (State.turnOrder[State.turnIndex] === State.myId) {
                statusStr += ` (YOUR GO!)`;
            }
        }
    } else if (State.gameState === 'blackjack_betting') {
        statusStr += " - Waiting for Bets";
    } else if (State.gameState === 'blackjack_dealer') {
        statusStr += " - Dealer's Turn";
    }
    UI.statusText.textContent = statusStr;

    if (State.gameType === 'blackjack') {
        const playerIds = Object.keys(State.players);
        const spacing = 4;
        const totalWidth = (playerIds.length - 1) * spacing;
        const startX = -totalWidth / 2;

        // Render Dealer
        if (State.dealer && State.dealer.hand) {
            State.dealer.hand.forEach((card, j) => {
                const geo = new THREE.BoxGeometry(2.0, 0.02, 2.93);
                let frontMap = getCardFrontTex(card.suit, card.rank);
                // Hide first card if playing phase
                if (j === 0 && State.gameState === 'blackjack_playing') {
                    frontMap = cardBackTex; 
                }
                const materials = [
                    new THREE.MeshStandardMaterial({color: 0xffffff}),
                    new THREE.MeshStandardMaterial({color: 0xffffff}),
                    new THREE.MeshStandardMaterial({map: frontMap}),
                    new THREE.MeshStandardMaterial({map: cardBackTex}),
                    new THREE.MeshStandardMaterial({color: 0xffffff}),
                    new THREE.MeshStandardMaterial({color: 0xffffff})
                ];
                
                const mesh = new THREE.Mesh(geo, materials);
                mesh.position.x = j * 1.0 - (State.dealer.hand.length * 0.5);
                mesh.position.y = 0.22 + (j * 0.01);
                mesh.position.z = -4; // Top of the table
                // Slightly tilt the dealer's cards forward so they're easier to see from the camera
                mesh.rotation.x = 0.15;
                
                mesh.castShadow = true;
                scene.add(mesh);
                cardMeshes[`dealer_${j}`] = mesh;
            });
        }

        // Render Players
        playerIds.forEach((id, i) => {
            const p = State.players[id];
            const px = startX + (i * spacing);

            if (id === State.myId && State.needsCameraReset) {
                targetCameraPos = new THREE.Vector3(px, 12, 18);
                targetCameraLookAt = new THREE.Vector3(px, 0, 0); // Look towards dealer
                State.needsCameraReset = false;
            }

            // Draw a distinct border/mat under this player's area
            const isMyTurn = (State.gameState === 'blackjack_playing' && State.turnOrder[State.turnIndex] === id);
            const matColor = isMyTurn ? 0x00ff88 : (id === State.myId ? 0x4444ff : 0x444444);
            const matMat = new THREE.MeshStandardMaterial({
                color: matColor,
                roughness: 0.9,
                transparent: true,
                opacity: isMyTurn ? 0.8 : 0.4
            });
            // Render chips
            renderPlayerChips(id, p.balance, px, 7.5);
            
            if (p.hands) {
                // Determine total width needed for the mat based on number of split hands
                const numHands = p.hands.length || 1;
                const matWidth = 3.5 + ((numHands - 1) * 2.0);
                const matGeo = new THREE.BoxGeometry(matWidth, 0.01, 3.5);
                const playerMatMesh = new THREE.Mesh(matGeo, matMat);
                // Center the mat based on how the hands branch out
                playerMatMesh.position.x = px + ((numHands - 1) * 1.0); 
                playerMatMesh.position.y = 0.02; // Flat on the table
                playerMatMesh.position.z = 5;
                playerMatMesh.receiveShadow = true;
                scene.add(playerMatMesh);
                cardMeshes[`mat_${id}`] = playerMatMesh;
                p.hands.forEach((hand, hIdx) => {
                    const hx = px + (hIdx * 2.0); // Offset splits
                    hand.cards.forEach((card, j) => {
                        const geo = new THREE.BoxGeometry(2.0, 0.02, 2.93);
                        const materials = [
                            new THREE.MeshStandardMaterial({color: 0xffffff}),
                            new THREE.MeshStandardMaterial({color: 0xffffff}),
                            new THREE.MeshStandardMaterial({map: getCardFrontTex(card.suit, card.rank)}),
                            new THREE.MeshStandardMaterial({map: cardBackTex}),
                            new THREE.MeshStandardMaterial({color: 0xffffff}),
                            new THREE.MeshStandardMaterial({color: 0xffffff})
                        ];
                        
                        const mesh = new THREE.Mesh(geo, materials);
                        mesh.position.x = hx + (j * 0.5 - hand.cards.length * 0.25);
                        mesh.position.y = 0.15 + (j * 0.01);
                        mesh.position.z = 5; // Bottom of the table
                        mesh.rotation.x = 0.1; // Tilt slightly for readability
                        
                        mesh.castShadow = true;
                        scene.add(mesh);
                        cardMeshes[`${id}_${hIdx}_${j}`] = mesh;
                    });
                });
            }
        });
    } else if (State.gameType === 'poker') {
        const playerIds = Object.keys(State.players);
        const radius = 6;
        
        // Render Community Cards
        if (State.pokerState && State.pokerState.communityCards) {
            State.pokerState.communityCards.forEach((card, j) => {
                const geo = new THREE.BoxGeometry(2.0, 0.02, 2.93);
                const materials = [
                    new THREE.MeshStandardMaterial({color: 0xffffff}),
                    new THREE.MeshStandardMaterial({color: 0xffffff}),
                    new THREE.MeshStandardMaterial({map: getCardFrontTex(card.suit, card.rank)}), 
                    new THREE.MeshStandardMaterial({map: cardBackTex}), 
                    new THREE.MeshStandardMaterial({color: 0xffffff}),
                    new THREE.MeshStandardMaterial({color: 0xffffff})
                ];
                const mesh = new THREE.Mesh(geo, materials);
                mesh.position.x = j * 2.2 - (State.pokerState.communityCards.length * 1.1);
                mesh.position.y = 0.01;
                mesh.position.z = 0; // Center table
                mesh.castShadow = true;
                scene.add(mesh);
                cardMeshes[`comm_${j}`] = mesh;
            });
        }
        
        playerIds.forEach((id, i) => {
            const angle = (i / playerIds.length) * Math.PI * 2;
            const p = State.players[id];
            const hand = p.hand || [];

            if (id === State.myId && State.needsCameraReset) {
                const camDist = 18;
                targetCameraPos = new THREE.Vector3(Math.sin(angle) * camDist, 12, Math.cos(angle) * camDist);
                targetCameraLookAt = new THREE.Vector3(0, 0, 0); // Center of table
                State.needsCameraReset = false;
            }

            // Render chips
            const chipRadius = radius + 2.5;
            renderPlayerChips(id, p.balance, Math.sin(angle) * chipRadius, Math.cos(angle) * chipRadius, angle);

            // Draw mat for poker
            const isMyTurn = (State.gameState.startsWith('poker_') && State.turnOrder[State.turnIndex] === id);
            const matGeo = new THREE.BoxGeometry(4.5, 0.01, 3.5);
            const matColor = isMyTurn ? 0x00ff88 : (id === State.myId ? 0x4444ff : 0x444444);
            const matMat = new THREE.MeshStandardMaterial({
                color: matColor, roughness: 0.9, transparent: true, opacity: isMyTurn ? 0.8 : 0.4
            });
            const playerMatMesh = new THREE.Mesh(matGeo, matMat);
            playerMatMesh.position.x = Math.sin(angle) * radius;
            playerMatMesh.position.y = 0.02;
            playerMatMesh.position.z = Math.cos(angle) * radius;
            playerMatMesh.rotation.y = angle + Math.PI;
            scene.add(playerMatMesh);
            cardMeshes[`mat_${id}`] = playerMatMesh;

            hand.forEach((card, j) => {
                const geo = new THREE.BoxGeometry(2.0, 0.02, 2.93);
                // Hide opponent cards unless it's showdown
                let frontMap = getCardFrontTex(card.suit, card.rank);
                if (id !== State.myId && State.gameState !== 'poker_ended') frontMap = cardBackTex;

                const materials = [
                    new THREE.MeshStandardMaterial({color: 0xffffff}),
                    new THREE.MeshStandardMaterial({color: 0xffffff}),
                    new THREE.MeshStandardMaterial({map: frontMap}), 
                    new THREE.MeshStandardMaterial({map: cardBackTex}), 
                    new THREE.MeshStandardMaterial({color: 0xffffff}),
                    new THREE.MeshStandardMaterial({color: 0xffffff})
                ];
                
                const mesh = new THREE.Mesh(geo, materials);
                
                // Position relative to player angle
                const ox = j * 2.2 - (hand.length * 1.1);
                mesh.position.x = Math.sin(angle) * radius + (Math.cos(angle) * ox);
                mesh.position.y = 0.05 + (j * 0.01);
                mesh.position.z = Math.cos(angle) * radius - (Math.sin(angle) * ox);
                
                mesh.rotation.y = angle + Math.PI;
                if (id !== State.myId && State.gameState !== 'poker_ended') {
                     mesh.rotation.z = Math.PI; // Face down
                }
                
                mesh.castShadow = true;
                scene.add(mesh);
                cardMeshes[`${id}_${j}`] = mesh;
            });
        });
    } else {
        const playerIds = Object.keys(State.players);
        const radius = 6;
        
        playerIds.forEach((id, i) => {
            const angle = (i / playerIds.length) * Math.PI * 2;
            const hand = State.players[id].hand || [];
            
            hand.forEach((card, j) => {
                const geo = new THREE.BoxGeometry(2.0, 0.02, 2.93);
                const materials = [
                    new THREE.MeshStandardMaterial({color: 0xffffff}),
                    new THREE.MeshStandardMaterial({color: 0xffffff}),
                    new THREE.MeshStandardMaterial({map: getCardFrontTex(card.suit, card.rank)}), 
                    new THREE.MeshStandardMaterial({map: cardBackTex}), 
                    new THREE.MeshStandardMaterial({color: 0xffffff}),
                    new THREE.MeshStandardMaterial({color: 0xffffff})
                ];
                
                const mesh = new THREE.Mesh(geo, materials);
                mesh.position.x = Math.sin(angle) * radius + (j * 0.4 - hand.length * 0.2);
                mesh.position.y = 0.01 + (j * 0.01);
                mesh.position.z = Math.cos(angle) * radius;
                mesh.rotation.y = angle + Math.PI;
                
                if (id !== State.myId && State.gameType === 'poker') {
                     mesh.rotation.z = Math.PI; 
                }
                
                mesh.castShadow = true;
                scene.add(mesh);
                cardMeshes[`${id}_${j}`] = mesh;
            });
        });
    }
}

function renderPlayerChips(pId, balance, posX, posZ, angleOffset = 0) {
    if (!balance || balance <= 0) return;
    
    // Simple chip denoms: 100s (Black), 50s (Blue), 10s (Red)
    let b = balance;
    const hundreds = Math.floor(b / 100); b %= 100;
    const fifties = Math.floor(b / 50); b %= 50;
    const tens = Math.floor(b / 10);
    
    const chipGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16);
    
    const stacks = [
        { count: hundreds, color: 0x222222, ox: -0.8 },
        { count: fifties, color: 0x2222ee, ox: 0 },
        { count: tens, color: 0xee2222, ox: 0.8 }
    ];

    stacks.forEach((stack, sIdx) => {
        if (stack.count <= 0) return;
        const mat = new THREE.MeshStandardMaterial({ color: stack.color, roughness: 0.6 });
        
        // Cap visual stacks at 10 chips to avoid giant towers
        const visualCount = Math.min(stack.count, 10); 
        for(let i=0; i<visualCount; i++) {
            const mesh = new THREE.Mesh(chipGeo, mat);
            
            // Rotate the offset if we have an angle (like in poker)
            const sx = posX + (Math.cos(angleOffset) * stack.ox);
            const sz = posZ - (Math.sin(angleOffset) * stack.ox);
            
            mesh.position.x = sx;
            mesh.position.y = 0.025 + (i * 0.05);
            mesh.position.z = sz;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            cardMeshes[`chip_${pId}_${sIdx}_${i}`] = mesh;
        }
    });
}

// --- HISTORY UI ---
let currentHistoryTab = 'scoreboard';

function updateHistoryUI() {
    if (!State.db) return;
    
    UI.btnViewHistory.onclick = () => {
        UI.historyPanel.style.display = 'block';
        if (!UI.historyDate.value) {
            UI.historyDate.valueAsDate = new Date();
        }
        renderHistoryTab(currentHistoryTab);
    };
    
    UI.btnCloseHistory.onclick = () => {
        UI.historyPanel.style.display = 'none';
    };

    document.getElementById('tab-scoreboard').onclick = () => { currentHistoryTab = 'scoreboard'; renderHistoryTab('scoreboard'); };
    document.getElementById('tab-players').onclick = () => { currentHistoryTab = 'players'; renderHistoryTab('players'); };
    document.getElementById('tab-games').onclick = () => { currentHistoryTab = 'games'; renderHistoryTab('games'); };
    
    if (UI.historyDate) {
        UI.historyDate.addEventListener('change', () => renderHistoryTab(currentHistoryTab));
    }
}

function renderHistoryTab(tab) {
    if (!State.db) return;
    let html = '<table>';
    
    // Date filter logic
    let dateFilter = '';
    const dateVal = UI.historyDate ? UI.historyDate.value : '';
    if (dateVal) {
        // SQLite datetime function returns UTC. Date input is local date string YYYY-MM-DD.
        // For simplicity, we filter by comparing date string in local unix epoch
        const startOfDay = new Date(dateVal + 'T00:00:00').getTime();
        const endOfDay = startOfDay + 86400000;
        dateFilter = ` AND timestamp_ms >= ${startOfDay} AND timestamp_ms < ${endOfDay}`;
    }

    if (tab === 'scoreboard') {
        if (UI.historyFilters) UI.historyFilters.style.display = 'block';
        
        let query = `
            SELECT players.name, SUM(scores.score_change) as net_profit, MAX(scores.final_score) as highest_balance
            FROM scores 
            JOIN players ON scores.player_id = players.id
            JOIN games ON scores.game_id = games.id
            WHERE 1=1
        `;
        if (dateVal) {
            const startOfDay = new Date(dateVal + 'T00:00:00').getTime();
            const endOfDay = startOfDay + 86400000;
            query += ` AND games.ended_at >= ${startOfDay} AND games.ended_at < ${endOfDay}`;
        }
        query += ` GROUP BY players.id ORDER BY net_profit DESC`;
        
        const res = State.db.exec(query);
        html += '<tr><th>Player</th><th>Net Profit</th><th>Highest Balance</th></tr>';
        if (res[0]) {
            res[0].values.forEach(row => {
                const profit = row[1] || 0;
                const color = profit >= 0 ? '#0f8' : '#f44';
                html += `<tr>
                    <td>${row[0]}</td>
                    <td style="color:${color};">${profit >= 0 ? '+' : ''}${profit}</td>
                    <td>${row[2] || 0}</td>
                </tr>`;
            });
        } else {
            html += '<tr><td colspan="3">No games played on this date.</td></tr>';
        }

    } else if (tab === 'players') {
        if (UI.historyFilters) UI.historyFilters.style.display = 'none'; // Date filter doesn't apply to total joins usually
        const res = State.db.exec("SELECT name, datetime(joined_at/1000, 'unixepoch', 'localtime') as joined FROM players ORDER BY joined_at DESC");
        html += '<tr><th>Name</th><th>Joined</th></tr>';
        if (res[0]) {
            res[0].values.forEach(row => {
                html += `<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`;
            });
        }
    } else if (tab === 'games') {
        if (UI.historyFilters) UI.historyFilters.style.display = 'block';
        
        let query = `
            SELECT games.type, games.status, 
                   datetime(games.started_at/1000, 'unixepoch', 'localtime') as started,
                   datetime(games.ended_at/1000, 'unixepoch', 'localtime') as ended,
                   GROUP_CONCAT(players.name || ': ' || (CASE WHEN scores.score_change >= 0 THEN '+' ELSE '' END) || scores.score_change, ', ') as results
            FROM games 
            LEFT JOIN scores ON games.id = scores.game_id 
            LEFT JOIN players ON scores.player_id = players.id
            WHERE 1=1
        `;
        if (dateVal) {
            const startOfDay = new Date(dateVal + 'T00:00:00').getTime();
            const endOfDay = startOfDay + 86400000;
            query += ` AND games.started_at >= ${startOfDay} AND games.started_at < ${endOfDay}`;
        }
        query += ` GROUP BY games.id ORDER BY games.started_at DESC`;
        
        const res = State.db.exec(query);
        html += '<tr><th>Game</th><th>Results</th><th>Started</th><th>Ended</th></tr>';
        if (res[0]) {
            res[0].values.forEach(row => {
                const status = row[1] === 'completed' ? `<span style="color:#aaa;">Closed</span>` : `<span style="color:#0f8;">Active</span>`;
                html += `<tr>
                    <td>${(row[0]||'').toUpperCase()}<br>${status}</td>
                    <td style="font-size: 12px; color: #ccc;">${row[4] || 'No scores logged'}</td>
                    <td style="font-size: 12px;">${row[2]}</td>
                    <td style="font-size: 12px;">${row[3] || '---'}</td>
                </tr>`;
            });
        } else {
            html += '<tr><td colspan="4">No games found on this date.</td></tr>';
        }
    }
    html += '</table>';
    UI.historyContent.innerHTML = html;
}

if (UI.btnImportDb) UI.btnImportDb.addEventListener('click', () => UI.importDbFile.click());
if (UI.importDbFile) UI.importDbFile.addEventListener('change', (e) => {
    // @ts-ignore
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function() {
        // @ts-ignore
        const Uints = new Uint8Array(reader.result);
        initDatabase(Uints).then(() => {
            showNotification("Database imported successfully");
            if (State.isHost) {
                const dbData = State.db.export();
                broadcast({ type: 'SYNC_DB', dbData: dbData });
            }
        });
    };
    reader.readAsArrayBuffer(file);
});

// Initialize App
initGraphics();

// Export for testing
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.State = State;
    // @ts-ignore
    window.initDeck = initDeck;
    // @ts-ignore
    window.drawCard = drawCard;
    // @ts-ignore
    window.startGame = startGame;
    // @ts-ignore
    window.calculateBlackjackHand = calculateBlackjackHand;
    // @ts-ignore
    window.mergeDatabase = mergeDatabase;
    // @ts-ignore
    window.addPlayer = addPlayer;
    // @ts-ignore
    window.removePlayer = removePlayer;
}

export { State, initDeck, drawCard, startGame, processGameAction, calculateBlackjackHand, mergeDatabase, addPlayer, removePlayer };
