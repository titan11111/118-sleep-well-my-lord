/**
 * 殿、ご安眠を。 — ゲームコア（初期化・昼フェーズ・罠設置・画面シェイク・殿演出）
 * config.js の読み込みを前提とする。
 */
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.resizeCanvas();
        this.ctx = this.canvas.getContext('2d');
        this.phase = 'title';
        this.currentStage = 0;
        this.unlockedStages = 1;
        this.money = 100;
        this.sleepGauge = 100;
        this.dayTimer = 60;
        this.map = [];
        this.traps = [];
        this.enemies = [];
        this.particles = [];
        this.selectedTrap = null;
        this.emergencyTrapAvailable = false;
        this.currentWave = 0;
        this.waveTimer = 0;
        this.waveEnemies = [];
        this.screenShake = { intensity: 0, duration: 0 };
        this.mousePos = { x: 0, y: 0 };
        this.stageStats = { startTime: 0, explosivesUsed: false, maxTrapsPlaced: 0 };
        this.lordSleepTalkTimer = 0;
        this.lordSleepTalkText = '';
        this.lordSleepTalkUntil = 0;
        this.nightSpeed = 1;
        this.rojinMonologueText = '';
        this.rojinMonologueUntil = 0;
        this.lightningFlashUntil = 0;
        this.enemyFreezeUntil = 0;
        this.bossHalfHpShown = false;
        this.lordPosition = { x: MAP_WIDTH - 3, y: Math.floor(MAP_HEIGHT / 2) };
        this.spawnPoints = [{ x: 1, y: Math.floor(MAP_HEIGHT / 2) }];

        // Timeline Vision System の初期化
        this.timeline = new TimelineSystem(this);
        this.scenarioSimulations = [];
        this.selectedScenarioId = null;

        // Timeline Vision UI の初期化
        this.timelineUI = new TimelineVisionUI(this);
        this.timelineUI.setupEventListeners();

        this.loadProgress();
        this.achievements = this.loadAchievements();
        this.setupEventListeners();
        this.setupMouseTracking();
        this.setupViewportSupport();
        this.generateMap();
        this.gameLoop();
    }

    setupMouseTracking() {
        const updatePos = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mousePos.x = ((clientX - rect.left) * scaleX) / TILE_SIZE;
            this.mousePos.y = ((clientY - rect.top) * scaleY) / TILE_SIZE;
        };
        this.canvas.addEventListener('mousemove', (e) => updatePos(e.clientX, e.clientY));
        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length) updatePos(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length) updatePos(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleCanvasClick({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });

        // キーボード ショートカット
        document.addEventListener('keydown', (e) => {
            if (this.phase !== 'day') return;
            const key = parseInt(e.key);
            if (key >= 1 && key <= 9) {
                const trapKeys = Object.keys(TRAPS);
                if (key - 1 < trapKeys.length) {
                    this.selectTrap(trapKeys[key - 1]);
                }
            }
        });
    }

    setupViewportSupport() {
        const syncViewport = () => {
            const viewport = window.visualViewport;
            const width = viewport ? viewport.width : window.innerWidth;
            const height = viewport ? viewport.height : window.innerHeight;
            document.documentElement.style.setProperty('--app-width', `${Math.round(width)}px`);
            document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
            this.resizeCanvas();
        };

        syncViewport();
        window.addEventListener('resize', syncViewport);
        window.addEventListener('orientationchange', syncViewport);

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', syncViewport);
            window.visualViewport.addEventListener('scroll', syncViewport);
        }
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = Math.floor(((e.clientX - rect.left) * scaleX) / TILE_SIZE);
        const y = Math.floor(((e.clientY - rect.top) * scaleY) / TILE_SIZE);
        if (this.phase === 'day' && this.selectedTrap) this.placeTrap(x, y);
        else if (this.phase === 'night' && this.emergencyTrapAvailable) this.placeEmergencyTrap(x, y);
    }

    generateMap() {
        this.map = [];
        for (let y = 0; y < MAP_HEIGHT; y++) {
            const row = [];
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) row.push(1);
                else if (x >= this.lordPosition.x - 1 && x <= this.lordPosition.x + 1 && y >= this.lordPosition.y - 1 && y <= this.lordPosition.y + 1) row.push(2);
                else row.push(0);
            }
            this.map.push(row);
        }
        this.spawnPoints.forEach(p => { this.map[p.y][p.x] = 3; });
        const terrain = STAGE_TERRAIN[this.currentStage];
        if (terrain) terrain.forEach(([x, y]) => { if (this.map[y][x] === 0) this.map[y][x] = 4; });
    }

    calculateFlowField() {
        const distances = Array(MAP_HEIGHT).fill().map(() => Array(MAP_WIDTH).fill(Infinity));
        const queue = [];
        distances[this.lordPosition.y][this.lordPosition.x] = 0;
        queue.push({ x: this.lordPosition.x, y: this.lordPosition.y, dist: 0 });
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        while (queue.length > 0) {
            const current = queue.shift();
            for (const [dx, dy] of directions) {
                const nx = current.x + dx, ny = current.y + dy;
                if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
                    const isPassable = this.map[ny][nx] !== 1 && this.map[ny][nx] !== 4 && !this.getTrapAt(nx, ny, 'spike');
                    const newDist = current.dist + 1;
                    if (isPassable && newDist < distances[ny][nx]) {
                        distances[ny][nx] = newDist;
                        queue.push({ x: nx, y: ny, dist: newDist });
                    }
                }
            }
        }
        return distances;
    }

    showTitle() {
        this.phase = 'title';
        document.getElementById('titleScreen').classList.remove('hidden');
        document.getElementById('stageSelectScreen').classList.add('hidden');
        document.getElementById('resultScreen').classList.add('hidden');
    }

    showStageSelect() {
        this.phase = 'stageSelect';
        document.getElementById('titleScreen').classList.add('hidden');
        document.getElementById('stageSelectScreen').classList.remove('hidden');
        document.getElementById('resultScreen').classList.add('hidden');
        this.renderStageGrid();
    }

    renderStageGrid() {
        const grid = document.getElementById('stageGrid');
        grid.innerHTML = '';
        STAGES.forEach((stage, index) => {
            const card = document.createElement('div');
            card.className = 'stage-card' + (index >= this.unlockedStages ? ' locked' : '');
            card.innerHTML = `<h3>ステージ ${index + 1}</h3><p>${stage.name}</p><p>敵の波: ${stage.enemies.length}</p><p>制限時間: ${stage.dayTime}秒</p>`;
            if (index < this.unlockedStages) card.addEventListener('click', () => this.startStage(index));
            grid.appendChild(card);
        });
    }

    startStage(stageIndex) {
        this.currentStage = stageIndex;
        this.phase = 'day';
        const stage = STAGES[stageIndex];
        this.money = stage.startMoney;
        this.sleepGauge = 100;
        this.dayTimer = stage.dayTime;
        this.traps = [];
        this.enemies = [];
        this.particles = [];
        this.currentWave = 0;
        this.waveTimer = 0;

        // Timeline Vision システムを初期化
        this.initializeTimeline();

        // シミュレーションパネルを表示可能にする
        this.showTimelineVisionUI();
        this.waveEnemies = [...stage.enemies];
        this.wavesCleared = 0;
        this.selectedTrap = null;
        this.emergencyTrapAvailable = false;
        this.stageStats = { startTime: Date.now(), explosivesUsed: false, maxTrapsPlaced: 0 };
        this.spawnPoints = (stage.spawnPoints || [{ x: 1, y: Math.floor(MAP_HEIGHT / 2) }]).map(p => ({ ...p }));
        document.getElementById('titleScreen').classList.add('hidden');
        document.getElementById('stageSelectScreen').classList.add('hidden');
        document.getElementById('resultScreen').classList.add('hidden');
        this.generateMap();
        this.renderTrapPalette();
        this.renderScoutInfo();
        document.getElementById('readyBtn').style.display = 'inline-block';
        this.updateUI();
        this.showMessage(`ステージ ${stageIndex + 1}: ${stage.name} - 罠を配置せよ！`);
        this.startDayTimer();
    }

    startDayTimer() {
        this.dayTimerInterval = setInterval(() => {
            if (this.phase === 'day') {
                this.dayTimer--;
                this.updateUI();
                if (this.dayTimer <= 0) this.startNight();
            }
        }, 1000);
    }

    renderScoutInfo() {
        const el = document.getElementById('scoutInfo');
        if (!el) return;
        if (this.phase !== 'day' || !this.waveEnemies || this.waveEnemies.length === 0) {
            el.innerHTML = '';
            el.style.display = 'none';
            return;
        }
        el.style.display = 'block';
        const names = {};
        this.waveEnemies.forEach(wave => {
            wave.forEach(type => {
                const def = ENEMIES[type];
                const label = `${def.emoji} ${def.name}`;
                names[label] = (names[label] || 0) + 1;
            });
        });
        el.innerHTML = `<strong>斥候情報</strong> 全${this.waveEnemies.length}波／侵入口${this.spawnPoints.length}カ所<br><span>${Object.entries(names).map(([l, n]) => `${l} ×${n}`).join('、')}</span>`;
    }

    renderTrapPalette() {
        const palette = document.getElementById('trapPalette');
        palette.innerHTML = '';
        const trapKeys = Object.keys(TRAPS);
        trapKeys.forEach((key, index) => {
            const trap = TRAPS[key];
            const btn = document.createElement('div');
            btn.className = 'trap-btn' + (this.money < trap.cost ? ' disabled' : '');
            btn.dataset.trapType = key;
            const typeDesc = {
                'area': '範囲',
                'trigger': '罠',
                'alarm': 'アラーム',
                'combo': 'コンボ',
                'wall': '壁'
            };
            const tooltip = `${trap.name} | ${typeDesc[trap.type] || ''} | ${trap.cost}G`;
            btn.setAttribute('data-tooltip', tooltip);
            const hotkey = index < 9 ? `[${index + 1}]` : '';
            btn.innerHTML = `<div style="position:relative;width:100%;"><span style="position:absolute;top:2px;right:4px;font-size:0.8em;opacity:0.7;">${hotkey}</span></div><div class="trap-icon">${trap.icon}</div><div>${trap.name}</div><div class="trap-cost">${trap.cost}G</div>`;
            btn.addEventListener('click', () => this.selectTrap(key));
            palette.appendChild(btn);
        });
    }

    selectTrap(trapType) {
        if (this.phase !== 'day') return;
        const trap = TRAPS[trapType];
        if (this.money < trap.cost) { this.showMessage('所持金が足りません！'); return; }
        this.selectedTrap = trapType;
        this.updateTrapPalette();
        this.showMessage(`${trap.name}を選択しました（${trap.cost}G）`);
    }

    updateTrapPalette() {
        document.querySelectorAll('.trap-btn').forEach(btn => {
            btn.classList.remove('selected');
            const trapType = btn.dataset.trapType;
            const trap = TRAPS[trapType];
            if (this.money < trap.cost) btn.classList.add('disabled');
            else btn.classList.remove('disabled');
            if (trapType === this.selectedTrap) btn.classList.add('selected');
        });
    }

    placeTrap(x, y) {
        if (!this.selectedTrap || this.phase !== 'day') return;
        if (!this.isValidPlacement(x, y)) { this.showMessage('ここには配置できません'); return; }
        const trap = TRAPS[this.selectedTrap];
        const existingTrap = this.getTrapAt(x, y);
        if (existingTrap) {
            const existingTrapDef = TRAPS[existingTrap.type];
            this.money += Math.floor(existingTrapDef.cost * 0.5);
            this.traps = this.traps.filter(t => !(t.x === x && t.y === y));
            this.showMessage(`${existingTrapDef.name}を撤去（${Math.floor(existingTrapDef.cost * 0.5)}G回収）`);
        }
        this.money -= trap.cost;
        this.traps.push({ x, y, type: this.selectedTrap, activated: false, used: false, timer: 0 });
        this.addParticle(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, '✨', '#ffd700');
        this.playSound('place');
        this.stageStats.maxTrapsPlaced = Math.max(this.stageStats.maxTrapsPlaced || 0, this.traps.length);
        if (this.traps.length >= 10) this.checkAchievement('trapMaster');
        this.updateTrapPalette();
        this.updateUI();
    }

    placeEmergencyTrap(x, y) {
        if (!this.emergencyTrapAvailable || this.phase !== 'night') return;
        if (!this.isValidPlacement(x, y) || this.getTrapAt(x, y)) return;
        this.traps.push({ x, y, type: 'pit', activated: false, used: false, timer: 0, emergency: true });
        this.emergencyTrapAvailable = false;
        this.showMessage('緊急罠を設置しました！');
        this.addParticle(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, '⚡', '#ff0000');
    }

    isValidPlacement(x, y) {
        return x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT && (this.map[y][x] === 0);
    }

    getTrapAt(x, y, type = null) {
        return this.traps.find(t => t.x === x && t.y === y && !t.used && (!type || t.type === type));
    }

    shakeScreen(intensity = 8, duration = 18) {
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
        this.screenShake.duration = Math.max(this.screenShake.duration, duration);
    }

    showLordReaction(delta) {
        if (this.phase !== 'night' || delta >= 0) return;
        const px = this.lordPosition.x * TILE_SIZE + TILE_SIZE / 2;
        const py = this.lordPosition.y * TILE_SIZE + TILE_SIZE / 2 - 35;
        let message = '', color = '#ffaa66';
        if (delta <= -10) { message = 'うるさい…'; color = '#ff6666'; }
        else if (delta <= -5) message = 'む…';
        else if (this.sleepGauge > 85 && Math.random() < 0.15) { message = 'zzz…'; color = '#88cc88'; }
        if (message) this.particles.push({ x: px, y: py, vx: 0, vy: -0.4, char: message, color, life: 70, gravity: 0, fontSize: 13, type: 'speech' });
    }

    animateLord(ctx) {
        const px = this.lordPosition.x * TILE_SIZE + TILE_SIZE / 2;
        const py = this.lordPosition.y * TILE_SIZE + TILE_SIZE / 2;
        let lordEmoji = '😴', breathScale = 1, shakeX = 0, shakeY = 0;
        if (this.sleepGauge > 80) breathScale = 1 + Math.sin(Date.now() / 1200) * 0.08;
        else if (this.sleepGauge > 50) { lordEmoji = '😪'; breathScale = 1 + Math.sin(Date.now() / 900) * 0.1; }
        else if (this.sleepGauge > 20) { lordEmoji = '😣'; breathScale = 1 + Math.sin(Date.now() / 600) * 0.12; shakeX = (Math.random() - 0.5) * 1; shakeY = (Math.random() - 0.5) * 1; }
        else { lordEmoji = '😡'; breathScale = 1 + Math.sin(Date.now() / 400) * 0.15; shakeX = (Math.random() - 0.5) * 2; shakeY = (Math.random() - 0.5) * 2; }
        ctx.save();
        ctx.translate(shakeX, shakeY);
        ctx.font = `${Math.floor(22 * breathScale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(lordEmoji, px, py + 6);
        if (this.sleepGauge > 50 && this.phase === 'night') {
            ctx.font = `${6 + Math.sin(Date.now() / 800) * 2}px Arial`;
            ctx.fillText('💤', px + 14, py - 8);
        }
        if (this.sleepGauge < 30 && this.phase === 'night') {
            ctx.font = '11px Arial';
            ctx.fillText('💦', px - 12, py - 4);
            ctx.fillText('💦', px + 12, py - 6);
        }
        ctx.restore();
    }

    startNight() {
        if (this.phase !== 'day') return;
        if (this.dayTimer >= 15) this.checkAchievement('speedPrep');
        clearInterval(this.dayTimerInterval);
        this.phase = 'night';
        this.currentWave = 0;
        this.waveTimer = 0;
        document.getElementById('readyBtn').style.display = 'none';
        document.getElementById('scoutInfo').style.display = 'none';
        document.getElementById('trapPalette').innerHTML = '<p style="text-align: center; color: #ffd700;">夜が来た...見守るのみ</p>';
        this.lordSleepTalkText = '';
        this.lordSleepTalkUntil = 0;
        this.rojinMonologueText = '';
        this.rojinMonologueUntil = 0;
        this.nightSpeed = 1;
        this.bossHalfHpShown = false;
        const speedBtn = document.getElementById('nightSpeedBtn');
        if (speedBtn) { speedBtn.style.display = 'inline-block'; speedBtn.textContent = '⏩ 2倍速'; }
        this.showMessage('夜になりました。敵の侵入に備えよ！');
        this.updateUI();
    }

    toggleNightSpeed() {
        if (this.phase !== 'night') return;
        this.nightSpeed = this.nightSpeed === 1 ? 2 : 1;
        const btn = document.getElementById('nightSpeedBtn');
        if (btn) btn.textContent = this.nightSpeed === 2 ? '⏩ 1倍速' : '⏩ 2倍速';
    }

    showLordSleepTalk() {
        if (this.phase !== 'night') return;
        const now = Date.now();
        if (this.lordSleepTalkUntil > now) return;
        this.lordSleepTalkTimer = (this.lordSleepTalkTimer || 0) + 1;
        if (this.lordSleepTalkTimer < 180) return;
        this.lordSleepTalkTimer = 0;
        if (Math.random() < 0.03 && LORD_SLEEP_TALK_SPECIAL.length) {
            const sp = LORD_SLEEP_TALK_SPECIAL[Math.floor(Math.random() * LORD_SLEEP_TALK_SPECIAL.length)];
            this.lordSleepTalkText = sp.msg;
            this.lordSleepTalkUntil = now + 2500;
            if (sp.effect === 'lightning') this.lightningFlashUntil = now + 800;
            if (sp.effect === 'earthquake') { this.enemyFreezeUntil = now + 1000; this.shakeScreen(15, 30); }
            return;
        }
        let arr = LORD_SLEEP_TALK.high;
        if (this.sleepGauge <= 30) arr = LORD_SLEEP_TALK.low;
        else if (this.sleepGauge <= 60) arr = LORD_SLEEP_TALK.mid;
        this.lordSleepTalkText = arr[Math.floor(Math.random() * arr.length)];
        this.lordSleepTalkUntil = now + 2800;
    }

    setRojinMonologue(text) {
        this.rojinMonologueText = text || '';
        this.rojinMonologueUntil = text ? Date.now() + 4000 : 0;
    }

    addEnemyLine(enemy, trapType) {
        const def = ENEMIES[enemy.type];
        const lines = ENEMY_LINES[enemy.type];
        if (!lines) return;
        const msg = lines[trapType] || lines.default;
        if (!msg) return;
        this.particles.push({
            x: enemy.x, y: enemy.y - 20, vx: 0, vy: -0.3, char: msg, color: '#fffacd',
            life: 90, gravity: 0, fontSize: 11, type: 'speech'
        });
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const maxWidth = Math.max(240, containerRect.width - 4);
        const maxHeight = Math.max(160, containerRect.height - 4);

        // Maintain 15:10 aspect ratio (original was 600x400)
        const aspectRatio = 15 / 10;
        let newWidth = maxWidth;
        let newHeight = newWidth / aspectRatio;

        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * aspectRatio;
        }

        // Set canvas size
        this.canvas.width = Math.floor(newWidth);
        this.canvas.height = Math.floor(newHeight);

        // Recalculate tile size for scaling
        const scaleX = this.canvas.width / 600;
        const scaleY = this.canvas.height / 400;

        // Store scale for rendering
        this.renderScale = Math.min(scaleX, scaleY);
    }

    /**
     * Timeline Vision システムを初期化
     * ステージ選択時に呼び出される
     */
    initializeTimeline() {
        if (!this.timeline) {
            this.timeline = new TimelineSystem(this);
        }

        const stage = STAGES[this.currentStage];
        // config は stage.enemies（波ごとの配列の配列）、Timeline は { enemies: string[] } の配列を期待
        if (!stage || !stage.enemies || !stage.enemies.length) return;

        const waves = stage.enemies.map(waveArray => ({ enemies: waveArray }));

        // すべての敵の移動軌跡を計算
        this.timeline.calculateAllEnemyTimelines(
            { id: this.currentStage, ...stage },
            waves
        );

        console.log('タイムライン計算完了:', this.timeline.getTimelineForRendering());
    }

    /**
     * 複数シナリオのシミュレーションを実行
     * @param {Array<Array>} scenarios - 罠配置案（最大3つ）
     */
    runScenarioSimulations(scenarios) {
        if (!this.timeline) return [];

        this.scenarioSimulations = this.timeline.simulateScenarios(scenarios);
        return this.scenarioSimulations;
    }

    /**
     * シナリオを確定して本ゲームを開始
     * @param {string} scenarioId - 選択したシナリオID ('A', 'B', 'C')
     */
    confirmScenario(scenarioId) {
        if (!this.timeline) return false;

        const confirmed = this.timeline.confirmScenario(scenarioId);
        if (confirmed) {
            this.selectedScenarioId = scenarioId;
            this.traps = [];  // 確認したシナリオの罠配置をコピー
            const scenario = this.timeline.selectedScenario;
            if (scenario && scenario.trapPlacements) {
                this.traps = [...scenario.trapPlacements];
            }

            // UIを更新
            if (this.timelineUI) {
                this.timelineUI.selectedScenario = scenarioId;
            }

            return true;
        }
        return false;
    }

    /**
     * 敵の移動予測を取得（描画用）
     */
    getTimelineDataForRendering() {
        if (!this.timeline) return [];
        return this.timeline.getTimelineForRendering();
    }

    /**
     * シミュレーション結果を取得
     */
    getSimulationResults() {
        if (!this.timeline) return [];
        return this.timeline.getSimulationResults();
    }

    /**
     * Timeline Vision UIを表示・更新
     */
    showTimelineVisionUI() {
        if (!this.timelineUI) return;

        // UIを表示
        this.timelineUI.show();
        this.timelineUI.showScenarioPanel();

        // シミュレーション結果を更新
        this.updateScenarioPanel();
    }

    /**
     * シミュレーションパネルを更新
     */
    updateScenarioPanel() {
        // シミュレーション用のダミー罠配置案を作成
        const scenario1 = this.generateTrapScenario(1);
        const scenario2 = this.generateTrapScenario(2);
        const scenario3 = this.generateTrapScenario(3);

        // シミュレーション実行
        const results = this.runScenarioSimulations([scenario1, scenario2, scenario3]);

        // パネル表示
        results.forEach((result, index) => {
            const cardId = String.fromCharCode(65 + index); // 'A', 'B', 'C'
            const cardEl = document.getElementById(`scenario${cardId}`);
            const statsEl = document.getElementById(`scenario${cardId}-stats`);

            if (statsEl) {
                const synergiesText = result.synergies.length > 0
                    ? `<div class="scenario-stat-row"><span class="scenario-stat-label">連鎖効果</span><span class="scenario-stat-value positive">+${result.synergies.length}種</span></div>`
                    : '';

                statsEl.innerHTML = `
                    <div class="scenario-stat-row">
                        <span class="scenario-stat-label">効率値</span>
                        <span class="scenario-stat-value">${result.efficiency}%</span>
                    </div>
                    <div class="scenario-stat-row">
                        <span class="scenario-stat-label">敵撃破</span>
                        <span class="scenario-stat-value">${result.enemiesDefeated}/${result.enemyCount}</span>
                    </div>
                    <div class="scenario-stat-row">
                        <span class="scenario-stat-label">費用</span>
                        <span class="scenario-stat-value">${result.goldSpent}G</span>
                    </div>
                    <div class="scenario-stat-row">
                        <span class="scenario-stat-label">安眠度</span>
                        <span class="scenario-stat-value">${result.lordSleep}%</span>
                    </div>
                    ${synergiesText}
                `;
            }

            // 最高効率案にマークをつける
            if (cardEl) {
                cardEl.classList.remove('best');
                if (result.efficiency === Math.max(...results.map(r => r.efficiency))) {
                    cardEl.classList.add('best');
                }
            }
        });
    }

    /**
     * テスト用のランダム罠配置案を生成
     */
    generateTrapScenario(seed) {
        const trapTypes = Object.keys(TRAPS);
        const scenario = [];
        // 簡易シード付き乱数（seedrandom ライブラリなしで再現可能な乱数）
        const seeded = (s) => {
            const x = Math.sin((seed + this.currentStage) * 9999 + s * 1234) * 10000;
            return x - Math.floor(x);
        };

        // ランダムに3〜5個の罠を配置
        const trapCount = 3 + Math.floor(seeded(1) * 3);
        for (let i = 0; i < trapCount; i++) {
            const trapType = trapTypes[Math.floor(seeded(i + 10) * trapTypes.length)];
            const x = 2 + Math.floor(seeded(i + 20) * (MAP_WIDTH - 4));
            const y = 2 + Math.floor(seeded(i + 30) * (MAP_HEIGHT - 4));

            // マップが歩行可能か確認
            const cell = this.map[y] ? this.map[y][x] : null;
            if (cell === 0 || cell === 2) {
                scenario.push({ type: trapType, x, y });
            }
        }

        return scenario;
    }
}
