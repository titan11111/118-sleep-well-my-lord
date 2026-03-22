# 🏯 殿、ご安眠を。
## 実装仕様書 v2.0
### 3D時間軸戦術システム実装ガイド

---

## 1. プロジェクト概要

### 1.1 プロジェクト名
**「殿、ご安眠を。 - Timeline Vision Edition」**

### 1.2 バージョン
- 現在版：v1.0（基本タワーディフェンス）
- 目標版：v2.0（3D時間軸戦術システム）

### 1.3 実装目的
現在の「昼=戦術、夜=見守り」という二段階構成から、敵の移動軌跡・タイミング・罠の連鎖効果を**時間軸を含む3次元空間上で可視化**し、プレイヤーが戦術的判断を「能動的」に行えるゲームへ進化させる。

### 1.4 ターゲットユーザー
- コアゲーマー（ストラテジー好き）
- ゲーム配信者・YouTuber
- プログラマー・技術愛好家
- 高度な思考を求めるプレイヤー

---

## 2. ゲーム体験の進化

### 2.1 現在（v1.0）
```
【昼フェーズ】
  敵情報確認 → 罠配置（静的）→ 準備完了
             ↓
【夜フェーズ】
  敵侵入 → 罠自動発動 → プレイヤーは見守る
```

### 2.2 目標（v2.0）
```
【昼フェーズ + ビジョンシステム】
  敵情報確認
    ↓
  敵の移動軌跡を時間軸で可視化
    ↓
  複数の罠配置案を「シミュレーション」して比較
    ↓
  最適な案を選択・確定
    ↓
【夜フェーズ + リアルタイム判断】
  敵侵入 → 実際の動きを観察
    ↓
  予測との乖離を発見
    ↓
  緊急罠を動的に配置・調整
    ↓
  結果をリプレイで分析
```

---

## 3. 新機能仕様

### 3.1 Timeline Vision System（タイムラインビジョンシステム）

#### 3.1.1 機能概要
敵が「いつ、どこを通るか」を**時間パラメータ付きで3次元的に表示**するシステム。

#### 3.1.2 UI レイアウト

```
┌─────────────────────────────────────────────────────────┐
│ 🏯 Stage 1: 表庭 | 💰 100G | ⏰ 残り: 45秒          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  【メインビュー：マップ + タイムライン統合表示】       │
│                                                         │
│  Z軸(時間) ↑                                           │
│   ↑ 敵1  敵2      敵3                                 │
│   │ ↓    ↓       ↓    (3秒後の位置を表示)            │
│ 5秒│ 🐉   🗡️  🐭   ← 敵の種類と移動予測           │
│   │                                                   │
│ 3秒│      🐉    (毒壺で対応可能)                      │
│   │                                                   │
│ 1秒│  🗡️     (落とし穴で対応可能)                    │
│   └─→→→→→ [X軸：マップ横軸]                        │
│   Y軸: マップ縦軸                                     │
│                                                         │
│  ───────────────────────────────────────────────────  │
│  優先度表示： ⚠️ 高(赤) | ⚡ 中(黄) | ✓ 低(青)      │
│  ───────────────────────────────────────────────────  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ 【罠プリセット表示】                                   │
│ 📋 案A: 効率値 85% | 敵撃破: 全 | 費用: 150G       │
│ 📋 案B: 効率値 72% | 敵撃破: 11/12 | 費用: 110G    │
│ 📋 案C: 効率値 91% | 敵撃破: 全 | 費用: 160G       │
│                                                         │
│ [確定] [シミュレーション再生] [リセット]             │
└─────────────────────────────────────────────────────────┘
```

#### 3.1.3 具体的な動作フロー

**①敵情報の時系列表示**
- 敵の侵入口から殿の間までの経路を計算
- 各敵が「いつ、どこを通るか」を時間軸付きで表示
- 例：「大男は5秒後にマス(8,5)を通過予定」

**②罠の効果範囲の動的表示**
- マウスで罠を配置すると、その罠が敵に与える影響をリアルタイム計算
- 「この毒壺は敵3体に命中、敵2は回避」という予測を表示

**③優先度インジケーター**
- 敵ごとに「対応難度」を色分け表示
- 赤：最優先対応（ボスorライフリスク高）
- 黄：中程度
- 青：後回し可能

**④シミュレーション再生**
- 配置を確定する前に「20秒間の戦闘シミュレーション」を自動再生
- プレイヤーが複数の罠配置案(案A/B/C)を見比べて選択できる

### 3.2 Predictive Path Analysis（敵移動予測システム）

#### 3.2.1 アルゴリズム

