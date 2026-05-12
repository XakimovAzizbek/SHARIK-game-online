const tg = window.Telegram.WebApp;
tg.expand();
const userName = tg.initDataUnsafe?.user?.first_name || "O'yinchi";

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const aliveDisplay = document.getElementById('alive-count');
const coinDisplay = document.getElementById('coin-count');
const playBtn = document.getElementById('play-btn');
const analogStick = document.getElementById('analog-stick');
const analogContainer = document.getElementById('analog-container');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const MAP_SIZE = 5000;
let gameActive = false;
let players = {}; 
let foods = [];
let coins = [];

// Analog boshqaruvi uchun o'zgaruvchilar
let inputX = 0;
let inputY = 0;
let joystickActive = false;

const peer = new Peer();
let connections = [];

// 1. Ovqatlarni yaratish
function generateResources() {
    foods = [];
    for (let i = 0; i < 400; i++) {
        foods.push({
            x: Math.random() * MAP_SIZE,
            y: Math.random() * MAP_SIZE,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`
        });
    }
}

// 2. O'yinchilar sonini to'g'ri ko'rsatish
function updatePlayerCount() {
    const count = Object.keys(players).length;
    aliveDisplay.innerText = count; // HTML dagi "Players: X/30" qismini to'g'irlaydi
}

// 3. Analog boshqaruvini ishga tushirish (TOUCH EVENTS)
analogContainer.addEventListener('touchstart', (e) => {
    joystickActive = true;
    handleJoystick(e);
});

window.addEventListener('touchmove', (e) => {
    if (joystickActive) handleJoystick(e);
});

window.addEventListener('touchend', () => {
    joystickActive = false;
    inputX = 0;
    inputY = 0;
    analogStick.style.transform = 'translate(-50%, -50%)';
});

function handleJoystick(e) {
    const touch = e.touches[0];
    const rect = analogContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width / 2;

    if (distance > maxDist) {
        dx *= maxDist / distance;
        dy *= maxDist / distance;
    }

    inputX = dx / maxDist;
    inputY = dy / maxDist;
    analogStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

// 4. O'yin animatsiyasi
function animate() {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const myId = peer.id;
    const me = players[myId];

    if (me) {
        // Harakatlanish
        me.x += inputX * 5;
        me.y += inputY * 5;

        // Chegaralar
        me.x = Math.max(0, Math.min(MAP_SIZE, me.x));
        me.y = Math.max(0, Math.min(MAP_SIZE, me.y));

        // Ovqat yeyish mantiqi
        for (let i = foods.length - 1; i >= 0; i--) {
            const f = foods[i];
            const dist = Math.hypot(me.x - f.x, me.y - f.y);
            if (dist < me.radius) {
                me.radius += 0.2;
                foods.splice(i, 1);
                foods.push({ x: Math.random() * MAP_SIZE, y: Math.random() * MAP_SIZE, color: f.color });
            }
        }

        // Ma'lumotni boshqalarga yuborish
        connections.forEach(conn => {
            if (conn.open) conn.send({ type: 'update', data: me });
        });

        const zoom = Math.max(0.4, 1 - (me.radius / 400));

        // 1. Ovqatlarni chizish
        foods.forEach(f => {
            const sx = (f.x - me.x) * zoom + canvas.width / 2;
            const sy = (f.y - me.y) * zoom + canvas.height / 2;
            ctx.beginPath();
            ctx.arc(sx, sy, 5 * zoom, 0, Math.PI * 2);
            ctx.fillStyle = f.color;
            ctx.fill();
        });

        // 2. O'yinchilarni chizish
        Object.values(players).forEach(p => {
            const sx = (p.x - me.x) * zoom + canvas.width / 2;
            const sy = (p.y - me.y) * zoom + canvas.height / 2;
            const sr = p.radius * zoom;

            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Nikni chizish
            ctx.fillStyle = "white";
            ctx.font = `bold ${14 * zoom}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText(p.name, sx, sy - sr - 10);
        });
    }

    requestAnimationFrame(animate);
}

// 5. O'yinni boshlash
playBtn.onclick = () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('controls').style.display = 'flex';
    gameActive = true;
    
    generateResources();
    
    players[peer.id] = {
        id: peer.id,
        x: MAP_SIZE / 2,
        y: MAP_SIZE / 2,
        radius: 35,
        color: '#00d2ff',
        name: userName
    };
    
    updatePlayerCount();
    animate();
};

// PeerJS ulanishlari
peer.on('connection', (conn) => {
    connections.push(conn);
    conn.on('data', (msg) => {
        if (msg.type === 'update') {
            players[msg.data.id] = msg.data;
            updatePlayerCount();
        }
    });
});
