export function initMobileUI() {
    if (window.innerWidth > 768) return;

    // Скрыть левую панель
    const left = document.querySelector('.sidebar-left');
    if (left) left.style.display = 'none';

    // Кнопка "+"
    const btn = document.getElementById('addFriendBtn');
    if (btn) btn.textContent = '+';

    // Правая панель
    const panel = document.querySelector('.sidebar-right');
    if (!panel) return;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);

    let startX = 0;
    document.addEventListener('touchstart', e => startX = e.changedTouches[0].screenX);
    document.addEventListener('touchend', e => {
        const endX = e.changedTouches[0].screenX;
        const diff = startX - endX;
        if (diff > 50 && !panel.classList.contains('open')) {
            panel.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else if (diff < -50 && panel.classList.contains('open')) {
            panel.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    overlay.addEventListener('click', () => {
        panel.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    });
}