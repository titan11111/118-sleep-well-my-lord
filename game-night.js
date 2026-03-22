/**
 * 殿、ご安眠を。 — 夜フェーズ・戦闘ロジック（敵スポーン・移動・罠発動・勝敗）
 */
Game.prototype.gameLoop = function() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
};

Game.prototype.update = function() {
    const speed = this.nightSpeed || 1;
    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= speed;
        if (p.vy !== undefined) p.y += p.vy * speed;
        else p.y -= 1 * speed;
        if (p.life <= 0) this.particles.splice(i, 1);
    }
    if (this.phase !== 'night') return;
    this.showLordSleepTalk();
    this.rojinMonologueTick = (this.rojinMonologueTick || 0) + 1;
    if (this.rojinMonologueTick >= 350 && ROJIN_MONOLOGUE.length) {
        this.rojinMonologueTick = 0;
        this.setRojinMonologue(ROJIN_MONOLOGUE[Math.floor(Math.random() * ROJIN_MONOLOGUE.length)]);
    }
    this.waveTimer += speed;
    if (this.currentWave < this.waveEnemies.length && this.waveTimer >= 180) {
        this.spawnWave(this.currentWave);
        this.currentWave++;
        this.waveTimer = 0;
    }
    const flowField = this.calculateFlowField();
    const freeze = Date.now() < this.enemyFreezeUntil;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        this.updateEnemy(enemy, flowField, freeze);
        if (enemy.hp <= 0) {
            const enemyDef = ENEMIES[enemy.type];
            const waveIdx = enemy.waveIndex;
            if (enemy.type === 'boss' && ENEMY_LINES.boss && ENEMY_LINES.boss.defeat) {
                this.particles.push({ x: enemy.x, y: enemy.y - 25, vx: 0, vy: -0.4, char: ENEMY_LINES.boss.defeat, color: '#ffcccc', life: 120, gravity: 0, fontSize: 12, type: 'speech' });
            }
            this.checkAchievement('firstBlood');
            this.money += enemyDef.reward;
            this.addParticle(enemy.x, enemy.y, '💰', '#ffd700');
            this.enemies.splice(i, 1);
            this.playSound('defeat');
            if (waveIdx != null && !this.enemies.some(e => e.waveIndex === waveIdx)) {
                this.wavesCleared = (this.wavesCleared || 0) + 1;
                this.sleepGauge = Math.min(100, this.sleepGauge + 10);
                this.showMessage(`第${waveIdx + 1}波を撃退！安眠ゲージ+10%`);
            }
        }
    }
    this.traps.forEach(trap => this.updateTrap(trap));
    if (this.enemies.length === 0 && this.currentWave >= this.waveEnemies.length) this.endStage(true);
    if (this.sleepGauge <= 0) this.endStage(false);
    this.updateUI();
};

Game.prototype.spawnWave = function(waveIndex) {
    const wave = this.waveEnemies[waveIndex];
    const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
    const hasBoss = wave.indexOf('boss') >= 0;
    wave.forEach((enemyType, index) => {
        setTimeout(() => {
            const enemyDef = ENEMIES[enemyType];
            this.enemies.push({
                x: spawnPoint.x * TILE_SIZE + TILE_SIZE/2,
                y: spawnPoint.y * TILE_SIZE + TILE_SIZE/2,
                type: enemyType,
                waveIndex: waveIndex,
                hp: enemyDef.hp,
                maxHp: enemyDef.hp,
                speed: enemyDef.speed,
                effects: {},
                trapImmune: enemyDef.trapImmune || 0
            });
            if (enemyType === 'boss' && ENEMY_LINES.boss && ENEMY_LINES.boss.appear) {
                this.showMessage(ENEMY_LINES.boss.appear);
            }
        }, index * 1000);
    });
    this.showMessage(`第${waveIndex + 1}波が侵入！`);
};

