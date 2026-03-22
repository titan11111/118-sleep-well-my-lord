/**
 * 殿、ご安眠を。 — 描画・UI（render / 予告線 / 罠プレビュー / メッセージ / パーティクル / SE）
 */
Game.prototype.render = function() {
    const ctx = this.ctx;
    let shakeApplied = false;
    if (this.screenShake.duration > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * this.screenShake.intensity, (Math.random() - 0.5) * this.screenShake.intensity);
        shakeApplied = true;
        this.screenShake.duration--;
        if (this.screenShake.duration <= 0) this.screenShake.intensity = 0;
    }
    ctx.fillStyle = this.phase === 'night' ? '#0a0a1a' : '#2a3a2a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= MAP_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE, 0);
        ctx.lineTo(x * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
        ctx.stroke();
    }
    for (let y = 0; y <= MAP_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_SIZE);
        ctx.lineTo(MAP_WIDTH * TILE_SIZE, y * TILE_SIZE);
        ctx.stroke();
    }
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const cell = this.map[y][x];
            const px = x * TILE_SIZE, py = y * TILE_SIZE;
            switch (cell) {
                case 0: ctx.fillStyle = ((x + y) % 2 === 0) ? '#3c2f1a' : '#433520'; break;
                case 1: ctx.fillStyle = '#2c2c2c'; break;
                case 2: ctx.fillStyle = '#8b4513'; break;
                case 3: ctx.fillStyle = '#8b0000'; break;
                case 4: ctx.fillStyle = '#1a4d6a'; break;
                default: ctx.fillStyle = '#433520';
            }
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            if (cell === 4) {
                ctx.fillStyle = 'rgba(100,180,220,0.4)';
                ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('💧', px + TILE_SIZE/2, py + TILE_SIZE/2 + 4);
            }
            if (cell === 2 && x === this.lordPosition.x && y === this.lordPosition.y) this.animateLord(ctx);
            if (cell === 3) {
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('⬆️', px + TILE_SIZE/2, py + TILE_SIZE/2 + 6);
            }
        }
    }
    if (this.phase === 'day') this.renderEnemyPaths(ctx);
    this.traps.forEach(trap => {
        if (trap.used && trap.type !== 'bell') return;
        const trapDef = TRAPS[trap.type];
        const px = trap.x * TILE_SIZE, py = trap.y * TILE_SIZE;
        ctx.fillStyle = trap.activated ? 'rgba(255, 100, 100, 0.5)' : 'rgba(212, 175, 55, 0.3)';
        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(trapDef.icon, px + TILE_SIZE/2, py + TILE_SIZE/2 + 6);
    });
    this.enemies.forEach(enemy => {
        const enemyDef = ENEMIES[enemy.type];
        const hpRatio = enemy.hp / enemy.maxHp;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(enemy.x - 15, enemy.y - 20, 30, 4);
        ctx.fillStyle = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(enemy.x - 15, enemy.y - 20, 30 * hpRatio, 4);
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(enemyDef.emoji, enemy.x, enemy.y + 6);
        let effectY = enemy.y - 25;
        Object.keys(enemy.effects).forEach(effectType => {
            const icons = { poison: '☠️', curse: '👻', trapped: '🕳️', rope: '🪢', confused: '💫' };
            if (icons[effectType]) {
                ctx.font = '12px Arial';
                ctx.fillText(icons[effectType], enemy.x, effectY);
                effectY -= 15;
            }
        });
    });
    this.particles.forEach(particle => {
        ctx.globalAlpha = Math.min(1, (particle.life / 60) * (particle.alpha || 1));
        ctx.font = `${particle.fontSize || 16}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillStyle = particle.color;
        if (particle.type === 'speech') {
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 2;
            ctx.strokeText(particle.char, particle.x, particle.y);
        }
        ctx.fillText(particle.char, particle.x, particle.y);
        ctx.globalAlpha = 1;
    });
    if (this.phase === 'day' && this.selectedTrap) this.drawTrapPreview(ctx);

    // Timeline Vision システムの描画
    if (this.phase === 'day') {
        this.renderTimelineVision();
        this.renderPriorityIndicators();
        this.renderSimulationPanel();
    }

    const lightning = this.lightningFlashUntil > Date.now();
    if (this.phase === 'night' && !lightning) {
        ctx.fillStyle = 'rgba(0, 0, 50, 0.3)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (lightning) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // グリッド座標表示（昼フェーズのみ）
    if (this.phase === 'day' && this.mousePos) {
        const gridX = Math.floor(this.mousePos.x);
        const gridY = Math.floor(this.mousePos.y);
        if (gridX >= 0 && gridX < MAP_WIDTH && gridY >= 0 && gridY < MAP_HEIGHT) {
            ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`[${gridX},${gridY}]`, 5, 15);
        }
    }

    if (shakeApplied) ctx.restore();
};

Game.prototype.renderEnemyPaths = function(ctx) {
    const flowField = this.calculateFlowField();
    ctx.strokeStyle = 'rgba(255, 120, 100, 0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    this.spawnPoints.forEach(spawn => {
        ctx.beginPath();
        let px = spawn.x, py = spawn.y;
        ctx.moveTo(px * TILE_SIZE + TILE_SIZE/2, py * TILE_SIZE + TILE_SIZE/2);
        for (let step = 0; step < 8; step++) {
            const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
            let bestX = px, bestY = py, bestD = flowField[py][px];
            for (const [dx, dy] of dirs) {
                const nx = px + dx, ny = py + dy;
                if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && flowField[ny][nx] < bestD) {
                    bestD = flowField[ny][nx];
                    bestX = nx; bestY = ny;
                }
            }
            if (bestX === px && bestY === py) break;
            px = bestX; py = bestY;
            ctx.lineTo(px * TILE_SIZE + TILE_SIZE/2, py * TILE_SIZE + TILE_SIZE/2);
        }
        ctx.stroke();
    });
    ctx.setLineDash([]);
};

Game.prototype.drawTrapPreview = function(ctx) {
    const x = Math.floor(this.mousePos.x), y = Math.floor(this.mousePos.y);
    if (!this.isValidPlacement(x, y)) return;
    const trap = TRAPS[this.selectedTrap];
    const px = x * TILE_SIZE + TILE_SIZE/2, py = y * TILE_SIZE + TILE_SIZE/2;
    ctx.save();
    ctx.globalAlpha = 0.35;
    if (this.selectedTrap === 'bomb' && trap.range) {
        ctx.fillStyle = 'rgba(255, 80, 80, 0.25)';
        ctx.beginPath();
        ctx.arc(px, py, (trap.range || 1.5) * TILE_SIZE, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = this.money >= trap.cost ? '#b8d4a8' : '#e08080';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${trap.cost}G`, px, py - 18);
    ctx.restore();
};

