/**
 * 殿、ご安眠を。 — エントリポイント
 * 読み込み順: config.js → game.js → game-night.js → game-render.js → game-storage.js → main.js
 */
const IOS_SCROLLABLE_SELECTORS = [
    '.bottom-ui',
    '.trap-palette',
    '.story-text',
    '.timeline-vision-panel',
    '.timeline-vision-content',
    '.timeline-enemy-list',
    '.scenario-panel',
    '.scenario-content'
].join(', ');

const canScrollWithTouch = (target) => target instanceof Element && !!target.closest(IOS_SCROLLABLE_SELECTORS);

document.addEventListener('touchmove', (e) => {
    if (!e.cancelable || canScrollWithTouch(e.target)) return;
    e.preventDefault();
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (e.cancelable && now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

document.addEventListener('gesturestart', (e) => {
    if (e.cancelable) e.preventDefault();
}, { passive: false });

document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.btn, .trap-btn, .stage-card, .scenario-card, .btn-close')) return;
    if (navigator.vibrate) navigator.vibrate(15);
}, { passive: true });

const game = new Game();
