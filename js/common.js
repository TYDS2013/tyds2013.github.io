// =============================================
// 公共功能：时间更新、主题切换、轮播、返回顶部、加载动画隐藏
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    // ---------- 实时时钟 ----------
    function updateClock() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const wd = weekdays[now.getDay()];
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const clock = document.getElementById('clock');
        if (clock) {
            clock.textContent = `${year}-${month}-${day}  星期${wd}  ${hours}:${minutes}:${seconds}`;
        }
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ---------- 亮/暗色主题 ----------
    const themeToggle = document.getElementById('themeToggle');
    const themeButtons = themeToggle ? themeToggle.querySelectorAll('button') : [];
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let currentTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
    applyTheme(currentTheme);

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }

    themeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            applyTheme(this.dataset.theme);
        });
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

    // ---------- 轮播图 ----------
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dots span');
    let currentSlide = 0;
    let intervalId = null;

    function showSlide(index) {
        slides.forEach((s, i) => s.classList.toggle('active', i === index));
        dots.forEach((d, i) => d.classList.toggle('active', i === index));
        currentSlide = index;
    }

    function nextSlide() {
        const next = (currentSlide + 1) % slides.length;
        showSlide(next);
    }

    function prevSlide() {
        const prev = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(prev);
    }

    if (slides.length > 0) {
        intervalId = setInterval(nextSlide, 5000);
        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                clearInterval(intervalId);
                showSlide(i);
                intervalId = setInterval(nextSlide, 5000);
            });
        });
        const leftArrow = document.querySelector('.carousel-arrow.left');
        const rightArrow = document.querySelector('.carousel-arrow.right');
        if (leftArrow) {
            leftArrow.addEventListener('click', () => {
                clearInterval(intervalId);
                prevSlide();
                intervalId = setInterval(nextSlide, 5000);
            });
        }
        if (rightArrow) {
            rightArrow.addEventListener('click', () => {
                clearInterval(intervalId);
                nextSlide();
                intervalId = setInterval(nextSlide, 5000);
            });
        }
    }

    // ---------- 返回顶部 ----------
    const backTop = document.getElementById('backTop');
    if (backTop) {
        window.addEventListener('scroll', () => {
            backTop.classList.toggle('show', window.scrollY > 300);
        });
        backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // ---------- 导航高亮 ----------
    const navLinks = document.querySelectorAll('.top-nav a');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '' && href === 'index.html')) {
            link.classList.add('active');
        }
    });
});

// ===== 加载动画控制 =====
window.addEventListener('load', function() {
    const loader = document.getElementById('loader');
    if (loader) {
        setTimeout(() => { loader.classList.add('hidden'); }, 300);
    }
});
if (document.readyState === 'complete') {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
}