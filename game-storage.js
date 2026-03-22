/**
 * 殿、ご安眠を。 — セーブ・アチーブメント（localStorage / 実績解除・表示）
 */
Game.prototype.saveProgress = function() {
    try {
        localStorage.setItem('tono_sleep_progress', JSON.stringify({ unlockedStages: this.unlockedStages }));
    } catch (e) {}
};

Game.prototype.loadProgress = function() {
    try {
        const saved = localStorage.getItem('tono_sleep_progress');
        if (saved) {
            const data = JSON.parse(saved);
            this.unlockedStages = data.unlockedStages || 1;
        }
    } catch (e) {
        this.unlockedStages = 1;
    }
};

Game.prototype.loadAchievements = function() {
    try {
        const saved = localStorage.getItem('tono_achievements');
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
};

Game.prototype.saveAchievements = function() {
    try {
        localStorage.setItem('tono_achievements', JSON.stringify(this.achievements));
    } catch (e) {}
};

Game.prototype.checkAchievement = function(id) {
    if (this.achievements[id]) return;
    const achievement = ACHIEVEMENTS[id];
    if (!achievement) return;
    this.achievements[id] = true;
    this.saveAchievements();
    this.showAchievement(id);
};

Game.prototype.showAchievement = function(id) {
    const a = ACHIEVEMENTS[id];
    if (!a) return;
    this.playSound('bell');
    const el = document.createElement('div');
    el.className = 'achievement-toast';
    el.style.cssText = 'position:fixed;top:20px;right:20px;background:linear-gradient(135deg,#d4af37,#aa8c2e);color:#1a1a2e;padding:14px 18px;border-radius:10px;font-weight:bold;box-shadow:0 6px 16px rgba(212,175,55,0.5);z-index:2000;font-family:inherit;transform:translateX(120%);transition:transform 0.4s ease;max-width:240px;';
    el.innerHTML = `<div style="font-size:2em;text-align:center;margin-bottom:6px;">${a.icon}</div><div style="font-size:1em;margin-bottom:4px;text-align:center;">実績解除</div><div style="font-size:1em;">${a.name}</div><div style="font-size:0.8em;opacity:0.85;">${a.desc}</div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        el.style.transform = 'translateX(120%)';
        setTimeout(() => el.remove(), 450);
    }, 3500);
};
