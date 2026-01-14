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
            const href = link.getAttribute('href');

            // Solo aplicar smooth scroll si es un enlace interno (empieza con #)
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    nav.classList.remove('nav-active');
                    hamburger.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });

    // Logo Modal Logic (Premium Lightbox)
    const logoImg = document.querySelector('.logo img');
    if (logoImg) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'logo-modal';
        modal.innerHTML = `<img src="${logoImg.src}" alt="Profile Picture Enlarged">`;
        document.body.appendChild(modal);

        logoImg.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('active');
            document.body.classList.add('no-scroll');
        });

        modal.addEventListener('click', () => {
            modal.classList.remove('active');
            document.body.classList.remove('no-scroll');
        });
    }
});