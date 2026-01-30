export function initMobileUI(user) {
    if (window.innerWidth > 768) return;

    // Скрыть левую панель
    const leftPanel = document.querySelector('.sidebar-left');
    if (leftPanel) leftPanel.style.display = 'none';

    // Кнопка "+"
    const addBtn = document.getElementById('addFriendBtn');
    if (addBtn) addBtn.textContent = '+';

    // Правая панель
    const rightPanel = document.querySelector('.sidebar-right');
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);

    let touchStartX = 0;
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    });

    document.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (diff > 50 && !rightPanel.classList.contains('open')) {
            rightPanel.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else if (diff < -50 && rightPanel.classList.contains('open')) {
            rightPanel.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    overlay.addEventListener('click', () => {
        rightPanel.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    });
}