```javascript
// 敵の移動予測計算
function predictEnemyPath(enemy, stage, currentTime) {
  const path = [];
  const entrances = stage.enemyEntrances;
  const targetRoom = stage.lordRoom;

  // A*アルゴリズムで最短経路を計算
  // 敵の速度タイプに応じた移動時間を加算
  for (let t = 0; t < maxTurns; t++) {
    const timeOffset = currentTime + (t * enemy.speed);
    const position = calculatePositionAtTime(enemy, targetRoom, timeOffset);
    path.push({
      time: timeOffset,
      position: position,
      x: position.x,
      y: position.y,
      vulnerable: calculateVulnerability(enemy, position)
    });
  }

  return path;
}

// 敵の脆弱性計算
function calculateVulnerability(enemy, position) {
  // 敵の種類に応じた弱点罠を算出
  // 例：忍び→縄罠が有効、大男→火薬玉が有効
  return {
    effectiveness: {
      poison: 0.8,
      curse: 1.0,
      firecracker: 0.5,
      pitfall: 0.9,
      rope: 1.2  // 特に有効
    }
  };
}
```

#### 3.2.2 データ構造

```javascript
const predictedEnemyTimeline = {
  enemyId: "wave1-enemy3",
  type: "大男",
  entrancePoint: { x: 0, y: 5 },
  targetPoint: { x: 12, y: 8 },  // 殿の間

  // 時系列の位置情報
  timeline: [
    { time: 0, x: 0, y: 5, status: "侵入開始" },
    { time: 2, x: 2, y: 5, status: "移動中" },
    { time: 4, x: 4, y: 5, status: "オープンスペース" },
    { time: 6, x: 6, y: 5, status: "危険圏内" },
    { time: 8, x: 8, y: 5, status: "最終防衛" },
    { time: 10, x: 12, y: 8, status: "殿の間到達" }
  ],

  // 優先度スコア
  priorityScore: 0.95,
  threatLevel: "CRITICAL",

  // 対応推奨罠
  recommendedTraps: [
    { trapType: "火薬玉", effectiveTime: 4, expectedDamage: 120 },
    { trapType: "縄罠", effectiveTime: 6, expectedDuration: 10 },
    { trapType: "呪い札", effectiveTime: 2, expectedEffect: 0.5 }
  ]
};
```

### 3.3 Multi-Scenario Simulation（複数案シミュレーション）

#### 3.3.1 仕様
昼フェーズにおいて、同じステージに対して**最大3つの異なる罠配置案**を設定し、自動的にシミュレーションして結果を比較。

#### 3.3.2 UI コンポーネント

```
┌──────────────────────┬──────────────────────┬──────────────────────┐
│       案A             │        案B            │        案C           │
├──────────────────────┼──────────────────────┼──────────────────────┤
│ 効率値: 85% 🟩🟩🟨  │ 効率値: 72% 🟩🟨🟨  │ 効率値: 91% 🟩🟩🟩  │
│                      │                      │                      │
│ 敵撃破: 全て(12/12) │ 敵撃破: 11/12        │ 敵撃破: 全て(12/12) │
│ 使用金額: 150G       │ 使用金額: 110G       │ 使用金額: 160G       │
│ 殿の安眠: 90%        │ 殿の安眠: 75%        │ 殿の安眠: 95%        │
│                      │                      │                      │
│ 罠構成:              │ 罠構成:               │ 罠構成:              │
│ ・毒壺 × 2          │ ・毒壺 × 1           │ ・毒壺 × 3          │
│ ・火薬玉 × 1        │ ・落とし穴 × 2       │ ・火薬玉 × 2        │
│ ・縄罠 × 1          │ ・油皿 × 1           │ ・縄罠 × 2          │
│                      │                      │                      │
│ [実行] [詳細]       │ [実行] [詳細]        │ [実行] [詳細]       │
└──────────────────────┴──────────────────────┴──────────────────────┘
```

#### 3.3.3 計算ロジック

```javascript
function evaluateScenario(trapPlacement, enemyWaves) {
  const evaluation = {
    efficiency: 0,           // 効率値（0-100）
    enemiesDefeated: 0,      // 撃破敵数
    lordSleep: 100,          // 殿の安眠度
    goldSpent: 0,
    trapSynergies: []        // 罠の連鎖効果
  };

  // 1. 各敵の軌跡と罠の交差をチェック
  enemyWaves.forEach(enemy => {
    const hits = checkTrapIntersection(enemy.timeline, trapPlacement);
    if (hits.length > 0) {
      evaluation.enemiesDefeated++;
      evaluation.efficiency += hits.reduce((sum, h) => sum + h.damage, 0);
    }
  });

  // 2. 罠の連鎖効果を加算
  const synergies = calculateSynergies(trapPlacement);
  evaluation.trapSynergies = synergies;
  evaluation.efficiency += synergies.bonusPoints;

  // 3. 殿の安眠度を計算
  evaluation.lordSleep = Math.max(0, 100 -
    (12 - evaluation.enemiesDefeated) * 8);

  // 4. 効率値を正規化
  evaluation.efficiency = Math.min(100,
    (evaluation.efficiency / maxPossibleDamage) * 100);

  return evaluation;
}
```

