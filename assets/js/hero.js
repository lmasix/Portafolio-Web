/*
 * Solarpunk technological background canvas animation (ES Module)
 * Pre-renders static scene to an offscreen buffer and animates lightweight elements at native 60 FPS
 */

const CLOUD_COUNT = 5;
const LEAF_COUNT = 10;
const POLLEN_COUNT = 16;
const FIREFLY_COUNT = 22;
const PULSE_COUNT = 9;

// Pre-defined base color constants to avoid per-frame string allocations
const COLOR_WHITE = '#ffffff';
const COLOR_LEAF_A = '#2d7a4f';
const COLOR_LEAF_B = '#4ba36b';
const COLOR_POLLEN = '#d6a234';
const COLOR_DAY_WATER_GLINT = '#e4f4fc';
const COLOR_DAY_BLADE = '#f6faf6';
const COLOR_DAY_HUB = '#2d7a4f';
const COLOR_DAY_PULSE_A = '#4ba36b';
const COLOR_DAY_PULSE_B = '#1d7898';

const COLOR_NIGHT_BLADE = '#5e8886';
const COLOR_NIGHT_HUB = '#ff9a3c';
const COLOR_NIGHT_BEACON = '#ffb85c';
const COLOR_NIGHT_PULSE_A = '#ff9a3c';
const COLOR_NIGHT_PULSE_B = '#ffb85c';
const COLOR_FIREFLY_GLOW = '#ff9a3c';
const COLOR_FIREFLY_CORE = '#ffd8a8';
const COLOR_NIGHT_WATER_GLINT = '#ff9a3c';
const COLOR_NIGHT_WATER_AMBER = '#ffb85c';

function isNightTheme() {
    return document.documentElement.getAttribute('data-theme') === 'night';
}

function createClouds(width, height) {
    const clouds = [];
    for (let i = 0; i < CLOUD_COUNT; i++) {
        clouds.push({
            x: (width / CLOUD_COUNT) * i + Math.random() * 120,
            y: height * (0.1 + Math.random() * 0.22),
            scale: 0.72 + Math.random() * 0.6,
            speed: 0.22 + Math.random() * 0.24,
            alpha: 0.38 + Math.random() * 0.22
        });
    }
    return clouds;
}

function createLeaves(width, height, count) {
    const leaves = [];
    for (let i = 0; i < count; i++) {
        leaves.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: 4.5 + Math.random() * 4.5,
            vx: 0.55 + Math.random() * 0.55,
            vy: 0.24 + Math.random() * 0.35,
            phase: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.035,
            angle: Math.random() * Math.PI * 2,
            color: i % 2 === 0 ? COLOR_LEAF_A : COLOR_LEAF_B,
            alpha: 0.34 + (i % 2) * 0.06
        });
    }
    return leaves;
}

function createPollen(width, height, count) {
    const pollen = [];
    for (let i = 0; i < count; i++) {
        pollen.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: 1.4 + Math.random() * 1.7,
            vx: (Math.random() - 0.35) * 0.4,
            vy: -0.14 - Math.random() * 0.25,
            phase: Math.random() * Math.PI * 2,
            alpha: 0.28 + Math.random() * 0.32
        });
    }
    return pollen;
}

function createFireflies(width, height, count) {
    const fireflies = [];
    for (let i = 0; i < count; i++) {
        fireflies.push({
            x: Math.random() * width,
            y: height * (0.38 + Math.random() * 0.55),
            r: 1.6 + Math.random() * 1.6,
            vx: (Math.random() - 0.5) * 0.45,
            vy: (Math.random() - 0.5) * 0.32,
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: 1.6 + Math.random() * 2.0
        });
    }
    return fireflies;
}

function createStars(width, height, count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height * 0.62,
            r: 0.7 + Math.random() * 1.3,
            alpha: 0.22 + Math.random() * 0.5
        });
    }
    return stars;
}

function createPulses(spanCount) {
    const pulses = [];
    if (spanCount <= 0) return pulses;
    for (let i = 0; i < PULSE_COUNT; i++) {
        pulses.push({
            spanIdx: i % spanCount,
            t: Math.random(),
            speed: 0.22 + (i % 3) * 0.08,
            dir: i % 2 === 0 ? 1 : -1,
            alt: i % 2 === 1
        });
    }
    return pulses;
}

