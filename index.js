const tg = window.Telegram.WebApp;
tg.expand();
const userName = tg.initDataUnsafe?.user?.first_name || "O'yinchi";

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const aliveDisplay = document.getElementById('alive-count');
const playBtn = document.getElementById('play-btn');
const analogStick = document.getElementById('analog-stick');
const analogContainer = document.getElementById('analog-container');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const MAP_SIZE = 5000;
let gameActive = false;
let players = {}; 
let foods = [];
let inputX = 0, inputY = 0;
let joystickActive = false;

const peer = new Peer(); 
let connections = [];

// 1. Ovqatlarni yaratish (Faqat bir marta)
function generateResources() {
    foods = [];
    for (let i = 0; i < 400; i++) {
        foods.push({
            x: Math.random() * MAP_SIZE,
            y: Math.random() * MAP_SIZE,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            r: 6
        });
    }
}

// 2. Analog boshqaruvi (To'liq ishlashi uchun)
analogContainer.addEventListener('touchstart', (e) => {
    joystickActive = true;
    handleJoystick(e);
}, {passive: false});

window.addEventListener('touchmove', (e) => {
    if (joystickActive) handleJoystick(e);
}, {passive: false});

window.addEventListener('touchend', () => {
    joystickActive = false;
    inputX = 0; inputY = 0;
    analogStick.style.transform = 'translate(-50%, -50%)';
});

function handleJoystick(e) {
    const touch = e.touches[0];
    const rect = analogContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.min(Math.sqrt(dx*dx + dy*dy), rect.width / 2);
    const angle = Math.atan2(dy, dx);
    inputX = Math.cos(angle) * (dist / (rect.width / 2));
    inputY = Math.sin(angle) * (dist / (rect.width / 2));
    analogStick.style.transform = `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px))`;
}

// 3. Tarmoq mantiqi
peer.on('open', (id) => {
    console.log("ID:", id);
});

peer.on('connection', (conn) => {
    connections.push(conn);
    conn.on('data', (data) => {
        players[data.id] = data;
        aliveDisplay.innerText = Object.keys(players).length; // Sonini yangilash
    });
});

// 4. Asosiy o'yin sikli
function animate() {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const me = players[peer.id];
    if (me) {
        // Harakat
        me.x += inputX * 6;
        me.y += inputY * 6;
        me.x = Math.max(me.radius, Math.min(MAP_SIZE - me.radius, me.x));
        me.y = Math.max(me.radius, Math.min(MAP_SIZE - me.radius, me.y));

        // OVQAT YEYISH (Collision Detection)
        for (let i = foods.length - 1; i >= 0; i--) {
            const f = foods[i];
            const dist = Math.hypot(me.x - f.x, me.y - f.y);
            if (dist < me.radius) {
                me.radius += 0.4; // Kattalashish
                foods.splice(i, 1); // Ovqatni o'chirish
                foods.push({ x: Math.random() * MAP_SIZE, y: Math.random() * MAP_SIZE, color: f.color, r: 6 });
            }
        }

        // Ma'lumot yuborish
        connections.forEach(c => { if(c.open) c.send(me); });

        const zoom = Math.max(0.3, 0.8 - (me.radius / 1000));

        // Ovqatlarni chizish
        foods.forEach(f => {
            ctx.beginPath();
            ctx.arc((f.x - me.x) * zoom + canvas.width/2, (f.y - me.y) * zoom + canvas.height/2, f.r * zoom, 0, Math.PI*2);
            ctx.fillStyle = f.color; ctx.fill();
        });

        // O'yinchilarni chizish
        Object.values(players).forEach(p => {
            const sx = (p.x - me.x) * zoom + canvas.width/2;
            const sy = (p.y - me.y) * zoom + canvas.height/2;
            const sr = p.radius * zoom;

            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI*2);
            ctx.fillStyle = p.color; ctx.fill();
            ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();

            ctx.fillStyle = "white";
            ctx.font = `bold ${14 * zoom}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText(p.name, sx, sy - sr - 10);
        });
    }
    requestAnimationFrame(animate);
}

playBtn.onclick = () => {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('controls').style.display = 'flex';
    generateResources();
    players[peer.id] = { id: peer.id, x: MAP_SIZE/2, y: MAP_SIZE/2, radius: 35, color: '#00d2ff', name: userName };
    aliveDisplay.innerText = "1";
    gameActive = true;
    animate();
};
