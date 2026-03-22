/**
 * 殿、ご安眠を。— Timeline Vision System
 * 敵の移動軌跡を時間軸付きで計算・可視化する
 * game.js から呼び出される
 */

class TimelineSystem {
    constructor(game) {
        this.game = game;
        this.enemyTimelines = [];      // 敵ごとの時間軸データ
        this.pathCache = new Map();    // 計算済みパスのキャッシュ
        this.simulationResults = [];   // 複数案シミュレーション結果
        this.selectedScenario = null;  // 選択中のシナリオ
    }

    /**
     * ステージ開始時にすべての敵の移動予測を計算
     */
    calculateAllEnemyTimelines(stage, waves) {
        this.enemyTimelines = [];
        let enemyIndex = 0;

        waves.forEach((waveData, waveIndex) => {
            waveData.enemies.forEach(enemyType => {
                const enemyClass = ENEMIES[enemyType];
                const enemy = {
                    id: `wave${waveIndex}-enemy${enemyIndex}`,
                    type: enemyType,
                    ...enemyClass
                };

                const timeline = this.predictEnemyTimeline(enemy, stage);
                this.enemyTimelines.push({
                    enemyId: enemy.id,
                    type: enemyType,
                    waveIndex: waveIndex,
                    timeline: timeline,
                    priorityScore: this.calculatePriorityScore(timeline, enemyClass),
                    vulnerabilities: this.calculateVulnerabilities(enemyType),
                    recommendedTraps: this.getRecommendedTraps(enemyType)
                });

                enemyIndex++;
            });
        });

        // 優先度でソート
        this.enemyTimelines.sort((a, b) => b.priorityScore - a.priorityScore);
    }

    /**
     * 敵の移動軌跡を時間軸付きで計算（A*アルゴリズム）
     * @param {Object} enemy - 敵オブジェクト
     * @param {Object} stage - ステージ情報
     * @returns {Array} 時系列位置情報
     */
    predictEnemyTimeline(enemy, stage) {
        const cacheKey = `${enemy.type}-${stage.id}`;
        if (this.pathCache.has(cacheKey)) {
            return this.pathCache.get(cacheKey);
        }

        // ゴール位置（殿の間）
        const targetX = this.game.lordPosition.x;
        const targetY = this.game.lordPosition.y;

        // スタート位置（敵の侵入口）
        const startPoints = this.game.spawnPoints || [{ x: 1, y: Math.floor(MAP_HEIGHT / 2) }];
        const startPos = startPoints[0];

        // 簡易A*で経路計算
        const path = this.aStarPath(startPos.x, startPos.y, targetX, targetY);

        // 敵の速度に応じてタイムスタンプを付与
        const timeline = [];
        let currentTime = 0;
        const timePerTile = 2000 / (enemy.speed || 1); // ミリ秒

        path.forEach((pos, index) => {
            timeline.push({
                t: index,              // フレーム数
                time: currentTime,     // ミリ秒
                x: pos.x,
                y: pos.y,
                status: this.getPositionStatus(pos.x, pos.y, targetX, targetY),
                vulnerable: true
            });
            currentTime += timePerTile;
        });

        this.pathCache.set(cacheKey, timeline);
        return timeline;
    }

