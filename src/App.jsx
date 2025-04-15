import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import StartScreen from './components/StartScreen';
import BattleScreen from './components/BattleScreen'; 
import GameOverScreen from './components/GameOverScreen';
import ConfigScreen from './components/ConfigScreen';
import InfiniteBattleScreen from './components/InfiniteBattleScreen';
import { 
  normalRandom, 
  MAX_HP, 
  INITIAL_TYMON_COUNT, 
  DIFFICULTY_SETTINGS 
} from './utils/gameLogic';

// Define game states
const GAME_STATES = {
  NAME: 'NAME',
  DIFFICULTY: 'DIFFICULTY',
  BATTLE: 'BATTLE',
  GAME_OVER: 'GAME_OVER',
  COOP_SETUP: 'COOP_SETUP', // New state for coop setup
  INFINITE_SETUP: 'INFINITE_SETUP', // New state for infinite multiplayer setup
  INFINITE_BATTLE: 'INFINITE_BATTLE', // New state for infinite multiplayer battle
};

// --- Infinite Mode AI/Quirk Data ---
const AI_NAMES = [
  'CubeBot', 'Speedy', 'Twister', 'Mosaic', 'Slice', 'Ghost', 'Echo', 'Nova', 'Pixel', 'Blitz', 'Rando', 'Scrambler', 'Typhoon', 'Vortex', 'Prism', 'Shadow', 'Frost', 'Inferno', 'Bolt', 'Zenith'
];
const AI_AVATARS = [
  '/flc.png', '/yza.png', '/smf.png', '/czy.png', '/rob.png', '/victory.png', '/defeat.png', '/tymon.png'
];
const AI_QUIRKS = [
  { name: 'Double Damage', desc: 'All damage is doubled this round.', effect: 'double_damage' },
  { name: 'Reverse Win/Lose', desc: 'Slower solver wins this round!', effect: 'reverse' },
  { name: 'Time Freeze', desc: 'AI always gets the same time (12.00s).', effect: 'freeze' },
  { name: 'Combo Breaker', desc: 'Combos reset every turn.', effect: 'combo_breaker' },
  { name: 'Lucky Hit', desc: 'First hit this round deals +10 bonus damage.', effect: 'lucky_hit' },
  { name: 'No Quirk', desc: 'No special effect this round.', effect: 'none' }
];
// --- More Quirks and Power-Ups for Variety ---
AI_QUIRKS.push(
  { name: 'Mirror Match', desc: 'AI copies your time exactly this round.', effect: 'mirror' },
  { name: 'Sudden Death', desc: 'First to take damage this round loses all HP.', effect: 'sudden_death' },
  { name: 'Combo Drain', desc: 'You lose all combo bonuses this round.', effect: 'combo_drain' },
  { name: 'Heal AI', desc: 'AI heals 10 HP if it wins this round.', effect: 'heal_ai' },
  { name: 'Weak Hit', desc: 'All damage is halved this round.', effect: 'half_damage' }
);
// --- Cube-Solving Inspired Quirks ---
AI_QUIRKS.push(
  { name: 'Parity Error', desc: 'You must enter an odd time (e.g., 11.11, 13.33) or take +2s penalty.', effect: 'parity_error' },
  { name: 'OLL Skip', desc: 'You get a 1.5s time bonus this round.', effect: 'oll_skip' },
  { name: 'Lockup', desc: 'Your time is increased by 1.5s this round.', effect: 'lockup' },
  { name: 'Inspection+', desc: 'See AI’s time before submitting.', effect: 'inspection_plus' },
  { name: '+2 Penalty', desc: 'Your time is increased by 2s this round.', effect: 'plus2_penalty' }
);

function getRandomAI() {
  const name = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
  const avatar = AI_AVATARS[Math.floor(Math.random() * AI_AVATARS.length)];
  const quirk = AI_QUIRKS[Math.floor(Math.random() * AI_QUIRKS.length)];
  return { name, avatar, quirk };
}

// --- Boss Data for Infinite Mode ---
const BOSS_AI = [
  { name: 'The Scrambler', avatar: '/rob.png', superQuirk: { name: 'Triple Damage', desc: 'All damage is tripled this round.', effect: 'triple_damage' } },
  { name: 'Time Lord', avatar: '/smf.png', superQuirk: { name: 'Time Lock', desc: 'AI always gets 9.00s this round.', effect: 'boss_time_9' } },
  { name: 'Nullifier', avatar: '/czy.png', superQuirk: { name: 'No Power-Ups', desc: 'You cannot use power-ups this round.', effect: 'no_powerups' } },
  { name: 'Combo King', avatar: '/victory.png', superQuirk: { name: 'Combo Steal', desc: 'Boss steals your combo bonus this round.', effect: 'steal_combo' } },
  { name: 'The Wall', avatar: '/defeat.png', superQuirk: { name: 'Double HP', desc: 'Boss has double HP this round.', effect: 'double_hp' } }
];

// --- Infinite Mode Power-Ups ---
const POWER_UPS = [
  { name: 'Heal 20 HP', desc: 'Restore 20 HP (cannot exceed max).', effect: 'heal_20' },
  { name: 'Halve Next Damage', desc: 'Next round: all damage (to you) is halved.', effect: 'halve_next_damage' },
  { name: 'See AI Time', desc: 'Next round: see AI’s time before submitting.', effect: 'see_ai_time' },
  { name: '+1 Combo Bonus', desc: 'Permanently gain +1 combo bonus.', effect: 'perm_combo' },
  { name: 'Shield', desc: 'Block all damage next round.', effect: 'shield' },
  { name: 'Deal +10 Next Hit', desc: 'Next time you deal damage, add +10.', effect: 'plus10_next' },
];
// --- More Quirks and Power-Ups for Variety ---
POWER_UPS.push(
  { name: 'Steal Combo', desc: 'Steal the AI’s combo bonus next round.', effect: 'steal_combo' },
  { name: 'AI Slowdown', desc: 'AI’s time is increased by 2s next round.', effect: 'ai_slowdown' },
  { name: 'Combo Shield', desc: 'You keep your combo even if you lose next round.', effect: 'combo_shield' },
  { name: 'Double Heal', desc: 'Next time you heal, double the amount.', effect: 'double_heal' }
);
// --- Cube-Solving Inspired Power-Ups ---
POWER_UPS.push(
  { name: 'PLL Skip', desc: 'Once: Subtract 2s from your time.', effect: 'pll_skip' },
  { name: 'Lookahead', desc: 'Preview the next 2 quirks.', effect: 'lookahead' },
  { name: 'Perfect Cross', desc: 'First win this round deals double damage.', effect: 'perfect_cross' }
);

// --- Rare/Legendary Power-Ups ---
const RARE_POWER_UPS = [
  { name: 'Invincible (3 Rounds)', desc: 'Take no damage for the next 3 rounds.', effect: 'invincible_3' },
  { name: 'Double Damage (2 Rounds)', desc: 'Deal double damage for the next 2 rounds.', effect: 'double_dmg_2' },
  { name: 'Resurrect', desc: 'If you die this run, revive with 1 HP (one time).', effect: 'resurrect_once' },
  { name: 'Full Heal', desc: 'Restore to full HP instantly.', effect: 'full_heal' },
];

