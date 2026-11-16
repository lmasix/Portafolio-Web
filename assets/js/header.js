/*
 * Header, theme toggle, navigation, native profile dialog and reveal observers (ES Module)
 */

const THEME_STORAGE_KEY = 'maxandaur_theme';
const AVATAR_IDX_KEY = 'maxandaur_avatar_idx';
const AVATAR_TS_KEY = 'maxandaur_avatar_ts';
const AVATAR_ROTATE_MS = 25000;
const PROFILE_PHOTOS = [
    {
        thumb: '/assets/img/yo-thumb.webp',
        full: '/assets/img/yo.webp',
        w: 600,
        h: 663,
        fw: 1200,
        fh: 1326
    },
    {
        thumb: '/assets/img/yo-2.webp',
        full: '/assets/img/yo-2.webp',
        w: 400,
        h: 400,
        fw: 400,
        fh: 400
    }
];

let headerListenersBound = false;
let activeAvatarIndex = 0;

function readAvatarState() {
    try {
        const idx = parseInt(window.localStorage.getItem(AVATAR_IDX_KEY) || '0', 10);
        const ts = parseInt(window.localStorage.getItem(AVATAR_TS_KEY) || '0', 10);
        return {
            idx: Number.isFinite(idx) && idx >= 0 && idx < PROFILE_PHOTOS.length ? idx : 0,
            ts: Number.isFinite(ts) && ts > 0 ? ts : Date.now()
        };
    } catch {
        return { idx: 0, ts: Date.now() };
    }
}

function saveAvatarState(idx, ts) {
    try {
        window.localStorage.setItem(AVATAR_IDX_KEY, String(idx));
        window.localStorage.setItem(AVATAR_TS_KEY, String(ts));
    } catch {
        // Ignore storage errors in restricted browsing contexts
    }
}

function applyAvatarPhoto(idx, avatarImg, dialogImg, animate = false) {
    const photo = PROFILE_PHOTOS[idx] || PROFILE_PHOTOS[0];
    activeAvatarIndex = idx;

    const commitSwap = () => {
        if (avatarImg && avatarImg.getAttribute('src') !== photo.thumb) {
            avatarImg.width = photo.w;
            avatarImg.height = photo.h;
            avatarImg.src = photo.thumb;
        }
        if (dialogImg && dialogImg.getAttribute('src') !== photo.full) {
            dialogImg.width = photo.fw;
            dialogImg.height = photo.fh;
            dialogImg.src = photo.full;
        }
    };

    if (!animate || !avatarImg) {
        commitSwap();
        return;
    }

    avatarImg.classList.add('is-fading');
    window.setTimeout(() => {
        commitSwap();
        if (typeof avatarImg.decode === 'function') {
            avatarImg.decode().catch(() => {}).finally(() => {
                avatarImg.classList.remove('is-fading');
            });
        } else {
            avatarImg.classList.remove('is-fading');
        }
    }, 180);
}

function initAvatarRotation() {
    const avatarImg = document.querySelector('.avatar-btn img');
    const dialogImg = document.querySelector('#profileDialog img');
    if (!avatarImg || PROFILE_PHOTOS.length < 2) return;

    const now = Date.now();
    const state = readAvatarState();
    let idx = state.idx;
    let lastTs = state.ts;

    if (now - lastTs >= AVATAR_ROTATE_MS) {
        idx = (idx + 1) % PROFILE_PHOTOS.length;
        lastTs = now;
    }
    saveAvatarState(idx, lastTs);
    applyAvatarPhoto(idx, avatarImg, dialogImg, false);

    // Preload alternate avatar lazily after initial render so LCP is unaffected
    const preloadNext = () => {
        const nextPhoto = PROFILE_PHOTOS[(idx + 1) % PROFILE_PHOTOS.length];
        const loader = new Image();
        loader.decoding = 'async';
        loader.src = nextPhoto.thumb;
    };

    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(preloadNext, { timeout: 2500 });
    } else {
        window.setTimeout(preloadNext, 1500);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    let rotateTimer = null;

    const clearRotateTimer = () => {
        if (rotateTimer !== null) {
            window.clearTimeout(rotateTimer);
            rotateTimer = null;
        }
    };

    const scheduleNext = (delay) => {
        clearRotateTimer();
        if (document.hidden) return;
        rotateTimer = window.setTimeout(() => {
            rotateTimer = null;
            if (document.hidden) return;
            const nextIdx = (activeAvatarIndex + 1) % PROFILE_PHOTOS.length;
            const stamp = Date.now();
            saveAvatarState(nextIdx, stamp);
            applyAvatarPhoto(nextIdx, avatarImg, dialogImg, true);
            scheduleNext(AVATAR_ROTATE_MS);
        }, Math.max(250, delay));
    };

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearRotateTimer();
        } else {
            const elapsed = Date.now() - readAvatarState().ts;
            const remaining = Math.max(250, AVATAR_ROTATE_MS - elapsed);
            scheduleNext(remaining);
        }
    });

    const elapsed = Math.max(0, Date.now() - lastTs);
    scheduleNext(Math.max(1000, AVATAR_ROTATE_MS - elapsed));
}

function readStoredTheme() {
    try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        return stored === 'night' ? 'night' : 'day';
    } catch {
        return 'day';
    }
}

function saveStoredTheme(theme) {
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
        // Ignore storage errors in restricted browsing contexts
    }
}