### 3.4 Dynamic Trap Adjustment（動的罠調整システム）

#### 3.4.1 機能
夜フェーズにおいて、敵の実際の動きが「予測と乖離」した場合、プレイヤーが**既設置罠を動かしたり、新罠を追加**できる機能。

#### 3.4.2 操作インターフェース

```
夜フェーズ進行中

敵が予測と異なる動きをした
  ↓
警告表示: ⚠️ "敵が予測路から逸脱しました"
  ↓
アクション選択肢:
  A) 既設置罠を移動（ドラッグ&ドロップ）
  B) 新罠を追加配置（制限1つ/イベント）
  C) 緊急検証ボタン（再計算）
```

#### 3.4.3 制約条件
- **1夜あたり最大3回まで** 罠を動かせる
- 新罠の追加は **従来の鳴子イベント同様** 制限あり
- 既設置罠の移動には **3秒のチャージ時間** が必要

---

## 4. 技術実装仕様

### 4.1 新規追加ファイル

```
game-timeline.js       (敵移動予測とタイムラインレンダリング)
game-simulator.js      (シミュレーションエンジン)
game-ui-vision.js      (Timeline Vision UI)
game-replay.js         (リプレイシステム)
```

### 4.2 既存ファイルの改造範囲

| ファイル | 変更内容 | 影響度 |
|---------|--------|------|
| game.js | ゲームループにシミュレーション処理を追加 | 中程度 |
| game-render.js | 3D時間軸表示レンダリング追加 | 大 |
| game-night.js | 夜フェーズに動的罠調整ロジック追加 | 中程度 |
| index.html | 新UIパネルの追加 | 小 |
| style.css | Timeline Vision UI用スタイル追加 | 中程度 |

### 4.3 Canvas描画の拡張

#### 4.3.1 新しい描画レイヤー

```javascript
// レイヤー構成
const canvasLayers = {
  1: "背景（マップ）",
  2: "敵の移動軌跡（予測パス）",
  3: "罠配置",
  4: "優先度インジケーター",
  5: "タイムライングリッド",
  6: "UI要素",
  7: "シミュレーション重ね合わせ"
};
```

#### 4.3.2 レンダリング処理フロー

```javascript
function renderTimelineVision() {
  // 1. 背景マップをクリア
  clearCanvas();

  // 2. グリッド背景を描画（時間軸表示）
  drawTimelineGrid();

  // 3. 敵の移動軌跡を時間色分けで描画
  drawEnemyPredictionPaths();

  // 4. 各敵のタイムラインノードを描画
  drawEnemyTimelineNodes();

  // 5. 配置済み罠の効果範囲を描画
  drawTrapEffectRanges();

  // 6. 優先度インジケーターを描画
  drawPriorityIndicators();

  // 7. UI要素（パネル、ボタン）を描画
  drawUIElements();
}
```

### 4.4 パフォーマンス最適化

#### 4.4.1 計算最適化
```javascript
// 敵の移動予測をキャッシュ
const pathCache = new Map();
const cacheKey = `${enemy.id}-${stageId}`;

function getEnemyPath(enemy, stage) {
  if (pathCache.has(cacheKey)) {
    return pathCache.get(cacheKey);
  }

  const path = predictEnemyPath(enemy, stage);
  pathCache.set(cacheKey, path);
  return path;
}

// シミュレーション計算の並列化（Web Worker）
const simulator = new Worker('simulator-worker.js');
simulator.postMessage({
  scenarios: [scenarioA, scenarioB, scenarioC],
  enemyWaves: currentStage.waves
});
```

#### 4.4.2 レンダリング最適化
```javascript
// requestAnimationFrameの活用
let frameCounter = 0;
function optimizedRender() {
  // 毎フレーム：UI更新（軽量）
  updateUI();

  // 3フレームごと：敵パス再計算（重い）
  if (frameCounter % 3 === 0) {
    recalculateEnemyPaths();
  }

  // 60フレームごと：シミュレーション結果更新（非常に重い）
  if (frameCounter % 60 === 0) {
    updateSimulationResults();
  }

  frameCounter++;
  requestAnimationFrame(optimizedRender);
}
```

