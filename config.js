/**
 * 殿、ご安眠を。 — ゲーム定数・データ（仕様: 15×10マス）
 */
const TILE_SIZE = 40;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 10;

const TRAPS = {
    poison: { name: '毒壺', icon: '💀', cost: 30, type: 'area', damage: 2, duration: 300 },
    curse: { name: '呪い札', icon: '👻', cost: 40, type: 'area', slow: 0.5, spread: 3, duration: 300 },
    bomb: { name: '火薬玉', icon: '💣', cost: 50, type: 'trigger', damage: 40, range: 1.5, noise: 5 },
    pit: { name: '落とし穴', icon: '🕳️', cost: 20, type: 'trigger', duration: 300 },
    bell: { name: '鳴子', icon: '🔔', cost: 10, type: 'alarm', noise: 5 },
    rope: { name: '縄罠', icon: '🪢', cost: 25, type: 'trigger', duration: 600 },
    oil: { name: '油皿', icon: '🔥', cost: 35, type: 'combo' },
    smoke: { name: '煙玉', icon: '💨', cost: 30, type: 'area', confuse: true, duration: 600 },
    ceiling: { name: '釣り天井', icon: '🪨', cost: 80, type: 'trigger', damage: 200 },
    spike: { name: '忍び返し', icon: '🎋', cost: 15, type: 'wall' }
};

const ENEMIES = {
    grunt: { name: '草の者', hp: 30, speed: 1.0, reward: 10, color: '#8bc34a', emoji: '🥷' },
    ninja: { name: '忍び', hp: 50, speed: 1.5, reward: 20, color: '#ff9800', emoji: '🗡️', trapImmune: 1 },
    brute: { name: '大男', hp: 150, speed: 0.7, reward: 30, color: '#9c27b0', emoji: '💪', breakSpike: true },
    illusionist: { name: '幻術師', hp: 40, speed: 1.2, reward: 25, color: '#e91e63', emoji: '✨', clone: true },
    boss: { name: '頭領', hp: 300, speed: 0.8, reward: 100, color: '#f44336', emoji: '👹', trapResist: 0.5 }
};

const STAGES = [
    { name: '表庭', enemies: [['grunt', 'grunt', 'grunt'], ['grunt', 'grunt']], dayTime: 60, startMoney: 100, spawnPoints: [{ x: 1, y: 5 }] },
    { name: '裏口', enemies: [['grunt', 'grunt'], ['grunt', 'grunt', 'grunt'], ['ninja', 'grunt']], dayTime: 60, startMoney: 120, spawnPoints: [{ x: 1, y: 3 }, { x: 1, y: 6 }] },
    { name: '中庭', enemies: [['grunt', 'grunt'], ['ninja', 'ninja'], ['grunt', 'ninja', 'grunt']], dayTime: 55, startMoney: 140, spawnPoints: [{ x: 1, y: 5 }] },
    { name: '長廊下', enemies: [['grunt', 'grunt'], ['ninja', 'grunt'], ['grunt', 'grunt', 'grunt'], ['ninja', 'ninja']], dayTime: 55, startMoney: 160, spawnPoints: [{ x: 1, y: 5 }] },
    { name: '蔵の前', enemies: [['grunt', 'grunt', 'grunt'], ['ninja', 'grunt'], ['brute'], ['grunt', 'ninja']], dayTime: 50, startMoney: 180, spawnPoints: [{ x: 1, y: 5 }] },
    { name: '池のほとり', enemies: [['ninja', 'ninja'], ['grunt', 'grunt', 'grunt'], ['brute', 'grunt'], ['ninja', 'ninja', 'grunt']], dayTime: 50, startMoney: 200, spawnPoints: [{ x: 1, y: 5 }] },
    { name: '夜の庭園', enemies: [['grunt', 'grunt'], ['ninja', 'ninja'], ['illusionist', 'grunt'], ['brute', 'ninja'], ['grunt', 'ninja', 'ninja']], dayTime: 45, startMoney: 220, spawnPoints: [{ x: 1, y: 5 }] },
    { name: '本丸', enemies: [['ninja', 'ninja', 'grunt'], ['brute', 'grunt', 'grunt'], ['illusionist', 'ninja'], ['ninja', 'ninja', 'ninja'], ['brute', 'brute']], dayTime: 45, startMoney: 240, spawnPoints: [{ x: 1, y: 2 }, { x: 1, y: 5 }, { x: 1, y: 7 }] },
    { name: '殿の間の前', enemies: [['ninja', 'ninja', 'ninja'], ['brute', 'ninja', 'ninja'], ['illusionist', 'illusionist'], ['grunt', 'grunt', 'grunt', 'grunt'], ['brute', 'ninja', 'ninja', 'ninja']], dayTime: 40, startMoney: 260, spawnPoints: [{ x: 1, y: 5 }] },
    { name: '決戦の夜', enemies: [['ninja', 'ninja', 'ninja'], ['brute', 'brute'], ['illusionist', 'ninja', 'ninja'], ['grunt', 'grunt', 'grunt', 'grunt'], ['ninja', 'ninja', 'brute'], ['boss']], dayTime: 40, startMoney: 300, spawnPoints: [{ x: 1, y: 5 }] }
];