function applyTheme(theme) {
    const normalized = theme === 'night' ? 'night' : 'day';
    const isNight = normalized === 'night';

    document.documentElement.setAttribute('data-theme', normalized);

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.setAttribute('aria-pressed', isNight ? 'true' : 'false');
        const icon = themeBtn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-sun', isNight);
            icon.classList.toggle('fa-moon', !isNight);
        }
        const label = themeBtn.querySelector('.theme-toggle-label');
        if (label) {
            label.textContent = isNight ? 'Modo: Noche' : 'Modo: Dia';
        }
    }

    return normalized;
}

function isSamePageLink(anchor) {
    const href = anchor.getAttribute('href');
    if (!href) return { same: false, hash: '' };
    if (href.startsWith('#')) return { same: true, hash: href };

    try {
        const targetUrl = new URL(anchor.href, window.location.origin);
        const currentPath = window.location.pathname.replace(/\/index\.html$/, '/');
        const targetPath = targetUrl.pathname.replace(/\/index\.html$/, '/');
        const same = targetUrl.origin === window.location.origin && currentPath === targetPath;
        return { same, hash: targetUrl.hash };
    } catch {
        return { same: false, hash: '' };
    }
}

export function initRevealObserver() {
    const revealTargets = document.querySelectorAll('.reveal, .metric-card, .kpi-card');
    if (!revealTargets.length) return;

    document.documentElement.classList.add('js-enabled');

    if (!('IntersectionObserver' in window)) {
        revealTargets.forEach((el) => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0,
            rootMargin: '0px 0px -20px 0px'
        }
    );

    revealTargets.forEach((el) => observer.observe(el));
}

export function initHeader() {
    applyTheme(readStoredTheme());

    const header = document.querySelector('header');
    if (!header) return;

    const hamburger = header.querySelector('.hamburger');
    const sentinel = document.querySelector('.header-sentinel') || document.querySelector('#hero, .project-hero');

    const closeNav = () => {
        header.classList.remove('nav-active');
        if (hamburger) {
            hamburger.setAttribute('aria-expanded', 'false');
        }
    };

    // Observe top sentinel instead of listening to scroll events
    if (sentinel && 'IntersectionObserver' in window) {
        const headerObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    header.classList.toggle('is-scrolled', !entry.isIntersecting);
                });
            },
            { threshold: 0 }
        );
        headerObserver.observe(sentinel);
    }

    if (headerListenersBound) return;
    headerListenersBound = true;

    // Delegated click handler for theme toggle, dialog, navigation and mobile drawer
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        // Toggle day/night theme
        const themeBtn = target.closest('#themeToggleBtn');
        if (themeBtn) {
            const current = document.documentElement.getAttribute('data-theme') === 'night' ? 'night' : 'day';
            const nextTheme = current === 'night' ? 'day' : 'night';
            applyTheme(nextTheme);
            saveStoredTheme(nextTheme);
            window.dispatchEvent(new CustomEvent('solarpunk-theme-change', { detail: { theme: nextTheme } }));
            return;
        }

        // Open native profile dialog
        const openTrigger = target.closest('[data-open-dialog]');
        if (openTrigger) {
            const dialogId = openTrigger.getAttribute('data-open-dialog');
            const dialog = dialogId ? document.getElementById(dialogId) : null;
            if (dialog && typeof dialog.showModal === 'function' && !dialog.open) {
                const dialogImg = dialog.querySelector('img');
                const activePhoto = PROFILE_PHOTOS[activeAvatarIndex] || PROFILE_PHOTOS[0];
                if (dialogImg && dialogImg.getAttribute('src') !== activePhoto.full) {
                    dialogImg.width = activePhoto.fw;
                    dialogImg.height = activePhoto.fh;
                    dialogImg.src = activePhoto.full;
                }
                dialog.showModal();
            }
            return;
        }

        // Close native dialog from close button
        const closeTrigger = target.closest('[data-close-dialog]');
        if (closeTrigger) {
            const dialog = closeTrigger.closest('dialog');
            if (dialog && dialog.open) {
                dialog.close();
            }
            return;
        }

        // Close native dialog when clicking its backdrop
        if (target instanceof HTMLDialogElement && target.open) {
            target.close();
            return;
        }

        // Toggle mobile menu
        const toggleBtn = target.closest('.hamburger');
        if (toggleBtn && header.contains(toggleBtn)) {
            const isOpen = header.classList.toggle('nav-active');
            toggleBtn.setAttribute('aria-expanded', String(isOpen));
            return;
        }

        // Smooth scroll for same-page nav or anchor links
        const navLink = target.closest('.nav-links a, a[data-scroll-link]');
        if (navLink) {
            const { same, hash } = isSamePageLink(navLink);
            if (same && hash && hash.length > 1) {
                const section = document.querySelector(hash);
                if (section) {
                    event.preventDefault();
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    closeNav();
                    return;
                }
            }
            if (header.contains(navLink)) {
                closeNav();
            }
            return;
        }

        // Close mobile drawer when clicking outside header
        if (!header.contains(target) && header.classList.contains('nav-active')) {
            closeNav();
        }
    });

    // Close mobile menu on Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && header.classList.contains('nav-active')) {
            closeNav();
        }
    });
}

function bootstrap() {
    initHeader();
    initAvatarRotation();
    initRevealObserver();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