---

## 5. 実装フェーズ計画

### Phase 1: 基盤実装（Week 1-2）
- [x] タイムラインデータ構造の設計
- [x] 敵移動予測アルゴリズムの実装
- [x] Canvas描画基盤の構築

### Phase 2: UI実装（Week 3-4）
- [ ] Timeline Vision パネルのUI実装
- [ ] シミュレーション比較ビューの実装
- [ ] インタラクティブ要素（マウスイベント）の実装

### Phase 3: シミュレーション（Week 5-6）
- [ ] 複数案シミュレーション機能の実装
- [ ] 効率値計算エンジンの実装
- [ ] 罠の連鎖効果計算の実装

### Phase 4: 統合・テスト（Week 7-8）
- [ ] 既存ゲームエンジンとの統合
- [ ] ゲームバランス調整
- [ ] パフォーマンステスト・最適化

### Phase 5: ポーランド・QA（Week 9-10）
- [ ] UI/UXの改善
- [ ] チュートリアル・ヘルプの追加
- [ ] 各ステージの調整

---

## 6. データ構造仕様

### 6.1 敵オブジェクトの拡張

```javascript
const enemyWithTimeline = {
  // 既存のプロパティ
  id: "wave1-enemy1",
  type: "草の者",
  hp: 30,
  speed: 1.0,

  // 新規追加プロパティ
  timeline: {
    path: [
      { t: 0, x: 0, y: 5, status: "侵入" },
      { t: 2, x: 2, y: 5, status: "移動中" },
      // ...
    ],
    estimatedArrival: 10000,  // ミリ秒
    priority: 0.5,             // 優先度スコア
    vulnerabilities: {         // 弱点属性
      poison: 1.0,
      curse: 0.8,
      fire: 0.6
    }
  },

  // 実行時追跡データ
  actualPath: [],
  deviationFlag: false
};
```

### 6.2 シミュレーション結果オブジェクト

```javascript
const simulationResult = {
  scenarioId: "A",
  timestamp: Date.now(),

  // スコア
  efficiency: 85,
  enemiesDefeated: 12,
  goldSpent: 150,
  lordSleep: 90,

  // 詳細情報
  trapPlacements: [
    { type: "毒壺", x: 5, y: 3, enemiesAffected: 4, damage: 60 },
    // ...
  ],

  // 連鎖効果
  synergies: [
    { traps: ["毒壺", "呪い札"], bonus: 20, description: "毒化させた敵に呪いが伝染" }
  ],

  // タイムライン表示用
  simulationFrames: [
    { frame: 0, mapState: {...}, enemyStates: {...} },
    { frame: 1, mapState: {...}, enemyStates: {...} },
    // ...60フレーム分
  ]
};
```

---

## 7. API・関数仕様

### 7.1 予測計算API

```javascript
/**
 * 敵の移動軌跡を予測する
 * @param {Enemy} enemy - 敵オブジェクト
 * @param {Stage} stage - ステージオブジェクト
 * @returns {Timeline} 敵の時系列位置情報
 */
function predictEnemyTimeline(enemy, stage) { }

/**
 * 複数シナリオをシミュレーション
 * @param {Array<TrapPlacement>} scenarios - 罠配置シナリオ（最大3つ）
 * @param {Array<Enemy>} enemies - 敵ウェーブ
 * @returns {Array<SimulationResult>} シミュレーション結果
 */
function simulateMultipleScenarios(scenarios, enemies) { }

/**
 * 罠同士の連鎖効果を計算
 * @param {Array<Trap>} traps - 罠配置
 * @returns {Array<Synergy>} 連鎖効果リスト
 */
function calculateTrapSynergies(traps) { }

/**
 * 敵の優先度スコアを計算
 * @param {Enemy} enemy - 敵オブジェクト
 * @returns {number} 優先度スコア（0.0-1.0）
 */
function calculatePriorityScore(enemy) { }

/**
 * 動的に罠を移動
 * @param {Trap} trap - 移動対象の罠
 * @param {number} newX - 新X座標
 * @param {number} newY - 新Y座標
 * @returns {boolean} 移動成功フラグ
 */
function moveTrapDynamically(trap, newX, newY) { }
```

### 7.2 UIイベントハンドラ

