/**
 * 殿、ご安眠を。— Timeline Vision UI コンポーネント管理
 * UIパネルの表示・更新・インタラクション処理を一元管理
 */

class TimelineVisionUI {
    constructor(game) {
        this.game = game;
        this.isVisible = false;
        this.selectedScenario = null;
        this.initializeElements();
    }

    /**
     * DOM要素への参照を取得
     */
    initializeElements() {
        this.elements = {
            timelinePanel: document.getElementById('timelineVisionPanel'),
            enemyList: document.getElementById('timelineEnemyList'),
            scenarioPanel: document.getElementById('scenarioPanel'),
            scenarioContent: document.getElementById('scenarioContent'),
            scenarioA: document.getElementById('scenarioA'),
            scenarioB: document.getElementById('scenarioB'),
            scenarioC: document.getElementById('scenarioC'),
            messageDisplay: document.getElementById('messageDisplay')
        };
    }

    /**
     * Timeline Vision パネルを表示
     */
    show() {
        if (this.elements.timelinePanel) {
            this.elements.timelinePanel.classList.remove('hidden');
            this.isVisible = true;
            this.updateEnemyList();
        }
    }

    /**
     * Timeline Vision パネルを非表示
     */
    hide() {
        if (this.elements.timelinePanel) {
            this.elements.timelinePanel.classList.add('hidden');
            this.isVisible = false;
        }
    }

    /**
     * 敵リストパネルを更新
     */
    updateEnemyList() {
        if (!this.elements.enemyList) return;

        const timelines = this.game.getTimelineDataForRendering();
        this.elements.enemyList.innerHTML = '';

        timelines.forEach((timeline, index) => {
            const enemyDef = ENEMIES[timeline.type];
            const div = this.createEnemyListItem(timeline, enemyDef);
            this.elements.enemyList.appendChild(div);
        });
    }

    /**
     * 敵リスト項目をHTML要素として生成
     */
    createEnemyListItem(timeline, enemyDef) {
        const div = document.createElement('div');
        div.className = `timeline-enemy-item ${timeline.priority.toLowerCase()}`;

        const priorityPercent = Math.round(timeline.priorityScore * 100);

        div.innerHTML = `
            <div class="timeline-enemy-name">
                ${enemyDef ? enemyDef.emoji + ' ' + enemyDef.name : timeline.type}
            </div>
            <div class="timeline-enemy-priority">
                <span>優先度</span>
                <span>${priorityPercent}%</span>
            </div>
            <div class="priority-bar">
                <div class="priority-bar-fill" style="width: ${priorityPercent}%;"></div>
            </div>
        `;

        return div;
    }

    /**
     * シミュレーションパネルを表示
     */
    showScenarioPanel() {
        if (this.elements.scenarioPanel) {
            this.elements.scenarioPanel.classList.remove('hidden');
            this.updateScenarioCards();
        }
    }

    /**
     * シミュレーションパネルを非表示
     */
    hideScenarioPanel() {
        if (this.elements.scenarioPanel) {
            this.elements.scenarioPanel.classList.add('hidden');
        }
    }

    /**
     * シミュレーション結果カードを更新
     */
    updateScenarioCards() {
        const results = this.game.getSimulationResults();

        if (!results || results.length === 0) {
            this.showMessage('シミュレーション計算中...');
            return;
        }

        // 最高効率を取得
        const maxEfficiency = Math.max(...results.map(r => r.efficiency));

        results.forEach((result, index) => {
            const cardId = String.fromCharCode(65 + index); // 'A', 'B', 'C'
            this.updateScenarioCard(cardId, result, result.efficiency === maxEfficiency);
        });
    }

    /**
     * 個別シナリオカードを更新
     */
    updateScenarioCard(scenarioId, result, isBest) {
        const cardEl = document.getElementById(`scenario${scenarioId}`);
        const statsEl = document.getElementById(`scenario${scenarioId}-stats`);

        if (!statsEl) return;

        // シナリオカードのクラス更新
        if (cardEl) {
            cardEl.classList.toggle('best', isBest);
            if (isBest) {
                cardEl.style.zIndex = 10;
            }
        }

        // 統計情報を表示
        const synergiesHtml = result.synergies.length > 0
            ? `<div class="scenario-stat-row">
                   <span class="scenario-stat-label">📊 連鎖効果</span>
                   <span class="scenario-stat-value positive">+${result.synergies.reduce((sum, s) => sum + s.bonus, 0)}%</span>
               </div>`
            : '';

        const lordSleepClass = result.lordSleep >= 80
            ? 'positive'
            : result.lordSleep >= 50
            ? 'high'
            : 'critical';

        statsEl.innerHTML = `
            <div class="scenario-stat-row">
                <span class="scenario-stat-label">⚡ 効率値</span>
                <span class="scenario-stat-value ${isBest ? 'positive' : ''}">${result.efficiency}%</span>
            </div>
            <div class="scenario-stat-row">
                <span class="scenario-stat-label">🗡️ 敵撃破</span>
                <span class="scenario-stat-value">${result.enemiesDefeated}/${result.enemyCount}</span>
            </div>
            <div class="scenario-stat-row">
                <span class="scenario-stat-label">💰 費用</span>
                <span class="scenario-stat-value">${result.goldSpent}G</span>
            </div>
            <div class="scenario-stat-row">
                <span class="scenario-stat-label">😴 安眠度</span>
                <span class="scenario-stat-value ${lordSleepClass}">${result.lordSleep}%</span>
            </div>
            ${synergiesHtml}
        `;

        // ベストケースへのツールチップを追加
        if (isBest && cardEl) {
            cardEl.title = '最高効率！このシナリオをお勧めします。';
        }
    }