Game.prototype.updateEnemy = function(enemy, flowField, freeze) {
    const enemyDef = ENEMIES[enemy.type];
    const speed = this.nightSpeed || 1;
    Object.keys(enemy.effects).forEach(effectType => {
        const effect = enemy.effects[effectType];
        effect.duration -= speed;
        if (effectType === 'poison') enemy.hp -= 0.5 * speed;
        if (effect.duration <= 0) delete enemy.effects[effectType];
    });
    if (enemy.effects.trapped || enemy.effects.rope) return;
    if (freeze) return;
    const currentX = Math.floor(enemy.x / TILE_SIZE);
    const currentY = Math.floor(enemy.y / TILE_SIZE);
    let targetX = currentX, targetY = currentY;
    if (enemy.effects.confused) {
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]].sort(() => Math.random() - 0.5);
        for (const [dx, dy] of directions) {
            const nx = currentX + dx, ny = currentY + dy;
            if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && this.map[ny][nx] !== 1 && this.map[ny][nx] !== 4) {
                targetX = nx; targetY = ny; break;
            }
        }
    } else {
        let bestDistance = flowField[currentY][currentX];
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dx, dy]) => {
            const nx = currentX + dx, ny = currentY + dy;
            if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT && flowField[ny][nx] < bestDistance) {
                bestDistance = flowField[ny][nx];
                targetX = nx; targetY = ny;
            }
        });
    }
    const toX = targetX * TILE_SIZE + TILE_SIZE/2, toY = targetY * TILE_SIZE + TILE_SIZE/2;
    const dx = toX - enemy.x, dy = toY - enemy.y;
    const distance = Math.sqrt(dx*dx + dy*dy);
    if (distance > 1) {
        let spd = enemyDef.speed * speed;
        if (enemy.effects.curse) spd *= 0.5;
        enemy.x += (dx / distance) * spd;
        enemy.y += (dy / distance) * spd;
    }
    const trapX = Math.floor(enemy.x / TILE_SIZE), trapY = Math.floor(enemy.y / TILE_SIZE);
    const trap = this.getTrapAt(trapX, trapY);
    if (trap && !trap.activated) {
        if (trap.type === 'spike' && enemyDef.breakSpike) {
            trap.used = true;
            this.addEnemyLine(enemy, 'breakSpike');
            this.showMessage('大男が忍び返しを壊した！');
            this.addParticle(enemy.x, enemy.y, '💥', '#8b4513');
        } else this.activateTrap(trap, enemy);
    }
    const distanceToLord = Math.sqrt(Math.pow(enemy.x - this.lordPosition.x * TILE_SIZE, 2) + Math.pow(enemy.y - this.lordPosition.y * TILE_SIZE, 2));
    if (distanceToLord < TILE_SIZE * 3) this.sleepGauge = Math.max(0, this.sleepGauge - 0.1);
    if (distanceToLord < TILE_SIZE) {
        this.sleepGauge = 0;
        this.showLordReaction(-30);
    }
};

Game.prototype.updateTrap = function(trap) {
    const trapDef = TRAPS[trap.type];
    if (trapDef.type === 'area' && trap.activated) {
        trap.timer += (this.nightSpeed || 1);
        this.enemies.forEach(enemy => {
            const ex = Math.floor(enemy.x / TILE_SIZE), ey = Math.floor(enemy.y / TILE_SIZE);
            if (ex === trap.x && ey === trap.y) {
                if (trap.type === 'poison' && !enemy.effects.poison) {
                    enemy.effects.poison = { duration: trapDef.duration };
                    this.addParticle(enemy.x, enemy.y, '☠️', '#800080');
                }
                if (trap.type === 'curse' && !enemy.effects.curse) {
                    enemy.effects.curse = { duration: trapDef.duration };
                    this.addParticle(enemy.x, enemy.y, '👻', '#4b0082');
                }
            }
        });
    }
};

Game.prototype.activateTrap = function(trap, enemy) {
    const trapDef = TRAPS[trap.type];
    const enemyDef = ENEMIES[enemy.type];
    if (enemy.trapImmune > 0) {
        enemy.trapImmune--;
        this.addEnemyLine(enemy, 'trapNullify');
        this.showMessage(`${enemyDef.name}が罠を無効化！`);
        trap.used = true;
        return;
    }
    trap.activated = true;
    if (enemy.type === 'boss' && ENEMY_LINES.boss && ENEMY_LINES.boss.trapHit) {
        this.particles.push({ x: enemy.x, y: enemy.y - 22, vx: 0, vy: -0.3, char: ENEMY_LINES.boss.trapHit, color: '#ffcccc', life: 80, gravity: 0, fontSize: 11, type: 'speech' });
    }
    switch (trap.type) {
        case 'poison':
            enemy.effects.poison = { duration: trapDef.duration };
            this.addEnemyLine(enemy, 'default');
            this.addParticle(enemy.x, enemy.y, '💀', '#800080');
            break;
        case 'curse':
            enemy.effects.curse = { duration: trapDef.duration };
            this.addParticle(enemy.x, enemy.y, '👻', '#4b0082');
            let spreadCount = 0;
            this.enemies.forEach(other => {
                if (spreadCount >= (trapDef.spread || 3) || other === enemy || other.effects.curse) return;
                const dist = Math.sqrt(Math.pow(other.x - enemy.x, 2) + Math.pow(other.y - enemy.y, 2));
                if (dist <= TILE_SIZE * 2) {
                    other.effects.curse = { duration: trapDef.duration };
                    this.addParticle(other.x, other.y, '👻', '#4b0082');
                    spreadCount++;
                }
            });
            break;
        case 'bomb':
            let damage = trapDef.damage;
            if (enemyDef.trapResist) damage *= enemyDef.trapResist;
            this.enemies.forEach(e => {
                const dist = Math.sqrt(Math.pow(e.x - trap.x * TILE_SIZE, 2) + Math.pow(e.y - trap.y * TILE_SIZE, 2));
                if (dist <= trapDef.range * TILE_SIZE) { e.hp -= damage; this.addParticle(e.x, e.y, '💥', '#ff0000'); }
            });
            this.addEnemyLine(enemy, 'bomb');
            this.sleepGauge = Math.max(0, this.sleepGauge - trapDef.noise);
            this.stageStats.explosivesUsed = true;
            this.shakeScreen(12, 20);
            this.showLordReaction(-trapDef.noise);
            trap.used = true;
            this.playSound('explosion');
            break;
        case 'pit':
            enemy.effects.trapped = { duration: trapDef.duration };
            enemy.hp -= 10;
            this.addEnemyLine(enemy, 'pit');
            this.addParticle(enemy.x, enemy.y, '🕳️', '#8b4513');
            trap.used = true;
            break;
        case 'bell':
            this.sleepGauge = Math.max(0, this.sleepGauge - trapDef.noise);
            this.showLordReaction(-trapDef.noise);
            this.emergencyTrapAvailable = true;
            this.showMessage('🔔 鳴子が鳴った！緊急罠を設置できます！');
            this.addParticle(enemy.x, enemy.y, '🔔', '#ffd700');
            this.playSound('bell');
            break;
        case 'rope':
            let ropeDuration = trapDef.duration;
            if (enemyDef.name === '大男') ropeDuration /= 2;
            enemy.effects.rope = { duration: ropeDuration };
            this.addEnemyLine(enemy, 'rope');
            this.addParticle(enemy.x, enemy.y, '🪢', '#8b4513');
            trap.used = true;
            break;
        case 'ceiling':
            let ceilingDamage = trapDef.damage;
            if (enemyDef.trapResist) ceilingDamage *= enemyDef.trapResist;
            enemy.hp -= ceilingDamage;
            this.addEnemyLine(enemy, 'ceiling');
            this.stageStats.explosivesUsed = true;
            this.shakeScreen(15, 25);
            this.addParticle(enemy.x, enemy.y, '🪨', '#696969');
            trap.used = true;
            this.playSound('crash');
            break;
        case 'smoke':
            enemy.effects.confused = { duration: trapDef.duration };
            this.addEnemyLine(enemy, 'default');
            this.addParticle(enemy.x, enemy.y, '💨', '#d3d3d3');
            break;
    }
    if (enemy.type === 'boss' && enemy.hp <= enemy.maxHp / 2 && !this.bossHalfHpShown) {
        this.bossHalfHpShown = true;
        if (ENEMY_LINES.boss && ENEMY_LINES.boss.halfHp) this.showMessage(ENEMY_LINES.boss.halfHp);
    }
};