function getRandomPowerUpsWithRare(n = 3) {
  // 20% chance to include a rare power-up
  const includeRare = Math.random() < 0.2;
  let pool = [...POWER_UPS];
  if (includeRare) pool = pool.concat(RARE_POWER_UPS);
  const shuffled = pool.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function getRandomPowerUps(n = 3) {
  // Pick n unique random power-ups
  const shuffled = POWER_UPS.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

// Fun facts/tips for Infinite Mode
const FUN_TIPS = [
  'Tip: Use power-ups strategically—some are best saved for tough quirks!',
  'Did you know? The world record for a 3x3 cube solve is under 3.5 seconds!',
  'Quirks can stack with power-ups for wild effects. Experiment!',
  'Try to remember which quirks you’ve faced—some may repeat!',
  'Tip: If you see "Reverse Win/Lose", slow down on purpose!',
  'Fun Fact: The Rubik’s Cube has over 43 quintillion possible states.',
  'Tip: Healing power-ups are best used when you’re low on HP.',
  'Some power-ups only last one round—plan ahead!',
  'Fun Fact: The first Rubik’s Cube was invented in 1974 by Ernő Rubik.',
  'Tip: Combo bonuses stack with other damage modifiers!'
];
function getRandomTip() {
  return FUN_TIPS[Math.floor(Math.random() * FUN_TIPS.length)];
}

// --- Cube Agency: Player-Selected Scramble Type ---
const SCRAMBLE_TYPES = [
  { label: 'Easy', value: 'Easy', desc: 'AI is slower, you have an advantage.' },
  { label: 'Medium', value: 'Medium', desc: 'Normal round.' },
  { label: 'Hard', value: 'Hard', desc: 'AI is faster, round is tougher.' }
];

function App() {
  // State Variables
  const [gameState, setGameState] = useState(GAME_STATES.NAME);
  const [playerName, setPlayerName] = useState(''); 
  const [playerHP, setPlayerHP] = useState(MAX_HP);
  const [enemyHP, setEnemyHP] = useState(MAX_HP);
  const [comboCount, setComboCount] = useState(0);
  const [tymonCount, setTymonCount] = useState(INITIAL_TYMON_COUNT);
  const [logEntries, setLogEntries] = useState([]);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState('');

  // PvP: track combo for both players
  const [p1Combo, setP1Combo] = useState(0);
  const [p2Combo, setP2Combo] = useState(0);

  // State for visual effects
  const [playerImpact, setPlayerImpact] = useState(false);
  const [enemyImpact, setEnemyImpact] = useState(false);
  const [floatingDamages, setFloatingDamages] = useState([]); // Array of { id, target, amount, isCombo }
  const [comboFlashValue, setComboFlashValue] = useState(0); // Combo count for flash effect

  // Refs for audio elements
  const hitSoundRef = useRef(null);
  const victorySoundRef = useRef(null);
  const defeatSoundRef = useRef(null);
  // Play a sound and animate button on power-up selection
  const powerupAudioRef = useRef(null);

  const [csvData, setCsvData] = useState([]);
  const [difficulty, setDifficulty] = useState('Medium'); // Default to Medium
  const [customConfig, setCustomConfig] = useState(null);
  const [mode, setMode] = useState('single'); // 'single' or 'multi'
  const [currentScramble, setCurrentScramble] = useState('');
  const [scrambleChoice, setScrambleChoice] = useState(null);

  // Cooperative mode state
  const [coopPlayers, setCoopPlayers] = useState([]); // [{ name, hp }]
  const [coopTimes, setCoopTimes] = useState([]); // [number]
  const [bossHP, setBossHP] = useState(MAX_HP * 2); // Boss has more HP
  const [coopLog, setCoopLog] = useState([]);
  // Coop task system
  const [coopTask, setCoopTask] = useState(null); // { type, target }

  // Infinite multiplayer mode state
  const [infinitePlayers, setInfinitePlayers] = useState([]); // For infinite mode
  const [infiniteRound, setInfiniteRound] = useState(1); // Track round number
  const [infiniteLog, setInfiniteLog] = useState([]); // Log for infinite mode
  const [infiniteAI, setInfiniteAI] = useState(null); // { name, avatar, quirk }
  const [infiniteQuirkUsed, setInfiniteQuirkUsed] = useState(false); // for quirks like Lucky Hit

  // Infinite mode state additions
  const [pendingPowerUps, setPendingPowerUps] = useState([]); // Power-ups to choose from
  const [activePowerUps, setActivePowerUps] = useState([]); // Power-ups in effect
  const [permComboBonus, setPermComboBonus] = useState(0); // Permanent combo bonus
  const [showPowerUpChoice, setShowPowerUpChoice] = useState(false);
  const [infiniteBestRound, setInfiniteBestRound] = useState(() => {
    // Try to load from localStorage for persistence
    const val = localStorage.getItem('infiniteBestRound');
    return val ? parseInt(val, 10) : 0;
  });
  const [quirkHistory, setQuirkHistory] = useState([]); // Track quirks faced this run
  const [powerupHistory, setPowerupHistory] = useState([]); // Track power-ups chosen this run
  const [showRoundBanner, setShowRoundBanner] = useState(false);
  const [currentTip, setCurrentTip] = useState(getRandomTip());
  const [isBossRound, setIsBossRound] = useState(false);
  const [bossIndex, setBossIndex] = useState(0);

  // --- Achievements ---
  const ACHIEVEMENTS = [
    { key: 'round10', label: 'Survive 10 Rounds', check: (round) => round >= 10 },
    { key: 'boss3', label: 'Defeat 3 Bosses', check: (round) => Math.floor((round-1)/5) >= 3 },
    { key: 'clutch', label: 'Win a round with 1 HP left', check: (hp, log) => hp === 1 && /You win!/i.test(log) },
  ];
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [showAchievement, setShowAchievement] = useState(null);

  // --- Infinite Mode: Quick Start and Starting Power-Up ---
  const [showStartingPowerUp, setShowStartingPowerUp] = useState(false);
  const [startingPowerUp, setStartingPowerUp] = useState(null);
  const [pendingStartingPowerUps, setPendingStartingPowerUps] = useState([]);
  const [quickStart, setQuickStart] = useState(false);

  // --- Boss Rounds on 3, 6, 10 and End After 10 ---
  const BOSS_ROUNDS = [3, 6, 10];

  // --- Scramble Quality Indicator ---
  const [scrambleQuality, setScrambleQuality] = useState('Medium');
  function getScrambleQuality(scramble) {
    // Simple: random for now, could use real logic if available
    const roll = Math.random();
    if (roll < 0.33) return 'Easy';
    if (roll < 0.66) return 'Medium';
    return 'Hard';
  }
  useEffect(() => {
    if (currentScramble) setScrambleQuality(getScrambleQuality(currentScramble));
  }, [currentScramble]);

  useEffect(() => {
    // Link to the original stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/styles.css';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    // Load and parse the CSV file
    fetch('/further_curated_data.csv')
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true, // Enable header parsing
          complete: (result) => {
            setCsvData(result.data);
          },
        });
      });
  }, []);

  const getRandomRow = () => {
    if (csvData.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * csvData.length);
    return csvData[randomIndex];
  };

  // --- Dynamic Quirk/Power-Up Pool (move inside App for state access) ---
  // --- Remove repetitive quirks and power-ups, and upgrade (once chosen) ---
  let availableQuirks = AI_QUIRKS.filter(q => !quirkHistory.some(h => h && h.effect === q.effect));
  if (availableQuirks.length === 0) availableQuirks = [...AI_QUIRKS]; // fallback if all used
  let availablePowerUps = POWER_UPS.filter(pu => !powerupHistory.some(h => h && h.effect === pu.effect));
  if (availablePowerUps.length === 0) availablePowerUps = [...POWER_UPS]; // fallback if all used

  function getDynamicQuirk() {
    // Always random order, no repeats until pool exhausted
    const pool = infiniteRound > 10 ? availableQuirks : availableQuirks.slice(0, 6);
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function getDynamicPowerUps(n = 3) {
    // Always random order, no repeats until pool exhausted
    const pool = infiniteRound > 10 ? availablePowerUps : availablePowerUps.slice(0, 6);
    const shuffled = pool.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  }

  // -- Game Logic Functions --

  const appendLog = (message) => {
    setLogEntries(prev => [...prev, message]);
  };

  const startNewTurn = () => {
    const randomRow = getRandomRow();
    setCurrentScramble(randomRow ? randomRow.scr : 'Unknown scramble');
  };

  const processTurn = (playerTime, isTymon = false) => {
    if (isProcessingTurn || csvData.length === 0) return;
    setIsProcessingTurn(true);

    const randomRow = getRandomRow();
    const scramble = randomRow ? randomRow.scr : 'Unknown scramble';
    setCurrentScramble(scramble);
    // Use customConfig if available, otherwise fallback to difficulty
    const { ENEMY_TIME_MEAN, ENEMY_TIME_STD, DAMAGE_MULTIPLIER, USE_REAL_SOLVE, TYMON_MEAN, TYMON_STD } = customConfig || DIFFICULTY_SETTINGS[difficulty];
    let enemyTime;
    if (USE_REAL_SOLVE) {
      enemyTime = randomRow && randomRow.rest ? parseFloat(randomRow.rest) : normalRandom(ENEMY_TIME_MEAN, ENEMY_TIME_STD);
    } else {
      enemyTime = normalRandom(ENEMY_TIME_MEAN, ENEMY_TIME_STD);
    }

    // Reset effects from previous turn
    setPlayerImpact(false);
    setEnemyImpact(false);
    setComboFlashValue(0);
    // Floating damages will clear themselves via timeout

    let resultText = `<p>`;
    if (isTymon) {
      resultText += `<em>Tymon</em> assisted with a time of <span class="result-value">${playerTime.toFixed(2)}</span> sec. `;
    } else {
      resultText += `Your time: <span class="result-value">${playerTime.toFixed(2)}</span> sec. `;
    }
    resultText += `Enemy's time: <span class="result-value">${enemyTime.toFixed(2)}</span> sec. `;
    resultText += `<br>Scramble: <span class="scramble">${scramble}</span>`;

    let nextPlayerHP = playerHP;
    let nextEnemyHP = enemyHP;
    let nextComboCount = comboCount;
    
    if (playerTime < enemyTime) {
      // Player wins round
      const diff = enemyTime - playerTime;
      const baseDamage = Math.round((diff * DAMAGE_MULTIPLIER) + 5);
      nextComboCount++;
      const comboBonus = nextComboCount;
      const totalDamage = baseDamage + comboBonus;
      nextEnemyHP = Math.max(0, enemyHP - totalDamage);
      
      resultText += `You were faster by <span class="result-value">${diff.toFixed(2)}</span> sec. `;
      if (nextComboCount > 1) {
        resultText += `Enemy loses <span class="result-value">${baseDamage}</span> HP + <span class="result-value">${comboBonus}</span> combo bonus = <span class="result-value">${totalDamage}</span> total damage! (${nextComboCount}x combo)`;
        showFloatingDamage('enemy', totalDamage, true); // Trigger combo damage effect
        setComboFlashValue(nextComboCount); // Trigger combo flash
      } else {
        resultText += `Enemy loses <span class="result-value">${totalDamage}</span> HP.`;
        showFloatingDamage('enemy', totalDamage, false); // Trigger regular damage effect
      }
       hitSoundRef.current?.play();
       setEnemyImpact(true); // Trigger enemy impact animation
       setTimeout(() => setEnemyImpact(false), 500); // Remove impact class later

    } else if (playerTime > enemyTime) {
      // Enemy wins round
      const diff = playerTime - enemyTime;
      const damage = Math.round((diff * DAMAGE_MULTIPLIER) + 5);
      nextPlayerHP = Math.max(0, playerHP - damage);
      nextComboCount = 0; // Reset combo

      resultText += `Enemy was faster by <span class="result-value">${diff.toFixed(2)}</span> sec. You lose <span class="result-value">${damage}</span> HP.`;
       hitSoundRef.current?.play();
       setPlayerImpact(true); // Trigger player impact animation
       showFloatingDamage('player', damage, false);
       setTimeout(() => setPlayerImpact(false), 500);
    } else {
      // Tie
      resultText += `It's a tie! No damage dealt.`;
    }
    resultText += `</p>`;

    appendLog(resultText);

    // Update core game state
    setPlayerHP(nextPlayerHP);
    setEnemyHP(nextEnemyHP);
    setComboCount(nextComboCount);

    // Check for game over
    if (nextPlayerHP <= 0 || nextEnemyHP <= 0) {
        const message = nextPlayerHP <= 0 ? "Game Over! You were defeated." : "Victory! You defeated the enemy.";
        setGameOverMessage(message);
        setGameState(GAME_STATES.GAME_OVER);
        if (nextEnemyHP <= 0 && nextPlayerHP > 0) {
           victorySoundRef.current?.play();
        } else {
           defeatSoundRef.current?.play();
        }
    } else {
        // Only re-enable processing if game is not over
        setTimeout(() => {
            setIsProcessingTurn(false); 
        }, 50); 
        startNewTurn();
    }
   };

  // Helper function to add floating damage effect data
  const showFloatingDamage = (target, amount, isCombo) => {
    const newDamage = {
      id: Date.now() + Math.random(), // Simple unique ID
      target,
      amount,
      isCombo
    };
    setFloatingDamages(prev => [...prev, newDamage]);

    // Remove the damage number after its animation finishes (e.g., 1 second)
    setTimeout(() => {
      setFloatingDamages(prev => prev.filter(d => d.id !== newDamage.id));
    }, 1000); // Match CSS animation duration
  };

  const handleUseTymon = () => {
    const config = customConfig || DIFFICULTY_SETTINGS[difficulty];
    const tymonMean = config.TYMON_MEAN ?? 5.0;
    const tymonStd = config.TYMON_STD ?? 0.5;
    if (tymonCount > 0 && !isProcessingTurn && csvData.length > 0) {
      setTymonCount(prev => prev - 1);
      // Use tymon sample distribution from config
      const tymonTime = normalRandom(tymonMean, tymonStd);
      processTurn(tymonTime, true);
    }
  };

  // Helper to generate a random coop task
  const generateCoopTask = (players) => {
    // Randomly pick a task type
    const taskTypes = ['average', 'identical'];
    const type = taskTypes[Math.floor(Math.random() * taskTypes.length)];
    if (type === 'average') {
      // Target average between 10 and 15, rounded to 1 decimal
      const target = (Math.random() * 5 + 10).toFixed(1);
      return { type, target: parseFloat(target) };
    } else {
      // Identical integer time between 10 and 15
      const target = Math.floor(Math.random() * 6 + 10);
      return { type, target };
    }
  };

  // -- Event Handlers --

  const handleNameEntered = (name, selectedMode = 'single', coopNames = []) => {
    setPlayerName(name);
    setMode(selectedMode);
    if (selectedMode === 'cooperative') {
      setGameState(GAME_STATES.COOP_SETUP);
    } else if (selectedMode === 'infinite') {
      setGameState(GAME_STATES.INFINITE_SETUP);
      setTimeout(() => startInfiniteRound(), 0);
    } else {
      setGameState(GAME_STATES.DIFFICULTY);
    }
    if (selectedMode === 'infinite') {
      setScrambleChoice(null);
    }
  };

  // Cooperative setup: start game with player names
  const handleCoopStart = (names) => {
    setCoopPlayers(names.map(n => ({ name: n, hp: MAX_HP })));
    setBossHP(MAX_HP * names.length); // Boss HP scales with player count
    setCoopLog([]);
    setCoopTask(generateCoopTask(names));
    setGameState(GAME_STATES.BATTLE);
    startNewTurn();
  };

  // Cooperative turn logic
  const processCoopTurn = (times) => {
    if (isProcessingTurn || csvData.length === 0) return;
    setIsProcessingTurn(true);
    const randomRow = getRandomRow();
    const scramble = randomRow ? randomRow.scr : 'Unknown scramble';
    setCurrentScramble(scramble);
    const { ENEMY_TIME_MEAN, ENEMY_TIME_STD, DAMAGE_MULTIPLIER, USE_REAL_SOLVE } = customConfig || DIFFICULTY_SETTINGS[difficulty];
    let bossTime;
    if (USE_REAL_SOLVE) {
      bossTime = randomRow && randomRow.rest ? parseFloat(randomRow.rest) : normalRandom(ENEMY_TIME_MEAN, ENEMY_TIME_STD);
    } else {
      bossTime = normalRandom(ENEMY_TIME_MEAN, ENEMY_TIME_STD);
    }
    // Only consider alive players
    const aliveIdxs = coopPlayers.map((p, i) => p.hp > 0 ? i : -1).filter(i => i !== -1);
    const aliveTimes = aliveIdxs.map(i => times[i]);
    // Find fastest among alive
    const minTime = Math.min(...aliveTimes);
    const fastestIdxs = aliveIdxs.filter(i => times[i] === minTime);
    // Boss attacks slowest alive player
    const maxTime = Math.max(...aliveTimes);
    const slowestIdx = aliveIdxs.find(i => times[i] === maxTime);
    let nextPlayers = [...coopPlayers];
    let nextBossHP = bossHP;
    let log = `<p>Boss time: <span class='result-value'>${bossTime.toFixed(2)}</span> sec.<br/>`;
    times.forEach((t, i) => {
      const eliminated = coopPlayers[i].hp <= 0;
      log += `${coopPlayers[i].name}: <span class='result-value'>${eliminated ? 'ELIMINATED' : t.toFixed(2) + ' sec.'}</span> `;
    });
    log += '<br/>';
    // Alive players faster than boss deal damage
    aliveIdxs.forEach(idx => {
      if (times[idx] < bossTime) {
        const diff = bossTime - times[idx];
        const dmg = Math.round(diff * DAMAGE_MULTIPLIER + 5);
        nextBossHP = Math.max(0, nextBossHP - dmg);
        log += `${coopPlayers[idx].name} hits boss for <span class='result-value'>${dmg}</span>! `;
        hitSoundRef.current?.play(); // Play hit sound when boss is hit
      }
    });
    // Coop task check
    let taskAchieved = false;
    if (coopTask) {
      if (coopTask.type === 'average') {
        // Only alive players
        const avg = aliveTimes.reduce((a, b) => a + b, 0) / aliveTimes.length;
        if (Math.abs(avg - coopTask.target) <= 0.3) taskAchieved = true;
      } else if (coopTask.type === 'identical') {
        // All alive times are the same integer and match target (±0.5)
        if (aliveTimes.every(t => Math.abs(t - coopTask.target) <= 0.5)) taskAchieved = true;
      }
      if (taskAchieved) {
        nextBossHP = Math.max(0, nextBossHP - 5);
        log += `<br/><span style='color:green;font-weight:bold'>Task achieved! Bonus 5 damage to boss!</span> `;
      } else {
        log += `<br/><span style='#888'>Task failed.</span> `;
      }
    }
    // Boss attacks slowest alive player if boss is faster
    if (bossTime < maxTime && slowestIdx !== undefined) {
      const diff = maxTime - bossTime;
      const dmg = Math.round(diff * DAMAGE_MULTIPLIER + 5);
      nextPlayers[slowestIdx].hp = Math.max(0, nextPlayers[slowestIdx].hp - dmg);
      log += `Boss hits ${coopPlayers[slowestIdx].name} for <span class='result-value'>${dmg}</span>!`;
      hitSoundRef.current?.play(); // Play hit sound when boss hits a player
    } else {
      log += 'Boss was not faster than any player.';
    }
    log += '</p>';
    setCoopLog(prev => [...prev, log]);
    setCoopPlayers(nextPlayers);
    setBossHP(nextBossHP);
    // Next task
    setCoopTask(generateCoopTask(coopPlayers));
    // Check for win/lose
    if (nextBossHP <= 0) {
      setGameOverMessage('Victory! The boss is defeated!');
      setGameState(GAME_STATES.GAME_OVER);
      victorySoundRef.current?.play();
    } else if (nextPlayers.every(p => p.hp <= 0)) {
      setGameOverMessage('Game Over! All players defeated.');
      setGameState(GAME_STATES.GAME_OVER);
      defeatSoundRef.current?.play();
    } else {
      setTimeout(() => setIsProcessingTurn(false), 50);
      startNewTurn();
    }
  };

  const handleConfigStart = (config) => {
    setCustomConfig(config);
    setPlayerHP(MAX_HP);
    setEnemyHP(MAX_HP);
    setComboCount(0);
    setP1Combo(0);
    setP2Combo(0);
    setTymonCount(INITIAL_TYMON_COUNT);
    setLogEntries([]);
    setIsProcessingTurn(false);
    setGameOverMessage('');
    setPlayerImpact(false);
    setEnemyImpact(false);
    setFloatingDamages([]);
    setComboFlashValue(0);
    setGameState(GAME_STATES.BATTLE);
    startNewTurn();
  };

  const handlePlayAgain = () => {
    window.location.reload();
  };

  // Infinite: start new round
  function startInfiniteRound() {
    const isBoss = BOSS_ROUNDS.includes(infiniteRound);
    setIsBossRound(isBoss);
    let aiHP = MAX_HP + 5 * infiniteRound;
    if (infiniteRound <= 5) aiHP = Math.round(MAX_HP * 0.6 + 3 * infiniteRound); // Lower early HP
    if (isBoss) {
      const boss = BOSS_AI[bossIndex % BOSS_AI.length];
      setInfiniteAI({ name: boss.name, avatar: boss.avatar, quirk: boss.superQuirk, isBoss: true });
      setEnemyHP(MAX_HP * 2);
      setBossIndex(bossIndex + 1);
    } else {
      const ai = getRandomAI();
      ai.quirk = getDynamicQuirk();
      setInfiniteAI({ ...ai, isBoss: false });
      setEnemyHP(aiHP);
    }
    setInfiniteQuirkUsed(false);
    setCurrentScramble(getRandomRow()?.scr || 'Unknown scramble');
    setQuirkHistory(prev => [...prev, (isBoss ? BOSS_AI[bossIndex % BOSS_AI.length].superQuirk : infiniteAI?.quirk)]);
    setShowRoundBanner(true);
    setCurrentTip(getRandomTip());
    if (infiniteRound === 1 && scrambleChoice) {
      setScrambleQuality(scrambleChoice);
    } else if (currentScramble) {
      setScrambleQuality(getScrambleQuality(currentScramble));
    }
    setTimeout(() => setShowRoundBanner(false), 1200);
  }

  // Infinite: process a round
  function processInfiniteTurn(playerTime) {
    if (!infiniteAI) return;
    const ai = infiniteAI;
    let aiTime;
    // Boss quirk: Time Lock should always set aiTime to 9.00
    if (ai.isBoss && ai.quirk.effect === 'boss_time_9') {
      aiTime = 9.00;
    } else if (ai.quirk.effect === 'freeze') {
      aiTime = 12.00;
    } else {
      // Make AI stronger as rounds increase (lower time = stronger)
      // Early rounds: AI is easier (higher mean), later rounds: AI is faster (lower mean)
      // Example: mean decreases from 13.5 (round 1) to 10.0 (round 10)
      const minMean = 10.0;
      const maxMean = 13.5;
      const mean = Math.max(minMean, maxMean - (infiniteRound - 1) * 0.4);
      const std = 0.7 + 0.05 * Math.min(infiniteRound, 10); // Slightly more consistent as rounds go
      aiTime = normalRandom(mean, std);
    }
    let log = `<p><b>Round ${infiniteRound}</b><br/>`;
    log += `Your time: <span class='result-value'>${playerTime.toFixed(2)}</span> sec<br/>`;
    log += `${ai.name}'s time: <span class='result-value'>${aiTime.toFixed(2)}</span> sec<br/>`;
    log += `<b>Quirk:</b> ${ai.quirk.name} - ${ai.quirk.desc}<br/>`;
    if (activePowerUps.length > 0) {
      log += `<b>Your Power-Ups:</b> ${activePowerUps.map(pu => pu.name).join(', ')}<br/>`;
    }
    let playerWins = playerTime < aiTime;
    let damage = Math.round(Math.abs(playerTime - aiTime) * 5 + 5);
    if (infiniteRound <= 5) damage = Math.round(damage * 1.5); // More damage early
    if (permComboBonus) {
      damage += permComboBonus;
      log += `Permanent combo bonus: +${permComboBonus} damage<br/>`;
    }
    if (activePowerUps.some(pu => pu.effect === 'halve_next_damage') && !playerWins) {
      log += `Halve Next Damage active: Damage to you is halved this round.<br/>`;
      damage = Math.ceil(damage / 2);
    }
    if (activePowerUps.some(pu => pu.effect === 'plus10_next') && playerWins) {
      log += `Deal +10 Next Hit active: +10 damage to AI this round.<br/>`;
      damage += 10;
    }
    if (activePowerUps.some(pu => pu.effect === 'shield') && !playerWins) {
      log += `Shield active: You block all damage this round!<br/>`;
      damage = 0;
    }
    if (ai.quirk.effect === 'double_damage') {
      log += `Quirk effect: All damage is doubled!<br/>`;
      damage *= 2;
    }
    if (ai.quirk.effect === 'reverse') {
      log += `Quirk effect: Slower solver wins this round!<br/>`;
      playerWins = !playerWins;
    }
    if (ai.quirk.effect === 'combo_breaker') {
      log += `Quirk effect: Combos reset this round.<br/>`;
      setComboCount(0);
    }
    if (ai.quirk.effect === 'lucky_hit' && !infiniteQuirkUsed) {
      log += `Quirk effect: First hit this round deals +10 bonus damage!<br/>`;
      damage += 10;
      setInfiniteQuirkUsed(true);
    }
    if (ai.quirk.effect === 'mirror') {
      aiTime = playerTime;
      log += `Quirk effect: AI copies your time exactly!<br/>`;
    }
    if (ai.quirk.effect === 'sudden_death') {
      if (playerTime !== aiTime) {
        if (playerTime < aiTime) {
          nextAIHP = 0;
          log += `Sudden Death: AI loses all HP!<br/>`;
        } else {
          nextPlayerHP = 0;
          log += `Sudden Death: You lose all HP!<br/>`;
        }
      } else {
        log += `Sudden Death: Tie, no one loses HP.<br/>`;
      }
    }
    if (ai.quirk.effect === 'combo_drain') {
      setComboCount(0);
      log += `Quirk effect: Your combo bonus is drained!<br/>`;
    }
    if (ai.quirk.effect === 'heal_ai' && !playerWins) {
      nextAIHP = Math.min(nextAIHP + 10, MAX_HP + 5 * infiniteRound);
      log += `Quirk effect: AI heals 10 HP!<br/>`;
    }
    if (ai.quirk.effect === 'half_damage') {
      damage = Math.ceil(damage / 2);
      log += `Quirk effect: All damage is halved!<br/>`;
    }
    if (ai.quirk.effect === 'parity_error') {
      if (Math.floor(playerTime) % 2 === 0) {
        playerTime += 2;
        log += `Parity Error: +2s penalty for not entering an odd time!<br/>`;
      }
    }
    if (ai.quirk.effect === 'oll_skip') {
      playerTime -= 1.5;
      log += `OLL Skip: You get a 1.5s time bonus!<br/>`;
    }
    if (ai.quirk.effect === 'lockup') {
      playerTime += 1.5;
      log += `Lockup: Your time is increased by 1.5s!<br/>`;
    }
    if (ai.quirk.effect === 'inspection_plus') {
      log += `Inspection+: You see AI's time before submitting!<br/>`;
      // (Handled in UI: showAIRealTime)
    }
    if (ai.quirk.effect === 'plus2_penalty') {
      playerTime += 2;
      log += `+2 Penalty: Your time is increased by 2s!<br/>`;
    }
    if (activePowerUps.some(pu => pu.effect === 'pll_skip')) {
      playerTime -= 2;
      log += `Power-Up: PLL Skip! Subtract 2s from your time.<br/>`;
    }
    if (activePowerUps.some(pu => pu.effect === 'perfect_cross') && playerWins) {
      damage *= 2;
      log += `Power-Up: Perfect Cross! Double damage for your first win this round.<br/>`;
    }
    // Play hit sound for every turn
    if (hitSoundRef.current) hitSoundRef.current.currentTime = 0, hitSoundRef.current.play();
    // Consistency bonus: if playerTime within ±0.2s of previous, +3 damage
    if (typeof processInfiniteTurn.lastTime === 'number' && Math.abs(playerTime - processInfiniteTurn.lastTime) <= 0.2) {
      damage += 3;
      log += `Consistency Bonus: +3 damage for similar time!<br/>`;
    }
    processInfiniteTurn.lastTime = playerTime;
    // PB tracking: highlight if this is the fastest time this run
    if (!processInfiniteTurn.pb || playerTime < processInfiniteTurn.pb) {
      processInfiniteTurn.pb = playerTime;
      log += `<span style='color:#16a085'><b>New PB for this run: ${playerTime.toFixed(2)}s!</b></span><br/>`;
    }
    let nextPlayerHP = playerHP;
    let nextAIHP = enemyHP;
    if (playerWins) {
      nextAIHP = Math.max(0, enemyHP - damage);
      log += `<span style='color:green'><b>You win!</b> ${ai.name} loses <b>${damage}</b> HP.</span><br/>`;
    } else {
      nextPlayerHP = Math.max(0, playerHP - damage);
      log += `<span style='color:red'><b>You lose!</b> You take <b>${damage}</b> HP damage.</span><br/>`;
    }
    log += `<b>Your HP:</b> ${nextPlayerHP} / ${MAX_HP} | <b>${ai.name} HP:</b> ${nextAIHP}<br/>`;
    log += `</p>`;
    setPlayerHP(nextPlayerHP);
    setEnemyHP(nextAIHP);
    setInfiniteLog(prev => [...prev, log]);
    if (nextPlayerHP <= 0) {
      setGameOverMessage('Game Over! You were defeated by ' + ai.name + '.');
      setGameState(GAME_STATES.GAME_OVER);
      defeatSoundRef.current?.play();
    } else if (nextAIHP <= 0) {
      const nextRound = infiniteRound + 1;
      setInfiniteRound(nextRound);
      setEnemyHP(MAX_HP + 5 * infiniteRound); // AI gets more HP each round
      if (nextRound > infiniteBestRound) {
        setInfiniteBestRound(nextRound);
        localStorage.setItem('infiniteBestRound', nextRound);
      }
      if (infiniteRound === 10) {
        setTimeout(() => {
          setGameOverMessage('Congratulations! You completed all 10 rounds!');
          setGameState(GAME_STATES.GAME_OVER);
        }, 1200);
        return;
      }
      // Every 2 rounds, offer power-up
      if ((infiniteRound + 1) % 2 === 0) {
        setPendingPowerUps(getDynamicPowerUps());
        setShowPowerUpChoice(true);
      } else {
        setTimeout(() => {
          startInfiniteRound();
          setGameState(GAME_STATES.INFINITE_BATTLE);
        }, 1000);
      }
    }
    // Remove one-time power-ups after use
    setActivePowerUps(prev => prev.filter(pu => !['halve_next_damage','see_ai_time','shield','plus10_next'].includes(pu.effect)));

    // Check for achievements
    if (ACHIEVEMENTS[0].check(infiniteRound) && !unlockedAchievements.includes('round10')) {
      setUnlockedAchievements(prev => [...prev, 'round10']);
      setShowAchievement(ACHIEVEMENTS[0].label);
    }
    if (ACHIEVEMENTS[1].check(infiniteRound) && !unlockedAchievements.includes('boss3')) {
      setUnlockedAchievements(prev => [...prev, 'boss3']);
      setShowAchievement(ACHIEVEMENTS[1].label);
    }
    if (ACHIEVEMENTS[2].check(nextPlayerHP, log) && !unlockedAchievements.includes('clutch')) {
      setUnlockedAchievements(prev => [...prev, 'clutch']);
      setShowAchievement(ACHIEVEMENTS[2].label);
    }
    if (showAchievement) setTimeout(() => setShowAchievement(null), 1800);
  }

  // -- Render Logic --

  const renderGameContent = () => {
    if (mode === 'infinite') {
      let nextQuirk = null;
      if (infiniteAI && gameState === GAME_STATES.INFINITE_BATTLE) {
        // Preview next round's quirk (not for boss rounds)
        const nextIsBoss = (infiniteRound + 1) % 5 === 0;
        if (!nextIsBoss) {
          nextQuirk = getDynamicQuirk();
        } else {
          const boss = BOSS_AI[(bossIndex) % BOSS_AI.length];
          nextQuirk = boss.superQuirk;
        }
      }
      if (showPowerUpChoice && pendingPowerUps.length > 0) {
        return (
          <div style={{background:'#f8fff8',border:'2px solid #6c6',borderRadius:12,padding:24,maxWidth:420,margin:'40px auto',textAlign:'center'}}>
            <h2>Choose a Power-Up!</h2>
            <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:18}}>
              {pendingPowerUps.map((pu, idx) => (
                <button
                  key={pu.name}
                  style={{
                    flex:1,padding:16,borderRadius:8,border:'1px solid #aaa',background:'#fff',cursor:'pointer',minWidth:100,
                    transition:'transform 0.15s',
                    ...(pu._animate ? {transform:'scale(1.08)',boxShadow:'0 0 12px #6c'} : {})
                  }}
                  onClick={() => {
                    setActivePowerUps(prev => [...prev, pu]);
                    setPowerupHistory(prev => [...prev, pu]);
                    if (pu.effect === 'heal_20') setPlayerHP(hp => Math.min(hp + 20, MAX_HP));
                    if (pu.effect === 'perm_combo') setPermComboBonus(b => b + 1);
                    if (pu.effect === 'full_heal') setPlayerHP(MAX_HP);
                    setShowPowerUpChoice(false);
                    setPendingPowerUps([]);
                    // Animate and play sound
                    pendingPowerUps[idx]._animate = true;
                    if (powerupAudioRef.current) powerupAudioRef.current.currentTime = 0, powerupAudioRef.current.play();
                    setTimeout(() => {
                      startInfiniteRound();
                      setGameState(GAME_STATES.INFINITE_BATTLE);
                    }, 350);
                  }}
                  onAnimationEnd={() => { pu._animate = false; }}
                >
                  <b>{pu.name}</b>
                  <div style={{fontSize:13,color:'#444',marginTop:6}}>{pu.desc}</div>
                </button>
              ))}
            </div>
            <audio ref={powerupAudioRef} src="/victory.mp3" preload="auto"></audio>
          </div>
        );
      }
      if (showStartingPowerUp && pendingStartingPowerUps.length > 0) {
        return (
          <div style={{background:'#f8fff8',border:'2px solid #6c6',borderRadius:12,padding:24,maxWidth:420,margin:'40px auto',textAlign:'center'}}>
            <h2>Choose a Starting Power-Up!</h2>
            <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:18}}>
              {pendingStartingPowerUps.map((pu, idx) => (
                <button
                  key={pu.name}
                  style={{flex:1,padding:16,borderRadius:8,border:'1px solid #aaa',background:'#fff',cursor:'pointer',minWidth:100}}
                  onClick={() => {
                    setStartingPowerUp(pu);
                    setActivePowerUps([pu]);
                    setShowStartingPowerUp(false);
                    setTimeout(() => setGameState(GAME_STATES.INFINITE_BATTLE), 300);
                  }}
                >
                  <b>{pu.name}</b>
                  <div style={{fontSize:13,color:'#444',marginTop:6}}>{pu.desc}</div>
                </button>
              ))}
            </div>
          </div>
        );
      }
      if (gameState === GAME_STATES.INFINITE_SETUP && !scrambleChoice) {
        return (
          <div>
            <h2>Infinite Multiplayer (AI genned) - Setup</h2>
            <div style={{background:'#f8f8ff',border:'1px solid #bcd',borderRadius:8,padding:12,margin:'18px 0',fontSize:16}}>
              <b>Choose your first scramble type:</b>
              <div style={{display:'flex',gap:16,marginTop:10}}>
                {SCRAMBLE_TYPES.map(type => (
                  <button key={type.value} style={{padding:'10px 18px',borderRadius:8,border:'1px solid #aaa',background:'#fff',cursor:'pointer'}}
                    onClick={() => setScrambleChoice(type.value)}
                    title={type.desc}
                  >{type.label}</button>
                ))}
              </div>
              <div style={{fontSize:13,marginTop:8,color:'#888'}}>
                Easy: AI is slower. Hard: AI is faster. Medium: normal.
              </div>
            </div>
          </div>
        );
      }
      if (gameState === GAME_STATES.INFINITE_SETUP) {
        return (
          <div>
            <h2>Infinite Multiplayer (AI genned) - Setup</h2>
            <div style={{background:'#f8f8ff',border:'1px solid #bcd',borderRadius:8,padding:12,margin:'18px 0',fontSize:16}}>
              <b>Tip:</b> {currentTip}
            </div>
            <button onClick={() => {
              setPendingStartingPowerUps(getDynamicPowerUps(3));
              setShowStartingPowerUp(true);
              setQuickStart(false);
              setInfinitePlayers([{ name: playerName || 'Player', hp: MAX_HP }]);
              setInfiniteRound(1);
              setInfiniteLog([]);
            }}>Start Infinite Battle</button>
            <button style={{marginLeft:16}} onClick={() => {
              setPendingStartingPowerUps(getDynamicPowerUps(3));
              setShowStartingPowerUp(true);
              setQuickStart(true);
              setInfinitePlayers([{ name: playerName || 'Player', hp: MAX_HP }]);
              setInfiniteRound(5);
              setInfiniteLog([]);
            }}>Quick Start (Round 5)</button>
          </div>
        );
      }
      if (gameState === GAME_STATES.INFINITE_BATTLE) {
        return (
          <>
            {showRoundBanner && (
              <div style={{
                position:'fixed',top:80,left:0,right:0,zIndex:1000,
                textAlign:'center',fontSize:36,fontWeight:'bold',
                color:'#fff',background:'rgba(52,152,219,0.92)',
                padding:'24px 0',borderRadius:12,boxShadow:'0 4px 24px #3498db88',
                transition:'opacity 0.5s',opacity:showRoundBanner?1:0
              }}>
                Next Round: {infiniteRound}
              </div>
            )}
            {showAchievement && (
              <div style={{position:'fixed',top:120,left:0,right:0,zIndex:2000,textAlign:'center'}}>
                <div style={{display:'inline-block',background:'#fffbe6',border:'2px solid #ffe082',borderRadius:12,padding:'18px 36px',fontSize:22,fontWeight:'bold',color:'#b26a00',boxShadow:'0 2px 16px #ffd54f88'}}>
                  🏆 Achievement Unlocked: {showAchievement}
                </div>
              </div>
            )}
            <InfiniteBattleScreen
              infiniteRound={infiniteRound}
              infiniteBestRound={infiniteBestRound}
              infiniteAI={infiniteAI}
              currentScramble={currentScramble}
              playerHP={playerHP}
              enemyHP={enemyHP}
              MAX_HP={MAX_HP}
              activePowerUps={activePowerUps}
              processInfiniteTurn={processInfiniteTurn}
              infiniteLog={infiniteLog}
              showAIRealTime={activePowerUps.some(pu => pu.effect === 'see_ai_time')}
              quirkHistory={quirkHistory}
              powerupHistory={powerupHistory}
              nextQuirk={nextQuirk}
              scrambleQuality={scrambleQuality}
            />
          </>
        );
      }
    }
    if (mode === 'cooperative') {
      if (gameState === GAME_STATES.COOP_SETUP) {
        // Minimal: ask for comma-separated names
        return (
          <div>
            <h2>Cooperative Mode: Enter player names (comma separated)</h2>
            <input type="text" id="coopNamesInput" placeholder="Alice,Bob,Charlie" />
            <button onClick={() => {
              const val = document.getElementById('coopNamesInput').value;
              const names = val.split(',').map(s => s.trim()).filter(Boolean);
              if (names.length > 0) handleCoopStart(names);
            }}>Start Coop Battle</button>
          </div>
        );
      }
      if (gameState === GAME_STATES.BATTLE) {
        // Improved: show HP bars, scramble, and a table for times/HP
        return (
          <div className="coop-battle-container">
            <h2>Cooperative Boss Battle</h2>
            <div className="coop-boss-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <img src="/flc.png" alt="Boss" style={{ width: 64, height: 64, borderRadius: 8 }} />
                <div>
                  <div><b>Boss HP:</b> {bossHP} / {MAX_HP * coopPlayers.length}</div>
                  <div className="hp-bar" style={{ width: 200, height: 16, background: '#eee', borderRadius: 8, overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ width: `${(bossHP / (MAX_HP * coopPlayers.length)) * 100}%`, height: '100%', background: '#e74c3c', transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="coop-task" style={{margin:'10px 0',fontWeight:'bold',color:'#2c3e50'}}>
              {coopTask && coopTask.type === 'average' && (
                <>Task: Average your times to <span style={{color:'#16a085'}}>{coopTask.target}</span> sec (±0.3)</>
              )}
              {coopTask && coopTask.type === 'identical' && (
                <>Task: All alive players enter exactly <span style={{color:'#16a085'}}>{coopTask.target}</span> sec (±0.5)</>
              )}
            </div>
            <div className="coop-scramble" style={{ margin: '18px 0', fontSize: 18 }}>
              <b>Scramble:</b> <span className="scramble">{currentScramble}</span>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              const times = coopPlayers.map((p, i) => {
                if (p.hp <= 0) return 9999; // eliminated players get dummy high time
                const v = document.getElementById('coopTime' + i).value;
                const mod = parseFloat(document.getElementById('coopTimeMod' + i)?.value || 0);
                return parseFloat(v) + (isNaN(mod) ? 0 : mod);
              });
              if (coopPlayers.every((p, i) => p.hp <= 0 || (!isNaN(times[i]) && times[i] > 0))) processCoopTurn(times);
            }}>
              <table className="coop-table" style={{ width: '100%', maxWidth: 500, margin: '0 auto 16px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f8f8' }}>
                    <th style={{ padding: 6 }}>Player</th>
                    <th style={{ padding: 6 }}>HP</th>
                    <th style={{ padding: 6 }}>Time (sec)</th>
                  </tr>
                </thead>
                <tbody>
                  {coopPlayers.map((p, i) => (
                    <tr key={i} style={{ background: p.hp <= 0 ? '#fbeaea' : 'white' }}>
                      <td style={{ padding: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Profile image */}
                        <img
                          src={
                            i === 0 ? '/yza.png' :
                            i === 1 ? '/smf.png' :
                            i === 2 ? '/czy.png' :
                            '/rob.png'
                          }
                          alt="Profile"
                          style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid #ccc', background: '#fff' }}
                        />
                        <span style={{ fontWeight: 'bold', color: p.hp <= 0 ? '#c0392b' : undefined }}>
                          {p.name}{p.hp <= 0 ? ' (ELIMINATED)' : ''}
                        </span>
                      </td>
                      <td style={{ padding: 6 }}>
                        <div style={{ width: 80, height: 12, background: '#eee', borderRadius: 6, display: 'inline-block', marginRight: 6 }}>
                          <div style={{ width: `${(p.hp / MAX_HP) * 100}%`, height: '100%', background: '#3498db', borderRadius: 6, transition: 'width 0.3s' }} />
                        </div>
                        {p.hp}
                      </td>
                      <td style={{ padding: 6 }}>
                        <input id={'coopTime' + i} type="number" step="0.01" min="0" style={{ width: 70 }} disabled={p.hp <= 0} placeholder={p.hp <= 0 ? 'ELIM' : ''} />
                        <span style={{marginLeft:8}}>
                          <input id={'coopTimeMod' + i} type="number" step="0.01" style={{ width: 50 }} placeholder="mod" title="Optional time modifier (e.g. +2, -1)" disabled={p.hp <= 0} />
                          <span style={{fontSize:12, color:'#888', marginLeft:2}}>(+/-)</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="submit" disabled={isProcessingTurn} style={{ fontWeight: 'bold', fontSize: 16, padding: '6px 18px' }}>Submit Times</button>
            </form>
            <div>
              <h3>Battle Log</h3>
              <div style={{ maxHeight: 260, overflowY: 'auto', background: '#fafbfc', border: '1px solid #eee', borderRadius: 8, padding: 10 }}>
                {coopLog.map((entry, idx) => (
                  <div key={idx} style={{ marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: entry }} />
                ))}
              </div>
            </div>
          </div>
        );
      }
    }
    switch (gameState) {
      case GAME_STATES.NAME:
        return <StartScreen onStartBattle={handleNameEntered} />;
      case GAME_STATES.DIFFICULTY:
        return (
          <ConfigScreen
            onStart={handleConfigStart}
            initialConfig={DIFFICULTY_SETTINGS[difficulty]}
          />
        );
      case GAME_STATES.BATTLE:
        const config = customConfig || DIFFICULTY_SETTINGS[difficulty];
        return (
          <BattleScreen 
            playerName={playerName}
            playerHP={playerHP}
            enemyHP={enemyHP}
            comboCount={comboCount}
            tymonCount={tymonCount}
            logEntries={logEntries}
            processTurn={processTurn}
            processMultiplayerTurn={processMultiplayerTurn}
            handleUseTymon={handleUseTymon}
            playerImpact={playerImpact}
            enemyImpact={enemyImpact}
            floatingDamages={floatingDamages}
            comboFlashValue={comboFlashValue}
            currentScramble={currentScramble}
            difficulty={difficulty}
            config={config}
            mode={mode}
          />
        );
      case GAME_STATES.GAME_OVER:
        if (mode === 'infinite') {
          // Collect summary info
          const quirksFaced = infiniteLog
            .map(entry => {
              const match = entry.match(/<b>Quirk:<\/b> ([^<]*) -/);
              return match ? match[1] : null;
            })
            .filter(Boolean);
          const powerUpsChosen = activePowerUps.map(pu => pu.name);
          return (
            <div style={{textAlign:'center',marginTop:40}}>
              <h2>{gameOverMessage}</h2>
              <div style={{fontSize:20,margin:'18px 0'}}>You reached <b>Round {infiniteRound}</b>!</div>
              <div style={{fontSize:16,margin:'10px 0'}}>Best Streak: <b>Round {infiniteBestRound}</b></div>
              <div style={{margin:'18px 0'}}>
                <b>Quirks Faced:</b>
                <div style={{marginTop:4,marginBottom:8}}>
                  {quirksFaced.length > 0 ? quirksFaced.map((q, i) => <span key={q+i} style={{marginRight:8}}>{q}</span>) : <span>None</span>}
                </div>
                <b>Power-Ups Chosen:</b>
                <div style={{marginTop:4}}>
                  {powerUpsChosen.length > 0 ? powerUpsChosen.map((p, i) => <span key={p+i} style={{marginRight:8}}>{p}</span>) : <span>None</span>}
                </div>
              </div>
              <button onClick={handlePlayAgain} style={{fontSize:18,padding:'8px 24px',marginTop:18}}>Play Again</button>
            </div>
          );
        }
        return (
           <GameOverScreen 
             message={gameOverMessage}
             playerHP={playerHP}
             enemyHP={enemyHP}
             onPlayAgain={handlePlayAgain}
           />
        );
      default:
        return <p>Loading Game...</p>;
    }
  };

  const processMultiplayerTurn = (playerTime, _isTymon, opponentTime) => {
    if (isProcessingTurn) return;
    setIsProcessingTurn(true);
    const enemyTime = opponentTime;
    const { DAMAGE_MULTIPLIER } = customConfig || DIFFICULTY_SETTINGS[difficulty];
    let resultText = `<p>Player 1 time: <span class='result-value'>${playerTime.toFixed(2)}</span> sec. Player 2 time: <span class='result-value'>${enemyTime.toFixed(2)}</span> sec.</p>`;
    let nextPlayerHP = playerHP;
    let nextEnemyHP = enemyHP;
    let nextP1Combo = p1Combo;
    let nextP2Combo = p2Combo;
    if (playerTime < enemyTime) {
      // Player 1 wins
      const diff = enemyTime - playerTime;
      nextP1Combo++;
      nextP2Combo = 0;
      const baseDamage = Math.round((diff * DAMAGE_MULTIPLIER) + 5);
      const comboBonus = nextP1Combo;
      const totalDamage = baseDamage + comboBonus;
      nextEnemyHP = Math.max(0, enemyHP - totalDamage);
      resultText += `Player 1 was faster by <span class='result-value'>${diff.toFixed(2)}</span> sec. Player 2 loses <span class='result-value'>${baseDamage}</span> HP + <span class='result-value'>${comboBonus}</span> combo bonus = <span class='result-value'>${totalDamage}</span> total damage! (${nextP1Combo}x combo)`;
      showFloatingDamage('enemy', totalDamage, nextP1Combo > 1);
      setComboFlashValue(nextP1Combo);
      hitSoundRef.current?.play();
      setEnemyImpact(true);
      setTimeout(() => setEnemyImpact(false), 500);
    } else if (playerTime > enemyTime) {
      // Player 2 wins
      const diff = playerTime - enemyTime;
      nextP2Combo++;
      nextP1Combo = 0;
      const baseDamage = Math.round((diff * DAMAGE_MULTIPLIER) + 5);
      const comboBonus = nextP2Combo;
      const totalDamage = baseDamage + comboBonus;
      nextPlayerHP = Math.max(0, playerHP - totalDamage);
      resultText += `Player 2 was faster by <span class='result-value'>${diff.toFixed(2)}</span> sec. Player 1 loses <span class='result-value'>${baseDamage}</span> HP + <span class='result-value'>${comboBonus}</span> combo bonus = <span class='result-value'>${totalDamage}</span> total damage! (${nextP2Combo}x combo)`;
      showFloatingDamage('player', totalDamage, nextP2Combo > 1);
      setComboFlashValue(nextP2Combo);
      hitSoundRef.current?.play();
      setPlayerImpact(true);
      setTimeout(() => setPlayerImpact(false), 500);
    } else {
      // Tie
      resultText += `It's a tie! No damage dealt.`;
    }
    appendLog(resultText);
    setPlayerHP(nextPlayerHP);
    setEnemyHP(nextEnemyHP);
    setP1Combo(nextP1Combo);
    setP2Combo(nextP2Combo);
    if (nextPlayerHP <= 0 || nextEnemyHP <= 0) {
      const message = nextPlayerHP <= 0 ? 'Game Over! Player 2 wins.' : 'Victory! Player 1 wins.';
      setGameOverMessage(message);
      setGameState(GAME_STATES.GAME_OVER);
      if (nextEnemyHP <= 0 && nextPlayerHP > 0) {
        victorySoundRef.current?.play();
      } else {
        defeatSoundRef.current?.play();
      }
    } else {
      setTimeout(() => setIsProcessingTurn(false), 50);
      startNewTurn();
    }
  };

  return (
    <div className="container">
      <div id="gameContainer">
        <div id="game">
          {renderGameContent()}
        </div>
      </div>
      <div id="rulesContainer">
        <h2>Game Rules</h2>
         <ul>
          <li>Both you and the enemy start with 50 HP.</li>
          <li>Each turn, you both "solve" the Rubik's Cube simultaneously.</li>
          <li>You enter your solving time (in seconds), and the enemy's time is based on his real time for that specific scramble.</li>
          <li>The slower solver loses HP equal to round(|difference| × 5 + 5).</li>
          <li>If the times are equal, no damage is dealt.</li>
          <li>You can use your helper <em>Tymon</em> (3 times per game) to substitute your time with a value between 4 and 6 sec.</li>
          <li>Each consecutive win builds a combo, adding +1 damage for each combo level (resets when you lose).</li>
          <li>The battle continues until one side's HP reaches 0.</li>
          <li><b>Cooperative mode:</b> Multiple players fight a boss. Each turn, all players enter their times. Players faster than the boss deal damage to the boss. The boss attacks the slowest player if it is faster than them. Boss has double HP. All players lose if all reach 0 HP.</li>
          <li><b>Note:</b> This game is optimized for players averaging 10-14 seconds. If your average is outside this range, use the optional time modifier box next to your input each turn.</li>
        </ul>
      </div>
      <audio ref={hitSoundRef} src="/hit.wav" preload="auto"></audio>
      <audio ref={victorySoundRef} src="/victory.mp3" preload="auto"></audio>
      <audio ref={defeatSoundRef} src="/failure.wav" preload="auto"></audio>
    </div>
  );
}

export default App;