Game.prototype.updateUI = function() {
    document.getElementById('stageDisplay').textContent = this.currentStage + 1;
    document.getElementById('moneyDisplay').textContent = this.money;
    if (this.phase === 'day') {
        document.getElementById('timerDisplay').textContent = `⏰ ${this.dayTimer}秒`;
        document.getElementById('phaseDisplay').textContent = '昼（準備中）';
    } else if (this.phase === 'night') {
        document.getElementById('timerDisplay').textContent = '⏰ ---';
        document.getElementById('phaseDisplay').textContent = '夜（警戒中）';
    }
    const sleepFill = document.getElementById('sleepFill');
    const sleepLabel = document.getElementById('sleepLabel');
    sleepFill.style.width = `${Math.max(0, this.sleepGauge)}%`;
    sleepFill.textContent = `${Math.floor(this.sleepGauge)}%`;
    sleepFill.className = 'sleep-fill';
    if (this.sleepGauge <= 25) { sleepFill.classList.add('danger'); sleepLabel.textContent = '😡 激怒'; }
    else if (this.sleepGauge <= 50) { sleepFill.classList.add('warning'); sleepLabel.textContent = '😪 うとうと'; }
    else sleepLabel.textContent = '😴 ぐっすり';
    document.getElementById('readyBtn').style.display = this.phase === 'day' ? 'inline-block' : 'none';
    const lordEl = document.getElementById('lordSleepTalk');
    if (lordEl) lordEl.textContent = this.phase === 'night' && this.lordSleepTalkText ? `殿「${this.lordSleepTalkText}」` : '';
    const rojinEl = document.getElementById('rojinMonologue');
    if (rojinEl) rojinEl.textContent = this.phase === 'night' && this.rojinMonologueText ? `左近「${this.rojinMonologueText}」` : '';
};

