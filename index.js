const tg = window.Telegram.WebApp;
tg.expand(); // Telegram oynasini to'liq ochish

const userName = tg.initDataUnsafe?.user?.first_name || "Guest_" + Math.floor(Math.random() * 1000);
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const aliveDisplay = document.getElementById('alive-count');
const coinDisplay = document.getElementById('coin-count');
const playBtn = document.getElementById('play-btn');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const MAP_SIZE = 5000; 
let gameActive = false;
let players = {}; // Endi obyekt ko'rinishida: {peerId: Sphere}
let foods = [];
let coins = [];

// PEERJS SOZLAMALARI
let peer = new Peer("dexo_arena_room_" + Math.floor(Math.random() * 1000)); // Tasodifiy xona ID
let connections = [];

class Sphere {
    constructor(x, y, radius, color, name, id) {
        this.x = x; this.y = y;
        this.radius = radius;
        this.color = color;
        this.name = name;
        this.id = id;
    }

    draw(cameraX, cameraY, zoom) {
        const screenX = (this.x - cameraX) * zoom + canvas.width / 2;
        const screenY = (this.y - cameraY) * zoom + canvas.height / 2;
        const screenRadius = this.radius * zoom;

        ctx.beginPath();
        ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();

        // NIKNI CHIZISH
        ctx.fillStyle = "white";
        ctx.font = `${14 * zoom}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(this.name, screenX, screenY - screenRadius - 5);
    }
}

// O'YINNI BOSHLASH
playBtn.onclick = () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('controls').style.display = 'flex';
    gameActive = true;
    
    // O'zimizni yaratamiz
    const myId = peer.id;
    players[myId] = new Sphere(Math.random()*MAP_SIZE, Math.random()*MAP_SIZE, 35, '#00d2ff', userName, myId);
    
    startNetwork();
    animate();
};

function startNetwork() {
    // Boshqa o'yinchilar ulanishini kutish
    peer.on('connection', (conn) => {
        connections.push(conn);
        conn.on('data', (data) => {
            // Boshqa o'yinchidan kelgan koordinatalarni yangilash
            players[data.id] = new Sphere(data.x, data.y, data.radius, data.color, data.name, data.id);
        });
    });
}

function animate() {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const myId = peer.id;
    const me = players[myId];

    // Harakat (Sizning mavjud analog kodingizdan inputX/Y ishlatiladi)
    if (me) {
        me.x += (window.inputX || 0) * 5;
        me.y += (window.inputY || 0) * 5;
        
        // Ma'lumotni hammaga yuborish
        connections.forEach(conn => {
            conn.send({
                id: myId, x: me.x, y: me.y, 
                radius: me.radius, color: me.color, name: me.name
            });
        });
    }

    // Hamma o'yinchilarni chizish
    Object.values(players).forEach(p => {
        p.draw(me.x, me.y, 1);
    });

    requestAnimationFrame(animate);
}
