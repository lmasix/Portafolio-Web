/*
 * Ultra-optimized adaptive Solarpunk cursor overlay (ES Module)
 */

const STORAGE_KEY = 'maxandaur_cursor_enabled';
const MAX_TRAIL_POINTS = 11;
const IDLE_FRAME_LIMIT = 22;

const DAY_PRIMARY = '#2d7a4f';
const DAY_SECONDARY = '#1d7898';
const NIGHT_PRIMARY = '#ff9a3c';
const NIGHT_SECONDARY = '#4ad688';

function isNightTheme() {
    return document.documentElement.getAttribute('data-theme') === 'night';
}

function readStoredCursorPreference() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw === null ? true : raw !== 'false';
    } catch {
        return true;
    }
}

function saveCursorPreference(enabled) {
    try {
        window.localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
        // Ignore storage errors in restricted browsing contexts
    }
}

export function initCursorCanvas(canvasId = 'cursorCanvas') {
    const cursorCanvas = document.getElementById(canvasId);
    const toggleBtn = document.getElementById('cursorToggleBtn');
    const toggleLabel = toggleBtn ? toggleBtn.querySelector('.cursor-toggle-label') : null;

    if (!cursorCanvas) return;

    const cCtx = cursorCanvas.getContext('2d');
    if (!cCtx) return;

    let cWidth = window.innerWidth;
    let cHeight = window.innerHeight;
    let rafId = null;
    let resizeRaf = null;
    let idleFrames = 0;
    let isEnabled = readStoredCursorPreference();
    let isNight = isNightTheme();

    const fineHoverQuery = window.matchMedia('(pointer: fine) and (hover: hover)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const mouseState = { x: cWidth / 2, y: cHeight / 2, hasMoved: false };
    const pointer = { x: cWidth / 2, y: cHeight / 2 };

    // Pre-allocated ring buffer for trail points to avoid per-frame allocations
    const trailPool = Array.from({ length: MAX_TRAIL_POINTS }, () => ({ x: 0, y: 0, alpha: 0 }));
    let trailHead = 0;
    let trailCount = 0;

    const syncToggleUi = () => {
        if (!toggleBtn) return;
        toggleBtn.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
        if (toggleLabel) {
            toggleLabel.textContent = isEnabled ? 'Puntero: ON' : 'Puntero: OFF';
        }
    };

    const clearAndSleep = () => {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        trailHead = 0;
        trailCount = 0;
        idleFrames = 0;
        cCtx.globalAlpha = 1;
        cCtx.clearRect(0, 0, cWidth, cHeight);
    };

    const canRun = () => {
        return (
            isEnabled &&
            !document.hidden &&
            !reducedMotion.matches &&
            fineHoverQuery.matches &&
            cWidth >= 768
        );
    };

    const resize = () => {
        cWidth = window.innerWidth;
        cHeight = window.innerHeight;
        cursorCanvas.width = cWidth;
        cursorCanvas.height = cHeight;
        if (!canRun()) {
            clearAndSleep();
        }
    };

    const drawFrame = () => {
        cCtx.clearRect(0, 0, cWidth, cHeight);

        if (!canRun() || !mouseState.hasMoved) {
            rafId = null;
            return;
        }

        const dx = mouseState.x - pointer.x;
        const dy = mouseState.y - pointer.y;
        pointer.x += dx * 0.28;
        pointer.y += dy * 0.28;

        const movedDist = Math.hypot(dx, dy);
        if (movedDist > 0.6) {
            idleFrames = 0;
        } else {
            idleFrames += 1;
        }

        // Fade trail points toward sleep
        for (let i = 0; i < trailCount; i++) {
            const pt = trailPool[(trailHead + i) % MAX_TRAIL_POINTS];
            pt.alpha -= 0.048;
        }
        while (trailCount > 0 && trailPool[trailHead].alpha <= 0.01) {
            trailHead = (trailHead + 1) % MAX_TRAIL_POINTS;
            trailCount -= 1;
        }

        const primaryColor = isNight ? NIGHT_PRIMARY : DAY_PRIMARY;
        const secondaryColor = isNight ? NIGHT_SECONDARY : DAY_SECONDARY;

        // Draw adaptive trail without string allocations or shadowBlur
        if (trailCount > 1) {
            cCtx.lineCap = 'round';
            for (let i = 1; i < trailCount; i++) {
                const prev = trailPool[(trailHead + i - 1) % MAX_TRAIL_POINTS];
                const curr = trailPool[(trailHead + i) % MAX_TRAIL_POINTS];
                const ratio = i / trailCount;
                const alpha = (prev.alpha < curr.alpha ? prev.alpha : curr.alpha) * 0.55;
                if (alpha <= 0.01) continue;

                cCtx.globalAlpha = alpha;
                cCtx.strokeStyle = i % 2 === 0 ? primaryColor : secondaryColor;
                cCtx.lineWidth = 1.2 + ratio * 1.8;
                cCtx.beginPath();
                cCtx.moveTo(prev.x, prev.y);
                cCtx.lineTo(curr.x, curr.y);
                cCtx.stroke();
            }
        }

        // Draw subtle fading leaf-breeze halo around pointer
        const haloAlpha = Math.max(0, 1 - idleFrames / IDLE_FRAME_LIMIT);
        if (haloAlpha > 0.02) {
            cCtx.save();
            cCtx.translate(pointer.x, pointer.y);

            cCtx.globalAlpha = 0.42 * haloAlpha;
            cCtx.strokeStyle = secondaryColor;
            cCtx.lineWidth = 1.3;
            cCtx.beginPath();
            cCtx.arc(0, 0, 11, 0, Math.PI * 2);
            cCtx.stroke();

            const leafAngle = Math.atan2(dy, dx) || -0.6;
            cCtx.rotate(leafAngle);
            cCtx.globalAlpha = 0.65 * haloAlpha;
            cCtx.fillStyle = primaryColor;
            cCtx.beginPath();
            cCtx.moveTo(6, 0);
            cCtx.quadraticCurveTo(0, -4.5, -6, 0);
            cCtx.quadraticCurveTo(0, 4.5, 6, 0);
            cCtx.fill();

            cCtx.restore();
        }

        cCtx.globalAlpha = 1;

        // Idle sleep: stop rAF once pointer is still and trail has faded
        if (idleFrames >= IDLE_FRAME_LIMIT && trailCount === 0) {
            cCtx.clearRect(0, 0, cWidth, cHeight);
            rafId = null;
            return;
        }

        rafId = requestAnimationFrame(drawFrame);
    };

    const wakeUp = () => {
        if (!canRun()) return;
        if (rafId === null) {
            rafId = requestAnimationFrame(drawFrame);
        }
    };

    window.addEventListener('resize', () => {
        if (resizeRaf === null) {
            resizeRaf = requestAnimationFrame(() => {
                resizeRaf = null;
                resize();
            });
        }
    }, { passive: true });

    window.addEventListener('mousemove', (event) => {
        if (!canRun()) return;

        mouseState.x = event.clientX;
        mouseState.y = event.clientY;
        if (!mouseState.hasMoved) {
            pointer.x = event.clientX;
            pointer.y = event.clientY;
            mouseState.hasMoved = true;
        }

        if (trailCount < MAX_TRAIL_POINTS) {
            const slot = trailPool[(trailHead + trailCount) % MAX_TRAIL_POINTS];
            slot.x = event.clientX;
            slot.y = event.clientY;
            slot.alpha = 0.9;
            trailCount += 1;
        } else {
            const slot = trailPool[trailHead];
            slot.x = event.clientX;
            slot.y = event.clientY;
            slot.alpha = 0.9;
            trailHead = (trailHead + 1) % MAX_TRAIL_POINTS;
        }

        idleFrames = 0;
        wakeUp();
    }, { passive: true });

    window.addEventListener('solarpunk-theme-change', (event) => {
        isNight = event.detail && event.detail.theme ? event.detail.theme === 'night' : isNightTheme();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearAndSleep();
        }
    });

    if (typeof fineHoverQuery.addEventListener === 'function') {
        fineHoverQuery.addEventListener('change', () => {
            if (!canRun()) {
                clearAndSleep();
            }
        });
    }

    if (typeof reducedMotion.addEventListener === 'function') {
        reducedMotion.addEventListener('change', () => {
            if (reducedMotion.matches) {
                clearAndSleep();
            }
        });
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            isEnabled = !isEnabled;
            saveCursorPreference(isEnabled);
            syncToggleUi();
            if (!isEnabled) {
                clearAndSleep();
            }
        });
    }

    syncToggleUi();
    resize();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initCursorCanvas());
} else {
    initCursorCanvas();
}