Game.prototype.showMessage = function(text) {
    const display = document.getElementById('messageDisplay');
    display.textContent = text;
    display.style.animation = 'none';
    setTimeout(() => { display.style.animation = 'pulse 0.5s'; }, 10);
};

Game.prototype.addParticle = function(x, y, char, color) {
    this.particles.push({ x, y, char, color, life: 60 });
};

Game.prototype.playSound = function(type) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        const t = audioContext.currentTime;
        const sounds = {
            place: [600, 0.1, 0.1],
            explosion: [150, 0.2, 0.3],
            bell: [800, 0.15, 0.2],
            defeat: [300, 0.1, 0.15],
            victory: [700, 0.15, 0.4],
            crash: [200, 0.15, 0.2]
        };
        const [freq, gain, dur] = sounds[type] || [440, 0.1, 0.1];
        oscillator.frequency.value = freq;
        gainNode.gain.value = gain;
        oscillator.start(t);
        oscillator.stop(t + dur);
    } catch (e) {}
};

/**
 * Timeline Vision 描画レイヤー
 * 昼フェーズに敵の移動軌跡を時間軸付きで表示
 */
Game.prototype.renderTimelineVision = function() {
    if (this.phase !== 'day' || !this.timeline) return;

    const ctx = this.ctx;
    const timelines = this.timeline.getTimelineForRendering();

    if (!timelines || timelines.length === 0) return;

    // 半透明のオーバーレイ背景
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#0066ff';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.globalAlpha = 1.0;

    // 敵ごとに移動軌跡を描画
    timelines.forEach((timeline, index) => {
        this.renderEnemyTimelinePath(timeline);
    });

    ctx.restore();
};

/**
 * 敵1体の移動軌跡を描画
 */
Game.prototype.renderEnemyTimelinePath = function(timeline) {
    const ctx = this.ctx;
    const timelineData = timeline.timeline;

    if (!timelineData || timelineData.length === 0) return;

    // 敵の優先度に応じた色を決定
    const colorMap = {
        'CRITICAL': '#cc0000',   // 深い赤
        'HIGH': '#ff6600',       // オレンジ
        'MEDIUM': '#ffcc00',     // 黄
        'LOW': '#0066cc'         // 青
    };
    const color = colorMap[timeline.priority] || '#999999';

    // 移動軌跡を線で表示
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();

    timelineData.forEach((pos, index) => {
        const px = pos.x * TILE_SIZE + TILE_SIZE / 2;
        const py = pos.y * TILE_SIZE + TILE_SIZE / 2;

        if (index === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    });

    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // 各時刻のノードを描画（パルスアニメーション付き）
    timelineData.forEach((pos, frameIndex) => {
        const px = pos.x * TILE_SIZE + TILE_SIZE / 2;
        const py = pos.y * TILE_SIZE + TILE_SIZE / 2;

        // 時刻に応じた色グラデーション
        let nodeColor = color;
        const progress = frameIndex / timelineData.length;

        // パルス効果
        const pulseScale = 1 + Math.sin(Date.now() * 0.01 + frameIndex) * 0.3;
        const radius = 4 * pulseScale;

        // ノードを描画
        ctx.fillStyle = nodeColor;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();

        // ノードの枠線
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 時刻テキスト表示（主要なノードのみ）
        if (frameIndex % 5 === 0) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${frameIndex}f`, px, py - 10);
        }
    });

    ctx.globalAlpha = 1.0;

    // 敵タイプのラベルを表示（軌跡の開始地点）
    if (timelineData.length > 0) {
        const startPos = timelineData[0];
        const labelX = startPos.x * TILE_SIZE + TILE_SIZE / 2;
        const labelY = startPos.y * TILE_SIZE + TILE_SIZE / 2 - 20;

        const enemyDef = ENEMIES[timeline.type];
        if (enemyDef) {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.9;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${enemyDef.emoji}${enemyDef.name}`, labelX, labelY);
        }
    }

    ctx.globalAlpha = 1.0;
};