const ACHIEVEMENTS = {
    firstBlood: { name: '初陣', desc: '初めて敵を倒す', icon: '⚔️' },
    perfectDefense: { name: '完全防衛', desc: '安眠ゲージ100%でクリア', icon: '🛡️' },
    trapMaster: { name: '罠師', desc: '一度に10個以上の罠を設置', icon: '🎯' },
    silentNinja: { name: '静寂の守り', desc: '爆発系罠を使わずにクリア', icon: '🤫' },
    speedPrep: { name: '余裕の準備', desc: '昼フェーズで15秒以上残して準備完了', icon: '⏱️' }
};

// 殿の寝言（ゲージ連動）
const LORD_SLEEP_TALK = {
    high: ['天ぷらが…サクサクで…うまい…', '庭の鯉が…金色に…', '春はあけぼの…いや、まだ寝る…', 'zzz…'],
    mid: ['誰じゃ…廊下を走る者は…', '障子に影が…', 'む…天ぷらが…逃げる…', '蛙か…またか…'],
    low: ['うるさい…打ち首じゃ…', '左近ぉぉ…', '誰じゃ…許さぬ…', '祇園精舎の…鐘がうるさい…']
};
// 稀にゲームに干渉する寝言（effect: 'lightning' | 'earthquake'）
const LORD_SLEEP_TALK_SPECIAL = [
    { msg: '雷が…ごろごろ…', effect: 'lightning' },
    { msg: '地震じゃ…', effect: 'earthquake' }
];

// 敵の一言（罠発動時・撃破時）
const ENEMY_LINES = {
    grunt: { pit: 'し、しまった〜', rope: '動けぬ…', bomb: 'ぐおっ', ceiling: 'な、なに…', default: 'ぬう…' },
    ninja: { trapNullify: '甘いな', pit: '…失策', rope: '縄か…', default: '…' },
    brute: { breakSpike: 'こんなもの！', rope: 'こんなもので…！', default: 'ふん' },
    illusionist: { default: 'どれが本物かな？' },
    boss: {
        appear: 'やれやれ…部下が役に立たぬ',
        trapHit: 'ふん、小細工を',
        halfHp: '貴様…家老か？なかなかやる',
        defeat: '見事…だが次は…'
    }
};

// 左近の独り言（夜フェーズ）
const ROJIN_MONOLOGUE = [
    '第一波、予想通りの布陣…', '殿、どうかお静かに…', '忍びめ、鳴子を避けたか',
    '油断ならぬ…', 'まだ波が残っておる', '最後の一押し…', '…静かになったな',
    '殿の寝息、まだ穏やか…', 'このまま朝を迎えさせたい'
];

// ステージ別地形（4=池/堀 通過・設置不可）
const STAGE_TERRAIN = {
    5: [[4,2],[4,3],[5,2],[5,3],[6,2],[6,3],[7,6],[7,7],[8,6],[8,7]]  // 池のほとり: 池マス（通路は塞がぬ）
};

// 朝の演出テキスト（クリア時）
const MORNING_SCENE = {
    lordWake: 'ふわぁ〜…よく寝たのお',
    rojin: '…はは。左様にございます',
    lordQuestion: '左近よ、今日も静かな夜じゃったな',
    rojinAnswer: '…左様にございます。何もございませんでした'
};