```javascript
/**
 * シミュレーション再生を開始
 * @param {string} scenarioId - シナリオID ("A" | "B" | "C")
 */
function playSimulation(scenarioId) { }

/**
 * タイムラインビュー内のマウスホバー
 * @param {number} timelineX - タイムライン内のX座標
 * @param {number} timelineY - タイムライン内のY座標
 */
function onTimelineHover(timelineX, timelineY) { }

/**
 * シナリオ確定
 * @param {string} scenarioId - 選択したシナリオID
 */
function confirmScenario(scenarioId) { }

/**
 * 詳細パネルを開く
 * @param {string} elementId - 開く要素のID
 */
function openDetailPanel(elementId) { }
```

---

## 8. ビジュアルディレクション

### 8.1 カラースキーム（時間軸表現）

```
時間経過の色分け:
  0秒（現在）   → 🔴 赤（最も危険）
  3秒後        → 🟠 オレンジ（高リスク）
  5秒後        → 🟡 黄（中程度）
  7秒以上      → 🟢 緑（対応時間あり）

優先度表示:
  CRITICAL    → 深い赤 (#CC0000)
  HIGH        → オレンジ (#FF6600)
  MEDIUM      → 黄 (#FFCC00)
  LOW         → 青 (#0066CC)
```

### 8.2 アニメーション仕様

```javascript
// 敵タイムラインノードのパルスアニメーション
@keyframes timelinePulse {
  0%   { scale: 1.0; opacity: 1.0; }
  50%  { scale: 1.2; opacity: 0.8; }
  100% { scale: 1.0; opacity: 1.0; }
}

// シミュレーション再生中の敵移動
@keyframes simulationPathGlow {
  0%   { filter: drop-shadow(0 0 2px rgba(255,0,0,0.5)); }
  50%  { filter: drop-shadow(0 0 8px rgba(255,0,0,0.8)); }
  100% { filter: drop-shadow(0 0 2px rgba(255,0,0,0.5)); }
}
```

---

## 9. テスト計画

### 9.1 ユニットテスト

```javascript
// test/game-timeline.test.js
describe('敵移動予測', () => {
  test('敵の軌跡が正しく計算される', () => {
    // 敵オブジェクトとステージを用意
    // predictEnemyTimeline()を実行
    // timelineが5ノード以上存在することを確認
  });

  test('優先度スコアが正しく計算される', () => {
    // 複数の敵オブジェクトを用意
    // calculatePriorityScore()を実行
    // スコアが0.0-1.0の範囲内であることを確認
  });
});
```

### 9.2 統合テスト

```
- 昼フェーズでTimeline Visionが正しく表示される
- 3つのシナリオが同時にシミュレーションされる
- シミュレーション結果が効率値順にソートされている
- 夜フェーズで罠の動的移動が可能
- リプレイで昼フェーズの判断が可視化される
```

### 9.3 パフォーマンステスト

```
- Canvas描画: 60fps維持
- シミュレーション計算: 3シナリオ × 12敵 = 36パターンを1秒以内に完了
- メモリ使用量: 敵パスキャッシュが50MB以下
```

---

## 10. 将来の拡張案

### 10.1 Phase 2.0で考慮すべき機能
- **AI提案システム** → シミュレーション結果から自動的に「最適案」を提示
- **プレイヤースキル評価** → シミュレーション効率値とクリア実績を比較
- **リーダーボード** → ステージごと最高効率値を競争
- **タイムラインの凝縮UI** → VR/AR対応の立体表示

### 10.2 ゲーム体験の次元上昇
```
v1.0: 「罠を置く」        → 直感的
v2.0: 「罠を計画する」    → 戦術的
v3.0: 「罠を予測する」    → 知的（AI対戦）
```

---

## 付録 A: 実装チェックリスト

### UI/UX実装
- [ ] Timeline Vision パネルが画面に表示
- [ ] 敵の予測パスがマップ上に描画
- [ ] タイムライングリッドが表示
- [ ] シナリオ比較パネルが表示
- [ ] 効率値計算が動作

### ゲームロジック実装
- [ ] 敵移動予測アルゴリズムが動作
- [ ] シミュレーション計算が完了
- [ ] 罠の連鎖効果が計算
- [ ] 動的罠移動が可能
- [ ] リプレイシステムが記録・再生

### パフォーマンス
- [ ] Canvas描画が60fps維持
- [ ] メモリリークがない
- [ ] シミュレーション計算が1秒以内

### QA
- [ ] 全ステージで動作確認
- [ ] PC・スマホで動作確認
- [ ] クロスブラウザテスト合格
- [ ] ユーザーテスト実施

---

**ドキュメント版**: v2.0 Implementation Specification
**最終更新**: 2026年3月10日
**責任者**: ゲームクリエイター（タイタン）