/**
 * 優先度インジケーターを描画
 */
Game.prototype.renderPriorityIndicators = function() {
    if (this.phase !== 'day' || !this.timeline) return;

    const ctx = this.ctx;
    const timelines = this.timeline.getTimelineForRendering();

    ctx.save();

    // UIパネルエリアに優先度一覧を表示（右上）
    const panelX = this.canvas.width - 150;
    const panelY = 10;
    const panelWidth = 140;
    const panelHeight = timelines.length * 20 + 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('敵優先度', panelX + 5, panelY + 12);

    // 優先度順に表示
    timelines.forEach((timeline, index) => {
        const yPos = panelY + 25 + (index * 18);
        const enemyDef = ENEMIES[timeline.type];
        const scorePercent = Math.round(timeline.priorityScore * 100);

        // 優先度バー
        const colorMap = {
            'CRITICAL': '#cc0000',
            'HIGH': '#ff6600',
            'MEDIUM': '#ffcc00',
            'LOW': '#0066cc'
        };
        const color = colorMap[timeline.priority] || '#999999';

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(panelX + 5, yPos - 8, (scorePercent / 100) * 80, 10);

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Arial';
        ctx.fillText(`${enemyDef ? enemyDef.name : timeline.type} ${scorePercent}%`, panelX + 8, yPos);
    });

    ctx.restore();
};

/**
 * シミュレーション結果パネルを描画
 */
Game.prototype.renderSimulationPanel = function() {
    if (this.phase !== 'day') return;

    const ctx = this.ctx;
    const results = this.getSimulationResults();

    if (!results || results.length === 0) return;

    ctx.save();

    // パネルサイズ
    const panelWidth = this.canvas.width * 0.95;
    const panelHeight = 100;
    const panelX = (this.canvas.width - panelWidth) / 2;
    const panelY = this.canvas.height - panelHeight - 10;

    // 背景
    ctx.fillStyle = 'rgba(20, 20, 40, 0.9)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // 枠線
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // タイトル
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('【複数案シミュレーション結果】', panelX + 10, panelY + 20);

    // 各シナリオの結果を表示
    results.forEach((result, index) => {
        const xOffset = panelX + 10 + (index * (panelWidth / 3 - 10));
        const yOffset = panelY + 35;

        // シナリオラベル
        ctx.fillStyle = index === 0 ? '#ffff00' : '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.fillText(`案${result.scenarioId}`, xOffset, yOffset);

        // 効率値
        ctx.fillStyle = '#00ff00';
        ctx.font = '10px Arial';
        ctx.fillText(`効率値: ${result.efficiency}%`, xOffset, yOffset + 16);

        // 敵撃破数
        ctx.fillStyle = '#ffaaff';
        ctx.fillText(`撃破: ${result.enemiesDefeated}/${result.enemyCount}`, xOffset, yOffset + 32);

        // 費用
        ctx.fillStyle = '#ffdd00';
        ctx.fillText(`費用: ${result.goldSpent}G`, xOffset, yOffset + 48);

        // 推奨マーク（最高効率）
        if (result.efficiency === Math.max(...results.map(r => r.efficiency))) {
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 14px Arial';
            ctx.fillText('★', xOffset + 70, yOffset - 5);
        }
    });

    ctx.restore();
};