    /**
     * A*アルゴリズムで最短経路を計算
     */
    aStarPath(startX, startY, goalX, goalY) {
        const openSet = [{ x: startX, y: startY, g: 0, h: this.heuristic(startX, startY, goalX, goalY) }];
        const closedSet = [];
        const cameFrom = new Map();

        while (openSet.length > 0) {
            // f値が最小のノードを選択
            let current = openSet[0];
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].g + openSet[i].h < current.g + current.h) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }

            if (current.x === goalX && current.y === goalY) {
                // ゴール到達、経路を再構築
                const path = [{ x: goalX, y: goalY }];
                let curr = `${current.x},${current.y}`;
                while (cameFrom.has(curr)) {
                    const prev = cameFrom.get(curr);
                    path.unshift(prev);
                    curr = `${prev.x},${prev.y}`;
                }
                return path;
            }

            openSet.splice(currentIndex, 1);
            closedSet.push(current);

            // 隣接ノードを探索
            const neighbors = this.getWalkableNeighbors(current.x, current.y);
            neighbors.forEach(neighbor => {
                if (closedSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) return;

                const g = current.g + 1;
                const h = this.heuristic(neighbor.x, neighbor.y, goalX, goalY);
                const existingOpen = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);

                if (!existingOpen || g < existingOpen.g) {
                    if (existingOpen) {
                        openSet.splice(openSet.indexOf(existingOpen), 1);
                    }
                    openSet.push({ x: neighbor.x, y: neighbor.y, g, h });
                    cameFrom.set(`${neighbor.x},${neighbor.y}`, { x: current.x, y: current.y });
                }
            });
        }

        // 経路が見つからない場合は直線経路
        return this.straightPath(startX, startY, goalX, goalY);
    }

    /**
     * ヒューリスティック関数（マンハッタン距離）
     */
    heuristic(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);
    }

    /**
     * 歩行可能な隣接セルを取得
     */
    getWalkableNeighbors(x, y) {
        const neighbors = [];
        const directions = [
            { dx: 0, dy: -1 },  // 上
            { dx: 1, dy: 0 },   // 右
            { dx: 0, dy: 1 },   // 下
            { dx: -1, dy: 0 }   // 左
        ];

        directions.forEach(dir => {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
                const cell = this.game.map[ny] ? this.game.map[ny][nx] : null;
                // セルが歩行可能（0=通路, 2=庭, 3=殿の間など）
                if (cell !== null && (cell === 0 || cell === 2 || cell === 3)) {
                    neighbors.push({ x: nx, y: ny });
                }
            }
        });

        return neighbors;
    }

    /**
     * 直線経路（代替）
     */
    straightPath(startX, startY, goalX, goalY) {
        const path = [];
        const steps = Math.max(Math.abs(goalX - startX), Math.abs(goalY - startY));
        for (let i = 0; i <= steps; i++) {
            const x = Math.round(startX + (goalX - startX) * (i / steps));
            const y = Math.round(startY + (goalY - startY) * (i / steps));
            path.push({ x, y });
        }
        return path;
    }

    /**
     * 位置の状態を判定
     */
    getPositionStatus(x, y, targetX, targetY) {
        const distance = Math.abs(x - targetX) + Math.abs(y - targetY);
        if (distance <= 1) return "殿の間到達";
        if (distance <= 3) return "最終防衛ライン";
        if (distance <= 6) return "危険圏内";
        return "移動中";
    }

    /**
     * 敵の優先度スコアを計算（0.0-1.0）
     */
    calculatePriorityScore(timeline, enemyClass) {
        if (!timeline || timeline.length === 0) return 0;

        // ゴール到達時間が短い → 優先度が高い
        const arrivalTime = timeline[timeline.length - 1].time || 10000;
        const arrivalScore = Math.max(0, 1 - (arrivalTime / 10000));

        // HP が高い → 優先度が高い（倒しにくい）
        const hpScore = Math.min(1, (enemyClass.hp || 30) / 300);

        // 複合スコア
        return (arrivalScore * 0.6) + (hpScore * 0.4);
    }

    /**
     * 敵の弱点属性を計算
     */
    calculateVulnerabilities(enemyType) {
        const vulnerabilities = {
            poison: 1.0,
            curse: 1.0,
            fire: 1.0,
            pitfall: 1.0,
            rope: 1.0
        };

        // 敵の種類に応じて弱点を設定（config.js の ENEMIES キー: grunt, ninja, brute, illusionist, boss）
        switch (enemyType) {
            case "ninja":
                vulnerabilities.rope = 1.3;
                vulnerabilities.poison = 0.9;
                break;
            case "brute":
                vulnerabilities.fire = 1.2;
                vulnerabilities.pitfall = 0.8;
                break;
            case "illusionist":
                vulnerabilities.fire = 1.1;
                vulnerabilities.poison = 1.1;
                break;
            case "boss":
                vulnerabilities.rope = 0.5;
                vulnerabilities.curse = 0.5;
                vulnerabilities.fire = 0.5;
                vulnerabilities.poison = 0.5;
                break;
        }

        return vulnerabilities;
    }

    /**
     * 敵の種類に応じた推奨罠を取得
     */
    getRecommendedTraps(enemyType) {
        const recommendations = [];

        switch (enemyType) {
            case "grunt":
                recommendations.push(
                    { trapType: "毒壺", effectiveness: 1.0 },
                    { trapType: "落とし穴", effectiveness: 0.9 }
                );
                break;
            case "ninja":
                recommendations.push(
                    { trapType: "縄罠", effectiveness: 1.3 },
                    { trapType: "煙玉", effectiveness: 1.0 }
                );
                break;
            case "brute":
                recommendations.push(
                    { trapType: "火薬玉", effectiveness: 1.2 },
                    { trapType: "油皿", effectiveness: 1.1 }
                );
                break;
            case "illusionist":
                recommendations.push(
                    { trapType: "火薬玉", effectiveness: 1.1 },
                    { trapType: "毒壺", effectiveness: 1.1 }
                );
                break;
            case "boss":
                recommendations.push(
                    { trapType: "釣り天井", effectiveness: 1.0 },
                    { trapType: "火薬玉", effectiveness: 0.5 },
                    { trapType: "縄罠", effectiveness: 0.5 }
                );
                break;
        }

        return recommendations;
    }

    /**
     * 複数案のシミュレーション
     * @param {Array<Array>} scenarios - 罠配置案（最大3つ）
     * @returns {Array} シミュレーション結果
     */
    simulateScenarios(scenarios) {
        this.simulationResults = [];

        scenarios.forEach((trapPlacement, index) => {
            const result = this.simulateSingleScenario(
                trapPlacement,
                String.fromCharCode(65 + index)  // 'A', 'B', 'C'
            );
            this.simulationResults.push(result);
        });

        // 効率値でソート
        this.simulationResults.sort((a, b) => b.efficiency - a.efficiency);
        return this.simulationResults;
    }

    /**
     * 1つのシナリオをシミュレート
     */
    simulateSingleScenario(trapPlacement, scenarioId) {
        let enemiesDefeated = 0;
        let totalDamage = 0;
        let goldSpent = 0;
        const trapSynergies = [];

        // 各敵について、配置された罠がヒットするか判定
        this.enemyTimelines.forEach(enemyTimeline => {
            let enemyDefeated = false;
            let damage = 0;

            trapPlacement.forEach(trap => {
                const trapData = TRAPS[trap.type];
                if (!trapData) return;

                // 敵が罠の効果範囲を通過するか判定
                const hit = enemyTimeline.timeline.some(pos => {
                    const distance = Math.abs(pos.x - trap.x) + Math.abs(pos.y - trap.y);
                    return distance <= (trapData.range || 1);
                });

                if (hit) {
                    const vulnerability = enemyTimeline.vulnerabilities[trap.type.toLowerCase()] || 1.0;
                    const calculatedDamage = trapData.damage * vulnerability;
                    damage += calculatedDamage;
                    totalDamage += calculatedDamage;
                }
            });

            // ダメージ判定
            const enemyClass = ENEMIES[enemyTimeline.type];
            if (damage >= (enemyClass.hp || 30)) {
                enemiesDefeated++;
                enemyDefeated = true;
            }
        });

        // 罠配置コスト計算
        trapPlacement.forEach(trap => {
            goldSpent += TRAPS[trap.type].cost;
        });

        // 効率値を計算
        const maxPossibleDamage = this.enemyTimelines.reduce((sum, e) => {
            return sum + (ENEMIES[e.type].hp || 30);
        }, 0);
        const efficiency = Math.min(100, (totalDamage / maxPossibleDamage) * 100);

        // 殿の安眠度を計算
        const enemyCount = this.enemyTimelines.length;
        const lordSleep = Math.max(0, 100 - ((enemyCount - enemiesDefeated) * 8));

        return {
            scenarioId: scenarioId,
            efficiency: Math.round(efficiency),
            enemiesDefeated: enemiesDefeated,
            enemyCount: enemyCount,
            goldSpent: goldSpent,
            lordSleep: lordSleep,
            totalDamage: Math.round(totalDamage),
            trapPlacements: trapPlacement,
            synergies: this.calculateSynergies(trapPlacement),
            timestamp: Date.now()
        };
    }

    /**
     * 罠の連鎖効果を計算
     */
    calculateSynergies(trapPlacement) {
        const synergies = [];

        // 煙玉 → 縄罠
        if (trapPlacement.some(t => t.type === "煙玉") &&
            trapPlacement.some(t => t.type === "縄罠")) {
            synergies.push({
                traps: ["煙玉", "縄罠"],
                bonus: 15,
                description: "迷った敵が縄にかかりやすくなる"
            });
        }

        // 油皿 → 火薬玉
        if (trapPlacement.some(t => t.type === "油皿") &&
            trapPlacement.some(t => t.type === "火薬玉")) {
            synergies.push({
                traps: ["油皿", "火薬玉"],
                bonus: 25,
                description: "引火して広範囲炎上"
            });
        }

        // 毒壺 → 呪い札
        if (trapPlacement.some(t => t.type === "毒壺") &&
            trapPlacement.some(t => t.type === "呪い札")) {
            synergies.push({
                traps: ["毒壺", "呪い札"],
                bonus: 10,
                description: "弱った敵に呪いが伝染しやすい"
            });
        }

        return synergies;
    }

    /**
     * 敵の移動軌跡を取得（ゲーム画面の描画用）
     */
    getTimelineForRendering() {
        return this.enemyTimelines.map(tl => ({
            enemyId: tl.enemyId,
            type: tl.type,
            timeline: tl.timeline,
            priorityScore: tl.priorityScore,
            priority: this.getPriorityLevel(tl.priorityScore)
        }));
    }

    /**
     * 優先度レベルを取得（色分け用）
     */
    getPriorityLevel(score) {
        if (score >= 0.8) return "CRITICAL";    // 深い赤
        if (score >= 0.6) return "HIGH";         // オレンジ
        if (score >= 0.4) return "MEDIUM";       // 黄
        return "LOW";                            // 青
    }

    /**
     * シミュレーション結果を取得
     */
    getSimulationResults() {
        return this.simulationResults;
    }

    /**
     * シナリオを確定
     */
    confirmScenario(scenarioId) {
        const selected = this.simulationResults.find(r => r.scenarioId === scenarioId);
        if (selected) {
            this.selectedScenario = selected;
            return true;
        }
        return false;
    }

    /**
     * キャッシュをクリア
     */
    clearCache() {
        this.pathCache.clear();
    }
}
