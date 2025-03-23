// Actualiza el JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('header');
    const navLinks = document.querySelector('.nav-links');

    hamburger.addEventListener('click', () => {
        nav.classList.toggle('nav-active');
        hamburger.setAttribute('aria-expanded', nav.classList.contains('nav-active'));
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!nav.contains(e.target)) {
            nav.classList.remove('nav-active');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });

    // Smooth scroll
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                nav.classList.remove('nav-active');
                hamburger.setAttribute('aria-expanded', 'false');
            }
        });
    });
});