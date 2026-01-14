const cursorCanvas = document.getElementById('cursorCanvas');
const cCtx = cursorCanvas.getContext('2d');

let cWidth = window.innerWidth;
let cHeight = window.innerHeight;

cursorCanvas.width = cWidth;
cursorCanvas.height = cHeight;

// Mouse track
const mouseState = {
    x: cWidth / 2,
    y: cHeight / 2,
    vx: 0,
    vy: 0
};

// Smoothed position (Lag)
const cursor = {
    x: cWidth / 2,
    y: cHeight / 2
};

// Animation state
const config = {
    radius: 20, // Radius of the rotating structure
    baseRotSpeed: 0.05,
    maxRotSpeed: 0.5,
    rotSpeed: 0.05,
    angle: 0,
    phaseColor: '#00FF88', // Green
    arcColor: '#2A63EB',   // Electric Blue
    smoothing: 0.15,       // Easing factor (0.1 - 0.2 is good)
};

let lastTime = 0;
let isCursorMobile = window.innerWidth < 768;

function initCursor() {
    cWidth = window.innerWidth;
    cHeight = window.innerHeight;
    cursorCanvas.width = cWidth;
    cursorCanvas.height = cHeight;
    isCursorMobile = window.innerWidth < 768;
}

window.addEventListener('resize', initCursor);

window.addEventListener('mousemove', (e) => {
    mouseState.x = e.clientX;
    mouseState.y = e.clientY;
});

// Calculate velocity to influence rotation speed
function updatePhysics() {
    // Easing for position
    const dx = mouseState.x - cursor.x;
    const dy = mouseState.y - cursor.y;

    cursor.x += dx * config.smoothing;
    cursor.y += dy * config.smoothing;

    // Estimate velocity based on distance
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Map distance/speed to rotation speed
    // If fast, spin fast. If slow, spin base speed.
    const targetRotSpeed = config.baseRotSpeed + Math.min(dist * 0.01, config.maxRotSpeed);

    // Smooth the rotation speed transition
    config.rotSpeed += (targetRotSpeed - config.rotSpeed) * 0.1;

    config.angle += config.rotSpeed;
}

function drawCursor() {
    cCtx.clearRect(0, 0, cWidth, cHeight);

    if (isCursorMobile) return; // Disable on mobile for performance/usability

    updatePhysics();

    const phases = 3;
    const angleStep = (Math.PI * 2) / phases;

    cCtx.save();
    cCtx.translate(cursor.x, cursor.y);
    cCtx.rotate(config.angle); // Rotate the whole system

    // Draw connecting lines (Delta connection - Triangle)
    cCtx.beginPath();
    for (let i = 0; i < phases; i++) {
        const theta = i * angleStep;
        const x = Math.cos(theta) * config.radius;
        const y = Math.sin(theta) * config.radius;

        if (i === 0) cCtx.moveTo(x, y);
        else cCtx.lineTo(x, y);
    }
    cCtx.closePath();
    cCtx.strokeStyle = config.arcColor;
    cCtx.lineWidth = 1.5;
    cCtx.shadowColor = config.arcColor;
    cCtx.shadowBlur = 5;
    cCtx.stroke();

    // Draw Nodes (Phases)
    for (let i = 0; i < phases; i++) {
        const theta = i * angleStep;
        const x = Math.cos(theta) * config.radius;
        const y = Math.sin(theta) * config.radius;

        cCtx.beginPath();
        cCtx.arc(x, y, 3, 0, Math.PI * 2);
        cCtx.fillStyle = config.phaseColor;
        cCtx.shadowColor = config.phaseColor;
        cCtx.shadowBlur = 8;
        cCtx.fill();

        // Inner white core
        cCtx.beginPath();
        cCtx.arc(x, y, 1.5, 0, Math.PI * 2);
        cCtx.fillStyle = '#fff';
        cCtx.fill();
    }

    // Optional: Center Arc/Nucleus
    cCtx.beginPath();
    cCtx.arc(0, 0, 5, 0, Math.PI * 2);
    cCtx.fillStyle = 'rgba(42, 99, 235, 0.5)'; // Faint blue center
    cCtx.fill();

    cCtx.restore();

    requestAnimationFrame(drawCursor);
}

// Start animation
drawCursor();
