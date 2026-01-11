const canvas = document.getElementById('circuitCanvas');
const ctx = canvas.getContext('2d');
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

let isMobile = window.innerWidth < 768;

// Configuración de rayos
let particles = [];
const particleCount = 5;
const maxJumps = 5;
const flashProbability = 0.02;
const colorPalette = ['#2A63EB', '#4B8AFF', '#00F7FF'];

class LightningParticle {
    constructor() {
        this.reset(true);
        this.velocity = {
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10
        };
    }

    reset(initial = false) {
        this.jumps = 0;
        this.active = true;
        this.path = [];
        this.color = colorPalette[Math.floor(Math.random() * colorPalette.length)];

        if (initial) {
            this.pos = { x: mouse.x, y: mouse.y };
        } else {
            this.pos = {
                x: mouse.x + (Math.random() - 0.5) * 50,
                y: mouse.y + (Math.random() - 0.5) * 50
            };
        }

        this.target = this.calculateNewTarget();
    }

    calculateNewTarget() {
        return {
            x: mouse.x + (Math.random() - 0.5) * 1000,
            y: mouse.y + (Math.random() - 0.5) * 1000
        };
    }

    update() {
        if (!this.active) return;

        // Movimiento en línea recta con desviación aleatoria
        const dx = this.target.x - this.pos.x;
        const dy = this.target.y - this.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5 || this.jumps >= maxJumps) {
            this.active = false;
            this.reset();
            return;
        }

        // Actualizar posición con variaciones eléctricas
        // Velocidad más lenta en celular
        const speedFactor = isMobile ? 0.05 : 0.15;
        this.pos.x += (dx * speedFactor) + (Math.random() - 0.5) * 3;
        this.pos.y += (dy * speedFactor) + (Math.random() - 0.5) * 3;

        // Registrar trayectoria
        this.path.push({ ...this.pos });
        if (this.path.length > 10) this.path.shift();

        // Cambio aleatorio de dirección
        if (Math.random() < 0.3) {
            this.target = this.calculateNewTarget();
            this.jumps++;
        }
    }

    draw() {
        if (!this.active) return;

        ctx.save(); // Guardar estado para aplicar alpha global

        // Ajustes para celular: más tenue y delgado
        if (isMobile) {
            ctx.globalAlpha = 0.4;
            ctx.shadowBlur = 5;
        } else {
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 15;
        }

        // Dibujar línea principal con efecto de brillo
        ctx.shadowColor = this.color;

        for (let i = 1; i < this.path.length; i++) {
            const prev = this.path[i - 1];
            const current = this.path[i];

            // Línea principal
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(current.x, current.y);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = isMobile ? 0.8 : 1.5; // Más delgado en móvil
            ctx.stroke();

            // Efecto de núcleo blanco
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(current.x, current.y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = isMobile ? 0.3 : 0.8; // Más delgado en móvil
            ctx.stroke();
        }

        // Destellos aleatorios (menos intensos en móvil)
        if (Math.random() < flashProbability) {
            this.createFlash();
        }

        ctx.restore(); // Restaurar estado
    }

    createFlash() {
        const intensity = isMobile ? (Math.random() * 0.3 + 0.2) : (Math.random() * 0.5 + 0.5);
        const flashRadius = Math.random() * 15 + 5;

        const gradient = ctx.createRadialGradient(
            this.pos.x, this.pos.y, 0,
            this.pos.x, this.pos.y, flashRadius
        );
        gradient.addColorStop(0, `rgba(74, 138, 255, ${intensity})`);
        gradient.addColorStop(1, 'rgba(74, 138, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(
            this.pos.x - flashRadius,
            this.pos.y - flashRadius,
            flashRadius * 2,
            flashRadius * 2
        );
    }
}

function init() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    isMobile = window.innerWidth < 768;

    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(new LightningParticle());
    }
}

function animate() {
    // Fondo con efecto de persistencia
    ctx.fillStyle = '#1b1a1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    requestAnimationFrame(animate);
}

// Event listeners
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener('resize', init);

init();
animate();