Game.prototype.endStage = function(victory) {
    clearInterval(this.dayTimerInterval);
    this.phase = 'result';
    const speedBtn = document.getElementById('nightSpeedBtn');
    if (speedBtn) speedBtn.style.display = 'none';
    document.getElementById('resultScreen').classList.remove('hidden');
    const title = document.getElementById('resultTitle');
    const message = document.getElementById('resultMessage');
    const stats = document.getElementById('resultStats');
    const nextBtn = document.getElementById('nextStageBtn');
    if (victory) {
        if (this.sleepGauge + 20 >= 100) this.checkAchievement('perfectDefense');
        if (!this.stageStats.explosivesUsed) this.checkAchievement('silentNinja');
        title.textContent = '🎊 殿、ご安眠にございます';
        title.style.color = '#4caf50';
        const morning = MORNING_SCENE ? `殿「${MORNING_SCENE.lordWake}」\n左近「${MORNING_SCENE.rojin}」\n殿「${MORNING_SCENE.lordQuestion}」\n左近「${MORNING_SCENE.rojinAnswer}」\n\n` : '';
        message.textContent = morning + `ステージ ${this.currentStage + 1} クリア！殿は朝まで安眠されました。`;
        this.sleepGauge = Math.min(100, this.sleepGauge + 20);
        this.money += 50;
        if (this.currentStage + 1 >= this.unlockedStages && this.currentStage < STAGES.length - 1) {
            this.unlockedStages = this.currentStage + 2;
            this.saveProgress();
        }
        nextBtn.style.display = this.currentStage < STAGES.length - 1 ? 'inline-block' : 'none';
        if (this.currentStage >= STAGES.length - 1) message.textContent += '\n\n🏆 全ステージクリア！あなたは最高の家老です！';
        this.playSound('victory');
    } else {
        title.textContent = '😡 殿、御目覚めにございます…';
        title.style.color = '#f44336';
        message.textContent = `ステージ ${this.currentStage + 1} 失敗。殿は目を覚ましてしまわれました。\n「うるさい！もう寝られぬわ！」`;
        nextBtn.style.display = 'none';
        this.playSound('defeat');
    }
    stats.innerHTML = `<div style="margin: 20px 0; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px;"><p>💰 残り所持金: ${this.money}G</p><p>😴 安眠ゲージ: ${Math.floor(this.sleepGauge)}%</p><p>💀 撃破数: ${STAGES[this.currentStage].enemies.flat().length - this.enemies.length}</p></div>`;
};

Game.prototype.nextStage = function() {
    if (this.currentStage < STAGES.length - 1) this.startStage(this.currentStage + 1);
};

Game.prototype.retryStage = function() {
    this.startStage(this.currentStage);
};