export function initCircuitCanvas(canvasId = 'circuitCanvas') {
    const canvas = document.getElementById(canvasId) || document.getElementById('heroCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bgBuffer = document.createElement('canvas');
    const bgCtx = bgBuffer.getContext('2d');
    if (!bgCtx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let isMobile = width < 768;
    let isNight = isNightTheme();

    let rafId = null;
    let resizeRaf = null;
    let lastFrameTime = 0;
    let time = 0;

    let clouds = [];
    let leaves = [];
    let pollen = [];
    let fireflies = [];
    let stars = [];
    let turbines = [];
    let catenaries = [];
    let pulses = [];

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const drawSkyAndCelestial = (targetCtx) => {
        const skyGrad = targetCtx.createLinearGradient(0, 0, 0, height);
        if (isNight) {
            skyGrad.addColorStop(0, '#061117');
            skyGrad.addColorStop(0.55, '#0b1e26');
            skyGrad.addColorStop(1, '#102826');
        } else {
            skyGrad.addColorStop(0, '#cbe7f7');
            skyGrad.addColorStop(0.52, '#e4f4fc');
            skyGrad.addColorStop(1, '#eef7f0');
        }
        targetCtx.fillStyle = skyGrad;
        targetCtx.fillRect(0, 0, width, height);

        const bodyX = width * 0.82;
        const bodyY = height * 0.18;

        if (isNight) {
            // Subtle stars
            targetCtx.fillStyle = '#dcefe5';
            for (const s of stars) {
                targetCtx.globalAlpha = s.alpha;
                targetCtx.beginPath();
                targetCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                targetCtx.fill();
            }
            targetCtx.globalAlpha = 1;

            // Luminous moon with warm halo and soft craters
            const haloR = Math.max(width, height) * 0.22;
            const moonHalo = targetCtx.createRadialGradient(bodyX, bodyY, 10, bodyX, bodyY, haloR);
            moonHalo.addColorStop(0, 'rgba(255, 214, 158, 0.36)');
            moonHalo.addColorStop(0.35, 'rgba(255, 184, 92, 0.12)');
            moonHalo.addColorStop(1, 'rgba(255, 184, 92, 0)');
            targetCtx.fillStyle = moonHalo;
            targetCtx.fillRect(0, 0, width, height);

            const moonR = isMobile ? 24 : 32;
            const moonDisc = targetCtx.createRadialGradient(
                bodyX - moonR * 0.25,
                bodyY - moonR * 0.25,
                moonR * 0.1,
                bodyX,
                bodyY,
                moonR
            );
            moonDisc.addColorStop(0, '#fff7e6');
            moonDisc.addColorStop(0.7, '#f2dfbd');
            moonDisc.addColorStop(1, '#d8be94');

            targetCtx.fillStyle = moonDisc;
            targetCtx.beginPath();
            targetCtx.arc(bodyX, bodyY, moonR, 0, Math.PI * 2);
            targetCtx.fill();

            // Soft lunar craters
            targetCtx.fillStyle = 'rgba(130, 112, 88, 0.22)';
            targetCtx.beginPath();
            targetCtx.arc(bodyX - moonR * 0.28, bodyY - moonR * 0.14, moonR * 0.18, 0, Math.PI * 2);
            targetCtx.arc(bodyX + moonR * 0.26, bodyY + moonR * 0.22, moonR * 0.14, 0, Math.PI * 2);
            targetCtx.arc(bodyX + moonR * 0.08, bodyY - moonR * 0.32, moonR * 0.1, 0, Math.PI * 2);
            targetCtx.fill();
        } else {
            // Warm daytime sun glow and disc
            const sunRadius = Math.max(width, height) * 0.38;
            const sunGrad = targetCtx.createRadialGradient(bodyX, bodyY, 12, bodyX, bodyY, sunRadius);
            sunGrad.addColorStop(0, 'rgba(255, 244, 198, 0.78)');
            sunGrad.addColorStop(0.32, 'rgba(255, 236, 179, 0.3)');
            sunGrad.addColorStop(1, 'rgba(255, 236, 179, 0)');
            targetCtx.fillStyle = sunGrad;
            targetCtx.fillRect(0, 0, width, height);

            const sunCoreR = isMobile ? 22 : 30;
            targetCtx.fillStyle = 'rgba(255, 248, 214, 0.85)';
            targetCtx.beginPath();
            targetCtx.arc(bodyX, bodyY, sunCoreR, 0, Math.PI * 2);
            targetCtx.fill();
        }
    };

    const drawBioTower = (targetCtx, cx, baseY, towerW, towerH) => {
        const topY = baseY - towerH;
        const halfBase = towerW * 0.5;
        const halfTop = towerW * 0.22;

        // Curved bio-climatic tower silhouette
        targetCtx.fillStyle = isNight ? '#10282a' : 'rgba(218, 238, 232, 0.72)';
        targetCtx.strokeStyle = isNight ? 'rgba(255, 154, 60, 0.35)' : 'rgba(29, 120, 152, 0.35)';
        targetCtx.lineWidth = 1.4;

        targetCtx.beginPath();
        targetCtx.moveTo(cx - halfBase, baseY);
        targetCtx.quadraticCurveTo(cx - halfBase * 0.85, baseY - towerH * 0.55, cx - halfTop, topY);
        targetCtx.quadraticCurveTo(cx, topY - towerH * 0.08, cx + halfTop, topY);
        targetCtx.quadraticCurveTo(cx + halfBase * 0.85, baseY - towerH * 0.55, cx + halfBase, baseY);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.stroke();

        // Vertical garden terrace bands and night illuminated rings/windows
        const tiers = 5;
        for (let i = 1; i <= tiers; i++) {
            const frac = i / (tiers + 1);
            const ty = baseY - towerH * frac;
            const halfSpan = halfBase * (1 - frac * 0.52);

            // Greenery band
            targetCtx.strokeStyle = isNight ? 'rgba(74, 214, 136, 0.35)' : 'rgba(45, 122, 79, 0.45)';
            targetCtx.lineWidth = 3;
            targetCtx.beginPath();
            targetCtx.moveTo(cx - halfSpan * 0.9, ty);
            targetCtx.quadraticCurveTo(cx, ty + 4, cx + halfSpan * 0.9, ty);
            targetCtx.stroke();

            if (isNight) {
                // Warm orange lit ring and window segments
                targetCtx.strokeStyle = '#ff9a3c';
                targetCtx.globalAlpha = 0.65;
                targetCtx.lineWidth = 1.4;
                targetCtx.beginPath();
                targetCtx.moveTo(cx - halfSpan * 0.78, ty - 5);
                targetCtx.lineTo(cx + halfSpan * 0.78, ty - 5);
                targetCtx.stroke();

                targetCtx.fillStyle = '#ffb85c';
                targetCtx.globalAlpha = 0.85;
                for (let wx = -2; wx <= 2; wx++) {
                    const winX = cx + wx * (halfSpan * 0.28);
                    targetCtx.fillRect(winX - 2, ty - 11, 4, 4);
                }
                targetCtx.globalAlpha = 1;
            }
        }
    };

    const drawGeodesicDome = (targetCtx, cx, baseY, radius) => {
        if (isNight) {
            // Warm illuminated interior glow
            const domeGlow = targetCtx.createRadialGradient(cx, baseY - radius * 0.28, 4, cx, baseY - radius * 0.2, radius * 1.1);
            domeGlow.addColorStop(0, 'rgba(255, 184, 92, 0.62)');
            domeGlow.addColorStop(0.55, 'rgba(255, 154, 60, 0.24)');
            domeGlow.addColorStop(1, 'rgba(255, 154, 60, 0)');
            targetCtx.fillStyle = domeGlow;
            targetCtx.beginPath();
            targetCtx.arc(cx, baseY, radius * 1.15, Math.PI, 0);
            targetCtx.closePath();
            targetCtx.fill();
        }

        // Translucent dome shell
        targetCtx.fillStyle = isNight ? 'rgba(255, 154, 60, 0.14)' : 'rgba(228, 246, 250, 0.56)';
        targetCtx.strokeStyle = isNight ? 'rgba(255, 184, 92, 0.55)' : 'rgba(29, 120, 152, 0.42)';
        targetCtx.lineWidth = 1.4;
        targetCtx.beginPath();
        targetCtx.arc(cx, baseY, radius, Math.PI, 0);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.stroke();

        // Geodesic lattice struts
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.arc(cx, baseY, radius, Math.PI, 0);
        targetCtx.closePath();
        targetCtx.clip();

        targetCtx.strokeStyle = isNight ? 'rgba(255, 184, 92, 0.34)' : 'rgba(45, 122, 79, 0.28)';
        targetCtx.lineWidth = 1;

        const ribs = 6;
        for (let i = 1; i < ribs; i++) {
            const angle = Math.PI + (Math.PI * i) / ribs;
            const rx = cx + Math.cos(angle) * radius;
            const ry = baseY + Math.sin(angle) * radius;
            targetCtx.beginPath();
            targetCtx.moveTo(cx, baseY - radius);
            targetCtx.lineTo(rx, ry);
            targetCtx.moveTo(cx - radius, baseY - radius * 0.35);
            targetCtx.lineTo(cx + radius, baseY - radius * 0.35);
            targetCtx.stroke();
        }

        // Cross-arc rings
        targetCtx.beginPath();
        targetCtx.ellipse(cx, baseY, radius * 0.55, radius, 0, Math.PI, 0);
        targetCtx.stroke();
        targetCtx.beginPath();
        targetCtx.moveTo(cx - radius, baseY - radius * 0.65);
        targetCtx.lineTo(cx + radius, baseY - radius * 0.65);
        targetCtx.stroke();

        targetCtx.restore();
    };

    const drawSolarArch = (targetCtx, cx, baseY, spanW, archH) => {
        const halfSpan = spanW * 0.5;
        targetCtx.save();
        targetCtx.strokeStyle = isNight ? 'rgba(255, 154, 60, 0.5)' : 'rgba(29, 120, 152, 0.48)';
        targetCtx.lineWidth = 3;
        targetCtx.beginPath();
        targetCtx.moveTo(cx - halfSpan, baseY);
        targetCtx.quadraticCurveTo(cx, baseY - archH * 1.4, cx + halfSpan, baseY);
        targetCtx.stroke();

        targetCtx.strokeStyle = isNight ? 'rgba(74, 214, 136, 0.35)' : 'rgba(75, 163, 107, 0.45)';
        targetCtx.lineWidth = 1.4;
        targetCtx.beginPath();
        targetCtx.moveTo(cx - halfSpan * 0.85, baseY);
        targetCtx.quadraticCurveTo(cx, baseY - archH * 1.15, cx + halfSpan * 0.85, baseY);
        targetCtx.stroke();
        targetCtx.restore();
    };

    const drawSolarFarm = (targetCtx, startX, baseY, panelCount, panelW, panelH) => {
        const gap = panelW * 1.38;
        for (let i = 0; i < panelCount; i++) {
            const px = startX + i * gap;
            const py = baseY - (i % 2) * 3;

            // Support post
            targetCtx.strokeStyle = isNight ? 'rgba(130, 165, 160, 0.45)' : 'rgba(70, 101, 86, 0.5)';
            targetCtx.lineWidth = 1.5;
            targetCtx.beginPath();
            targetCtx.moveTo(px + panelW * 0.5, py);
            targetCtx.lineTo(px + panelW * 0.5, py + 12);
            targetCtx.stroke();

            // Tilted photovoltaic panel parallelogram
            targetCtx.fillStyle = isNight ? '#122936' : '#1b5d78';
            targetCtx.strokeStyle = isNight ? 'rgba(255, 154, 60, 0.55)' : 'rgba(180, 232, 240, 0.65)';
            targetCtx.lineWidth = 1;
            targetCtx.beginPath();
            targetCtx.moveTo(px, py);
            targetCtx.lineTo(px + panelW, py - panelH * 0.45);
            targetCtx.lineTo(px + panelW + 6, py - panelH * 0.45 + panelH);
            targetCtx.lineTo(px + 6, py + panelH);
            targetCtx.closePath();
            targetCtx.fill();
            targetCtx.stroke();

            // Specular highlight across panel
            targetCtx.strokeStyle = isNight ? 'rgba(255, 184, 92, 0.4)' : 'rgba(120, 224, 198, 0.45)';
            targetCtx.beginPath();
            targetCtx.moveTo(px + 3, py + panelH * 0.45);
            targetCtx.lineTo(px + panelW + 2, py + panelH * 0.05);
            targetCtx.stroke();
        }
    };

    const drawTrees = (targetCtx, points) => {
        for (const [tx, ty, tr] of points) {
            if (isNight) {
                // Warm orange halo projected onto foliage from path lights
                const treeHalo = targetCtx.createRadialGradient(tx, ty + tr * 0.3, 1, tx, ty, tr * 1.9);
                treeHalo.addColorStop(0, 'rgba(255, 154, 60, 0.28)');
                treeHalo.addColorStop(1, 'rgba(255, 154, 60, 0)');
                targetCtx.fillStyle = treeHalo;
                targetCtx.beginPath();
                targetCtx.arc(tx, ty, tr * 1.9, 0, Math.PI * 2);
                targetCtx.fill();
            }

            targetCtx.fillStyle = isNight ? '#113328' : 'rgba(45, 122, 79, 0.55)';
            targetCtx.beginPath();
            targetCtx.arc(tx, ty, tr, 0, Math.PI * 2);
            targetCtx.arc(tx - tr * 0.55, ty + tr * 0.25, tr * 0.7, 0, Math.PI * 2);
            targetCtx.arc(tx + tr * 0.55, ty + tr * 0.25, tr * 0.7, 0, Math.PI * 2);
            targetCtx.fill();
        }
    };

    const drawOrangeLightPool = (targetCtx, cx, cy, radius, intensity = 0.26) => {
        const grad = targetCtx.createRadialGradient(cx, cy, 2, cx, cy, radius);
        grad.addColorStop(0, `rgba(255, 184, 92, ${intensity})`);
        grad.addColorStop(0.5, `rgba(255, 154, 60, ${intensity * 0.45})`);
        grad.addColorStop(1, 'rgba(255, 154, 60, 0)');
        targetCtx.fillStyle = grad;
        targetCtx.beginPath();
        targetCtx.arc(cx, cy, radius, 0, Math.PI * 2);
        targetCtx.fill();
    };

    const renderBackgroundBuffer = () => {
        bgBuffer.width = Math.round(width * dpr);
        bgBuffer.height = Math.round(height * dpr);
        bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        drawSkyAndCelestial(bgCtx);

        const baseY = height;
        const horizonY = baseY * 0.83;

        // Distant hill ridge
        bgCtx.fillStyle = isNight ? '#0a201f' : 'rgba(75, 163, 107, 0.18)';
        bgCtx.beginPath();
        bgCtx.moveTo(0, baseY);
        bgCtx.lineTo(0, baseY * 0.79);
        bgCtx.quadraticCurveTo(width * 0.24, baseY * 0.71, width * 0.52, baseY * 0.78);
        bgCtx.quadraticCurveTo(width * 0.78, baseY * 0.85, width, baseY * 0.74);
        bgCtx.lineTo(width, baseY);
        bgCtx.closePath();
        bgCtx.fill();

        // Solarpunk skyline behind foreground ridge
        const towerBaseY = baseY * 0.81;
        drawBioTower(bgCtx, width * 0.14, towerBaseY, isMobile ? 42 : 64, isMobile ? 115 : 165);
        drawBioTower(bgCtx, width * 0.48, towerBaseY + 6, isMobile ? 48 : 76, isMobile ? 130 : 190);
        drawBioTower(bgCtx, width * 0.86, towerBaseY, isMobile ? 38 : 58, isMobile ? 105 : 150);

        drawSolarArch(bgCtx, width * 0.36, towerBaseY + 8, isMobile ? 90 : 150, isMobile ? 48 : 72);
        drawGeodesicDome(bgCtx, width * 0.28, baseY * 0.83, isMobile ? 34 : 52);
        drawGeodesicDome(bgCtx, width * 0.68, baseY * 0.82, isMobile ? 28 : 44);

        // Foreground forest hill wave
        bgCtx.fillStyle = isNight ? '#081718' : 'rgba(45, 122, 79, 0.22)';
        bgCtx.beginPath();
        bgCtx.moveTo(0, baseY);
        bgCtx.lineTo(0, baseY * 0.85);
        bgCtx.quadraticCurveTo(width * 0.3, baseY * 0.9, width * 0.62, baseY * 0.83);
        bgCtx.quadraticCurveTo(width * 0.86, baseY * 0.78, width, baseY * 0.86);
        bgCtx.lineTo(width, baseY);
        bgCtx.closePath();
        bgCtx.fill();

        // Night warm orange light pools illuminating hills and solar farms
        if (isNight) {
            drawOrangeLightPool(bgCtx, width * 0.12, baseY * 0.83, isMobile ? 65 : 105, 0.25);
            drawOrangeLightPool(bgCtx, width * 0.28, baseY * 0.83, isMobile ? 75 : 120, 0.32);
            drawOrangeLightPool(bgCtx, width * 0.48, baseY * 0.82, isMobile ? 70 : 115, 0.28);
            drawOrangeLightPool(bgCtx, width * 0.68, baseY * 0.82, isMobile ? 65 : 105, 0.3);
            drawOrangeLightPool(bgCtx, width * 0.83, baseY * 0.83, isMobile ? 60 : 95, 0.24);
        }

        // Photovoltaic pergolas on hills
        drawSolarFarm(bgCtx, width * 0.06, baseY * 0.84, isMobile ? 3 : 4, isMobile ? 16 : 22, isMobile ? 8 : 11);
        drawSolarFarm(bgCtx, width * 0.74, baseY * 0.82, isMobile ? 3 : 4, isMobile ? 16 : 22, isMobile ? 8 : 11);

        // Organic tree clusters
        drawTrees(bgCtx, [
            [width * 0.2, baseY * 0.84, isMobile ? 9 : 13],
            [width * 0.38, baseY * 0.86, isMobile ? 8 : 12],
            [width * 0.56, baseY * 0.84, isMobile ? 10 : 14],
            [width * 0.62, baseY * 0.85, isMobile ? 7 : 10],
            [width * 0.92, baseY * 0.85, isMobile ? 9 : 13]
        ]);

        // Pre-draw wind turbine masts and nacelles
        for (const t of turbines) {
            bgCtx.strokeStyle = isNight ? '#3c5f61' : 'rgba(248, 252, 249, 0.88)';
            bgCtx.lineWidth = isMobile ? 2.2 : 2.8;
            bgCtx.beginPath();
            bgCtx.moveTo(t.x, t.baseY);
            bgCtx.lineTo(t.x, t.y);
            bgCtx.stroke();

            bgCtx.fillStyle = isNight ? '#587f80' : '#2d7a4f';
            bgCtx.beginPath();
            bgCtx.arc(t.x, t.y, 3.2, 0, Math.PI * 2);
            bgCtx.fill();
        }

        // Microgrid poles and catenary power lines
        bgCtx.strokeStyle = isNight ? 'rgba(255, 154, 60, 0.34)' : 'rgba(29, 120, 152, 0.34)';
        bgCtx.lineWidth = 1.1;
        for (const span of catenaries) {
            bgCtx.beginPath();
            bgCtx.moveTo(span.x0, span.y0);
            bgCtx.quadraticCurveTo(span.cx, span.cy, span.x1, span.y1);
            bgCtx.stroke();

            // Pole markers at span endpoints
            bgCtx.beginPath();
            bgCtx.moveTo(span.x0, span.y0);
            bgCtx.lineTo(span.x0, span.y0 + 18);
            bgCtx.moveTo(span.x1, span.y1);
            bgCtx.lineTo(span.x1, span.y1 + 18);
            bgCtx.stroke();
        }

        // Static crystalline water base
        const waterGrad = bgCtx.createLinearGradient(0, baseY * 0.89, 0, baseY);
        if (isNight) {
            waterGrad.addColorStop(0, 'rgba(9, 32, 38, 0.88)');
            waterGrad.addColorStop(1, 'rgba(6, 18, 24, 0.96)');
        } else {
            waterGrad.addColorStop(0, 'rgba(29, 120, 152, 0.14)');
            waterGrad.addColorStop(1, 'rgba(29, 120, 152, 0.26)');
        }
        bgCtx.fillStyle = waterGrad;
        bgCtx.beginPath();
        bgCtx.moveTo(0, baseY);
        bgCtx.lineTo(0, baseY * 0.905);
        bgCtx.quadraticCurveTo(width * 0.35, baseY * 0.89, width * 0.68, baseY * 0.91);
        bgCtx.quadraticCurveTo(width * 0.86, baseY * 0.92, width, baseY * 0.9);
        bgCtx.lineTo(width, baseY);
        bgCtx.closePath();
        bgCtx.fill();

        // Static shoreline / water reflection streaks
        if (isNight) {
            bgCtx.fillStyle = 'rgba(255, 154, 60, 0.22)';
            const reflectionXs = [0.14, 0.28, 0.48, 0.68, 0.82];
            for (const rx of reflectionXs) {
                const center = width * rx;
                bgCtx.fillRect(center - 28, horizonY + baseY * 0.09, 56, 2);
                bgCtx.fillRect(center - 18, horizonY + baseY * 0.115, 36, 1.5);
            }
        }
    };

    const drawCloud = (cloud) => {
        ctx.save();
        ctx.translate(cloud.x, cloud.y);
        ctx.scale(cloud.scale, cloud.scale);
        ctx.globalAlpha = cloud.alpha;
        ctx.fillStyle = COLOR_WHITE;

        ctx.beginPath();
        ctx.ellipse(0, 0, 54, 19, 0, 0, Math.PI * 2);
        ctx.ellipse(-32, 4, 32, 14, 0, 0, Math.PI * 2);
        ctx.ellipse(34, 5, 36, 14, 0, 0, Math.PI * 2);
        ctx.ellipse(10, -9, 28, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    const drawTurbineRotor = (t) => {
        const angle = t.phase + time * t.speed;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(angle);

        ctx.globalAlpha = isNight ? 0.85 : 0.92;
        ctx.fillStyle = isNight ? COLOR_NIGHT_BLADE : COLOR_DAY_BLADE;

        for (let b = 0; b < 3; b++) {
            ctx.beginPath();
            ctx.moveTo(-1.4, 0);
            ctx.lineTo(-0.5, -t.bladeLen);
            ctx.lineTo(1.2, -t.bladeLen * 0.92);
            ctx.lineTo(1.6, 0);
            ctx.closePath();
            ctx.fill();
            ctx.rotate((Math.PI * 2) / 3);
        }

        ctx.restore();

        // Nacelle hub and night orange beacon
        if (isNight) {
            const beaconPulse = 0.55 + 0.45 * Math.sin(time * 3.2 + t.phase);
            ctx.globalAlpha = beaconPulse * 0.35;
            ctx.fillStyle = COLOR_NIGHT_HUB;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 7.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 0.95;
            ctx.fillStyle = COLOR_NIGHT_BEACON;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 2.3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = COLOR_DAY_HUB;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 2.4, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    const drawMicrogridPulses = () => {
        if (!catenaries.length) return;
        for (const p of pulses) {
            const span = catenaries[p.spanIdx];
            if (!span) continue;

            const u = p.t;
            const inv = 1 - u;
            const px = inv * inv * span.x0 + 2 * inv * u * span.cx + u * u * span.x1;
            const py = inv * inv * span.y0 + 2 * inv * u * span.cy + u * u * span.y1;

            const color = isNight
                ? (p.alt ? COLOR_NIGHT_PULSE_B : COLOR_NIGHT_PULSE_A)
                : (p.alt ? COLOR_DAY_PULSE_B : COLOR_DAY_PULSE_A);

            ctx.fillStyle = color;
            ctx.globalAlpha = isNight ? 0.3 : 0.22;
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = isNight ? 0.95 : 0.85;
            ctx.beginPath();
            ctx.arc(px, py, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    const drawWaterGlints = () => {
        const step = isMobile ? 48 : 34;
        const y1 = height * 0.93;
        const y2 = height * 0.965;

        ctx.lineWidth = 1.4;
        ctx.strokeStyle = isNight ? COLOR_NIGHT_WATER_GLINT : COLOR_DAY_WATER_GLINT;
        ctx.globalAlpha = isNight ? 0.34 : 0.38;

        ctx.beginPath();
        for (let x = 0; x <= width; x += step) {
            const waveY = y1 + Math.sin(x * 0.014 + time * 1.4) * 3.2;
            if (x === 0) ctx.moveTo(x, waveY);
            else ctx.lineTo(x, waveY);
        }
        ctx.stroke();

        ctx.strokeStyle = isNight ? COLOR_NIGHT_WATER_AMBER : COLOR_DAY_PULSE_B;
        ctx.globalAlpha = isNight ? 0.24 : 0.2;
        ctx.beginPath();
        for (let x = 0; x <= width; x += step) {
            const waveY = y2 + Math.cos(x * 0.018 - time * 1.1) * 2.5;
            if (x === 0) ctx.moveTo(x, waveY);
            else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
    };

    const drawLeaf = (leaf) => {
        ctx.save();
        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.angle);
        ctx.globalAlpha = leaf.alpha;
        ctx.fillStyle = leaf.color;
        ctx.beginPath();
        ctx.moveTo(0, -leaf.size);
        ctx.quadraticCurveTo(leaf.size * 0.75, 0, 0, leaf.size);
        ctx.quadraticCurveTo(-leaf.size * 0.75, 0, 0, -leaf.size);
        ctx.fill();
        ctx.restore();
    };

    const drawPollen = (mote) => {
        ctx.globalAlpha = mote.alpha;
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
        ctx.fill();
    };

    const drawFirefly = (fly) => {
        const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * fly.pulseSpeed + fly.phase));
        ctx.globalAlpha = pulse * 0.28;
        ctx.fillStyle = COLOR_FIREFLY_GLOW;
        ctx.beginPath();
        ctx.arc(fly.x, fly.y, fly.r * 3.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = pulse * 0.92;
        ctx.fillStyle = COLOR_FIREFLY_CORE;
        ctx.beginPath();
        ctx.arc(fly.x, fly.y, fly.r, 0, Math.PI * 2);
        ctx.fill();
    };

    const renderStaticFrame = () => {
        ctx.drawImage(bgBuffer, 0, 0, width, height);
        if (!isNight) {
            for (const cloud of clouds) {
                drawCloud(cloud);
            }
        }
        for (const t of turbines) {
            drawTurbineRotor(t);
        }
        drawWaterGlints();
        ctx.globalAlpha = 1;
    };

    const buildSceneTopology = () => {
        const baseY = height;
        turbines = isMobile
            ? [
                { x: width * 0.09, y: baseY * 0.68, baseY: baseY * 0.83, bladeLen: 22, speed: 1.4, phase: 0.3 },
                { x: width * 0.58, y: baseY * 0.65, baseY: baseY * 0.83, bladeLen: 26, speed: 1.15, phase: 1.5 },
                { x: width * 0.91, y: baseY * 0.69, baseY: baseY * 0.83, bladeLen: 20, speed: 1.55, phase: 2.7 }
            ]
            : [
                { x: width * 0.08, y: baseY * 0.66, baseY: baseY * 0.83, bladeLen: 28, speed: 1.3, phase: 0.2 },
                { x: width * 0.22, y: baseY * 0.69, baseY: baseY * 0.83, bladeLen: 24, speed: 1.5, phase: 1.1 },
                { x: width * 0.61, y: baseY * 0.64, baseY: baseY * 0.83, bladeLen: 32, speed: 1.1, phase: 2.0 },
                { x: width * 0.93, y: baseY * 0.68, baseY: baseY * 0.83, bladeLen: 26, speed: 1.4, phase: 0.8 }
            ];

        // Microgrid catenary lines connecting turbines, domes and solar farms
        catenaries = [
            {
                x0: width * 0.08,
                y0: baseY * 0.8,
                cx: width * 0.18,
                cy: baseY * 0.835,
                x1: width * 0.28,
                y1: baseY * 0.81
            },
            {
                x0: width * 0.28,
                y0: baseY * 0.81,
                cx: width * 0.38,
                cy: baseY * 0.84,
                x1: width * 0.48,
                y1: baseY * 0.805
            },
            {
                x0: width * 0.48,
                y0: baseY * 0.805,
                cx: width * 0.58,
                cy: baseY * 0.835,
                x1: width * 0.68,
                y1: baseY * 0.805
            },
            {
                x0: width * 0.68,
                y0: baseY * 0.805,
                cx: width * 0.8,
                cy: baseY * 0.835,
                x1: width * 0.91,
                y1: baseY * 0.805
            }
        ];
    };

    const setup = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        isMobile = width < 768;
        isNight = isNightTheme();

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        buildSceneTopology();

        clouds = createClouds(width, height);
        leaves = createLeaves(width, height, isMobile ? 5 : LEAF_COUNT);
        pollen = createPollen(width, height, isMobile ? 8 : POLLEN_COUNT);
        fireflies = createFireflies(width, height, isMobile ? 11 : FIREFLY_COUNT);
        stars = createStars(width, height, isMobile ? 28 : 48);
        pulses = createPulses(catenaries.length);

        renderBackgroundBuffer();
        renderStaticFrame();
    };

    const animate = (timestamp) => {
        if (document.hidden || reducedMotion.matches) {
            rafId = null;
            return;
        }

        const dt = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.1) : 1 / 60;
        lastFrameTime = timestamp;
        time += dt;

        // Normalize particle motion to keep consistent gentle speed at 60+ FPS
        const frameScale = dt * 30;

        // Instant blit of pre-rendered static Solarpunk architecture and sky
        ctx.drawImage(bgBuffer, 0, 0, width, height);

        if (!isNight) {
            for (const cloud of clouds) {
                cloud.x += cloud.speed * frameScale;
                if (cloud.x - 120 > width) {
                    cloud.x = -120;
                }
                drawCloud(cloud);
            }
        }

        for (const t of turbines) {
            drawTurbineRotor(t);
        }

        for (const p of pulses) {
            p.t += p.speed * dt * p.dir;
            if (p.t > 1) p.t -= 1;
            if (p.t < 0) p.t += 1;
        }
        drawMicrogridPulses();
        drawWaterGlints();

        if (isNight) {
            for (const fly of fireflies) {
                fly.x += (fly.vx + Math.sin(time * 0.9 + fly.phase) * 0.25) * frameScale;
                fly.y += (fly.vy + Math.cos(time * 0.7 + fly.phase) * 0.18) * frameScale;
                if (fly.x < -10) fly.x = width + 10;
                if (fly.x > width + 10) fly.x = -10;
                if (fly.y < height * 0.25) fly.y = height * 0.9;
                if (fly.y > height * 0.95) fly.y = height * 0.35;
                drawFirefly(fly);
            }
        } else {
            for (const leaf of leaves) {
                leaf.x += (leaf.vx + Math.sin(time + leaf.phase) * 0.35) * frameScale;
                leaf.y += leaf.vy * frameScale;
                leaf.angle += leaf.spin * frameScale;
                if (leaf.x > width + 20) leaf.x = -20;
                if (leaf.y > height + 20) {
                    leaf.y = -20;
                    leaf.x = Math.random() * width;
                }
                drawLeaf(leaf);
            }

            ctx.fillStyle = COLOR_POLLEN;
            for (const mote of pollen) {
                mote.x += (mote.vx + Math.cos(time * 0.8 + mote.phase) * 0.22) * frameScale;
                mote.y += mote.vy * frameScale;
                if (mote.y < -10) {
                    mote.y = height + 10;
                    mote.x = Math.random() * width;
                }
                if (mote.x > width + 10) mote.x = -10;
                if (mote.x < -10) mote.x = width + 10;
                drawPollen(mote);
            }
        }

        ctx.globalAlpha = 1;
        rafId = requestAnimationFrame(animate);
    };

    const startLoop = () => {
        if (!document.hidden && !reducedMotion.matches && rafId === null) {
            lastFrameTime = 0;
            rafId = requestAnimationFrame(animate);
        }
    };

    window.addEventListener('resize', () => {
        if (resizeRaf === null) {
            resizeRaf = requestAnimationFrame(() => {
                resizeRaf = null;
                setup();
            });
        }
    }, { passive: true });

    window.addEventListener('solarpunk-theme-change', (event) => {
        isNight = event.detail && event.detail.theme ? event.detail.theme === 'night' : isNightTheme();
        renderBackgroundBuffer();
        renderStaticFrame();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        } else if (!document.hidden) {
            startLoop();
        }
    });

    if (typeof reducedMotion.addEventListener === 'function') {
        reducedMotion.addEventListener('change', () => {
            if (reducedMotion.matches && rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
                renderStaticFrame();
            } else if (!reducedMotion.matches && !document.hidden) {
                startLoop();
            }
        });
    }

    setup();
    startLoop();
}

export const initSolarpunkCanvas = initCircuitCanvas;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initCircuitCanvas());
} else {
    initCircuitCanvas();
}