    /**
     * メッセージを表示
     */
    showMessage(text) {
        if (this.elements.messageDisplay) {
            this.elements.messageDisplay.textContent = text;
            this.elements.messageDisplay.style.animation = 'none';
            setTimeout(() => {
                this.elements.messageDisplay.style.animation = 'pulse 0.5s';
            }, 10);
        }
    }

    /**
     * シナリオを選択時の処理
     */
    selectScenario(scenarioId) {
        if (!scenarioId || scenarioId.length !== 1) return;

        const results = this.game.getSimulationResults();
        const selectedResult = results.find(r => r.scenarioId === scenarioId);

        if (!selectedResult) {
            this.showMessage('シナリオが見つかりません');
            return;
        }

        // 視覚的フィードバック
        this.playSelectionAnimation(scenarioId);

        // 確認メッセージを表示
        this.showMessage(
            `案${scenarioId}を選択しました（効率値: ${selectedResult.efficiency}%）`
        );

        // シナリオを確定
        if (this.game.confirmScenario(scenarioId)) {
            this.selectedScenario = scenarioId;
            setTimeout(() => {
                this.hideScenarioPanel();
                this.showMessage('罠配置を確定しました。準備完了ボタンを押してください。');
            }, 500);
        }
    }

    /**
     * シナリオ選択時のアニメーション
     */
    playSelectionAnimation(scenarioId) {
        const cardEl = document.getElementById(`scenario${scenarioId}`);
        if (!cardEl) return;

        cardEl.style.animation = 'none';
        setTimeout(() => {
            cardEl.style.animation = 'pulse 0.6s';
        }, 10);
    }

    /**
     * 優先度インジケーターの色を取得
     */
    getPriorityColor(priority) {
        const colorMap = {
            'CRITICAL': '#cc0000',
            'HIGH': '#ff6600',
            'MEDIUM': '#ffcc00',
            'LOW': '#0066cc'
        };
        return colorMap[priority] || '#999999';
    }

    /**
     * 複数案シミュレーションを手動実行
     */
    runSimulation() {
        if (!this.game.timeline) {
            this.showMessage('タイムラインシステムが初期化されていません');
            return;
        }

        this.showMessage('複数案をシミュレーション中...');

        // ゲーム側でシミュレーション実行（すでに実装済み）
        this.game.updateScenarioPanel();

        setTimeout(() => {
            this.showMessage('シミュレーション完了！最適な案を選択してください。');
            this.showScenarioPanel();
        }, 300);
    }

    /**
     * UI要素のイベントリスナーを設定
     */
    setupEventListeners() {
        // シナリオカードのクリックイベント
        ['A', 'B', 'C'].forEach(id => {
            const cardEl = document.getElementById(`scenario${id}`);
            if (cardEl) {
                cardEl.addEventListener('click', () => this.selectScenario(id));
            }

            const btnEl = document.querySelector(`#scenario${id} .scenario-select-btn`);
            if (btnEl) {
                btnEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectScenario(id);
                });
            }
        });

        // パネル閉じるボタン
        const closeButtons = document.querySelectorAll('.btn-close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const panel = btn.closest('[class*="-panel"]');
                if (panel) {
                    panel.classList.add('hidden');
                }
            });
        });
    }

    /**
     * ゲーム状態に応じてUIを更新
     */
    updateForGamePhase(phase) {
        if (phase === 'day') {
            this.show();
            this.showScenarioPanel();
        } else if (phase === 'night') {
            this.hide();
            this.hideScenarioPanel();
        } else {
            this.hide();
            this.hideScenarioPanel();
        }
    }

    /**
     * UI全体をリセット
     */
    reset() {
        this.selectedScenario = null;
        this.isVisible = false;
        if (this.elements.enemyList) {
            this.elements.enemyList.innerHTML = '';
        }
    }
}
