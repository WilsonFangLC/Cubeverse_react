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
  DIFFICULTY_SETTINGS,
  mean,
  ao,
  computeTurn,
  computeInfiniteTurn,
  computeCoopTurn
} from './utils/gameLogic';
import { Line } from 'react-chartjs-2';

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
  { name: 'No Quirk', desc: 'No special effect this round.', effect: 'none' },
  { name: 'Mirror Match', desc: 'AI copies your time exactly this round.', effect: 'mirror' },
  // Removed Sudden Death and other too hard quirks
  { name: 'Combo Drain', desc: 'You lose all combo bonuses this round.', effect: 'combo_drain' },
  { name: 'Heal AI', desc: 'AI heals 10 HP if it wins this round.', effect: 'heal_ai' },
  { name: 'Weak Hit', desc: 'All damage is halved this round.', effect: 'half_damage' },
  { name: 'Parity Error', desc: 'You must enter an odd time (e.g., 11.11, 13.33) or take +2s penalty.', effect: 'parity_error' },
  { name: 'OLL Skip', desc: 'You get a 1.5s time bonus this round.', effect: 'oll_skip' },
  { name: 'Lockup', desc: 'Your time is increased by 1.5s this round.', effect: 'lockup' },
  { name: 'Inspection+', desc: 'See AI’s time before submitting.', effect: 'inspection_plus' },
  { name: '+2 Penalty', desc: 'Your time is increased by 2s this round.', effect: 'plus2_penalty' }
];
// --- More Quirks and Power-Ups for Variety ---
AI_QUIRKS.push(
  { name: 'Mirror Match', desc: 'AI copies your time exactly this round.', effect: 'mirror' },
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

// --- Boss Data for Infinite Mode ---
const BOSS_AI = [
  { name: 'Old Cow Turtle', avatar: '/old_cow_turtle_boss.png', superQuirk: { name: 'Triple Damage', desc: 'All damage is tripled this round.', effect: 'triple_damage' } },
  // Removed BLD Master (Blindfolded Fury)
  { name: 'Rob', avatar: '/rob.png', superQuirk: { name: 'Robotic Precision', desc: 'AI always gets 8.00s this round.', effect: 'boss_time_8' } },
  { name: 'Sleepy Turtle', avatar: '/sleep_gui.png', superQuirk: { name: 'Sleep Mode', desc: 'AI is slower, but heals 20 HP if it wins.', effect: 'heal_on_win' } },
  { name: 'Cute Cow Turtle', avatar: '/cute_cow_turtle_boss.png', superQuirk: { name: 'Cuteness Overload', desc: 'You lose 10 HP at the start of the round.', effect: 'start_hp_loss' } },
  { name: 'SMF', avatar: '/smf.png', superQuirk: { name: 'Time Lock', desc: 'AI always gets 9.00s this round.', effect: 'boss_time_9' } },
  { name: 'Czy', avatar: '/czy.png', superQuirk: { name: 'No Power-Ups', desc: 'You cannot use power-ups this round.', effect: 'no_powerups' } },
  { name: 'Tomb Turtle', avatar: '/Tomb_turtle_boss.png', superQuirk: { name: 'Double HP', desc: 'Boss has double HP this round.', effect: 'double_hp' } },
  // Removed Exe Sudden Death boss
  { name: 'Tomb Turtle Cute', avatar: '/tomb_turtle_cute.png', superQuirk: { name: 'Combo Steal', desc: 'Boss steals your combo bonus this round.', effect: 'steal_combo' } },
  { name: 'Tymon', avatar: '/tymon.png', superQuirk: { name: 'Tymon Power', desc: 'AI gets a random time between 4.00 and 6.00s.', effect: 'tymon_power' } },
  { name: 'FLC', avatar: '/flc.png', superQuirk: { name: 'No Combos', desc: 'Combo bonuses are disabled this round.', effect: 'no_combos' } },
  { name: 'YZA', avatar: '/yza.png', superQuirk: { name: 'Combo Shield', desc: 'Boss keeps its combo even if it loses.', effect: 'combo_shield' } }
];

// --- Infinite Mode Power-Ups ---
const POWER_UPS = [
  { name: 'Heal 20 HP', desc: 'Restore 20 HP (cannot exceed max).', effect: 'heal_20' },
  { name: 'Halve Next Damage', desc: 'Next round: all damage (to you) is halved.', effect: 'halve_next_damage' },
  { name: 'See AI Time', desc: 'Next round: see AI’s time before submitting.', effect: 'see_ai_time' },
  { name: '+1 Combo Bonus', desc: 'Permanently gain +1 combo bonus.', effect: 'perm_combo' },
  { name: 'Shield', desc: 'Block all damage next round.', effect: 'shield' },
  { name: 'Deal +10 Next Hit', desc: 'Next time you deal damage, add +10.', effect: 'plus10_next' },
  // New Power-Ups
  { name: 'Odd Master', desc: 'If your solve time has an odd integer part, deal +7 damage.', effect: 'odd_master' },
  { name: 'HP Boost', desc: 'Permanently increase your max HP by 10.', effect: 'hp_boost' },
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

  // --- Infinite mode: Track used bosses and power-ups to prevent repeats ---
  const [usedBosses, setUsedBosses] = useState([]); // Boss indices used this run
  const [usedPowerUps, setUsedPowerUps] = useState([]); // Power-up effects used this run

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

  // --- Infinite mode: AI selection now always uses BOSS_AI ---
  function getRandomInfiniteAI(usedIndices = []) {
    // Pick a random AI from BOSS_AI not already used this run
    const unused = BOSS_AI.map((_, idx) => idx).filter(idx => !usedIndices.includes(idx));
    let idx;
    if (unused.length > 0) {
      idx = unused[Math.floor(Math.random() * unused.length)];
    } else {
      idx = Math.floor(Math.random() * BOSS_AI.length); // fallback: allow repeats
    }
    const ai = BOSS_AI[idx];
    return { ...ai, isBoss: false, idx };
  }

  // --- Power-Ups: filter out repeats ---
  function getDynamicPowerUps(n = 3, usedEffects = []) {
    let available = POWER_UPS.filter(pu => !usedEffects.includes(pu.effect));
    if (available.length < n) available = [...POWER_UPS]; // fallback if all used
    const shuffled = available.sort(() => 0.5 - Math.random());
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
    const { ENEMY_TIME_MEAN, ENEMY_TIME_STD, DAMAGE_MULTIPLIER, USE_REAL_SOLVE } = customConfig || DIFFICULTY_SETTINGS[difficulty];
    let enemyTime;
    if (USE_REAL_SOLVE) {
      enemyTime = randomRow && randomRow.rest ? parseFloat(randomRow.rest) : normalRandom(ENEMY_TIME_MEAN, ENEMY_TIME_STD);
    } else {
      enemyTime = normalRandom(ENEMY_TIME_MEAN, ENEMY_TIME_STD);
    }
    setPlayerImpact(false);
    setEnemyImpact(false);
    setComboFlashValue(0);
    let resultText = `<p>`;
    if (isTymon) {
      resultText += `<em>Tymon</em> assisted with a time of <span class="result-value">${playerTime.toFixed(2)}</span> sec. `;
    } else {
      resultText += `Your time: <span class="result-value">${playerTime.toFixed(2)}</span> sec. `;
    }
    resultText += `Enemy's time: <span class="result-value">${enemyTime.toFixed(2)}</span> sec. <br>Scramble: <span class="scramble">${scramble}</span>`;
    const turnResult = computeTurn({
      playerTime,
      enemyTime,
      playerHP,
      enemyHP,
      comboCount,
      damageMultiplier: DAMAGE_MULTIPLIER
    });
    resultText += turnResult.resultText;
    appendLog(resultText);
    setPlayerHP(turnResult.nextPlayerHP);
    setEnemyHP(turnResult.nextEnemyHP);
    setComboCount(turnResult.nextComboCount);
    if (turnResult.floatingDamage) {
      showFloatingDamage(turnResult.floatingDamage.target, turnResult.floatingDamage.amount, turnResult.floatingDamage.isCombo);
    }
    setComboFlashValue(turnResult.comboFlash);
    if (turnResult.floatingDamage && turnResult.floatingDamage.target === 'enemy') {
      hitSoundRef.current?.play();
      setEnemyImpact(true);
      setTimeout(() => setEnemyImpact(false), 500);
    } else if (turnResult.floatingDamage && turnResult.floatingDamage.target === 'player') {
      hitSoundRef.current?.play();
      setPlayerImpact(true);
      setTimeout(() => setPlayerImpact(false), 500);
    }
    if (turnResult.nextPlayerHP <= 0 || turnResult.nextEnemyHP <= 0) {
      const message = turnResult.nextPlayerHP <= 0 ? "Game Over! You were defeated." : "Victory! You defeated the enemy.";
      setGameOverMessage(message);
      setGameState(GAME_STATES.GAME_OVER);
      if (turnResult.nextEnemyHP <= 0 && turnResult.nextPlayerHP > 0) {
        victorySoundRef.current?.play();
      } else {
        defeatSoundRef.current?.play();
      }
    } else {
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
    const config = customConfig || DIFFICULTY_SETTINGS[difficulty];
    const result = computeCoopTurn({
      times,
      coopPlayers,
      bossHP,
      coopTask,
      config
    });
    // Build log HTML from result.log
    let logHtml = `<p>Boss HP: <span class='result-value'>${bossHP}</span><br/>`;
    times.forEach((t, i) => {
      const eliminated = coopPlayers[i].hp <= 0;
      logHtml += `${coopPlayers[i].name}: <span class='result-value'>${eliminated ? 'ELIMINATED' : t.toFixed(2) + ' sec.'}</span> `;
    });
    logHtml += '<br/>';
    result.log.forEach(entry => {
      if (entry.type === 'hit') {
        logHtml += `${entry.player} hits boss for <span class='result-value'>${entry.dmg}</span>! `;
      } else if (entry.type === 'task') {
        logHtml += entry.achieved ? `<br/><span style='color:green;font-weight:bold'>Task achieved! Bonus 5 damage to boss!</span> ` : `<br/><span style='#888'>Task failed.</span> `;
      } else if (entry.type === 'boss_hit') {
        logHtml += `Boss hits ${entry.player} for <span class='result-value'>${entry.dmg}</span>!`;
      } else if (entry.type === 'boss_no_hit') {
        logHtml += 'Boss was not faster than any player.';
      }
    });
    logHtml += '</p>';
    setCoopLog(prev => [...prev, logHtml]);
    setCoopPlayers(result.nextPlayers);
    setBossHP(result.nextBossHP);
    setCoopTask(generateCoopTask(coopPlayers));
    if (result.nextBossHP <= 0) {
      setGameOverMessage('Victory! The boss is defeated!');
      setGameState(GAME_STATES.GAME_OVER);
      victorySoundRef.current?.play();
    } else if (result.nextPlayers.every(p => p.hp <= 0)) {
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
    setUsedBosses([]);
    setUsedPowerUps([]);
    window.location.reload();
  };

  // Infinite: start new round
  function startInfiniteRound() {
    const aiObj = getRandomInfiniteAI(usedBosses);
    setInfiniteAI({ name: aiObj.name, avatar: aiObj.avatar, quirk: aiObj.superQuirk, isBoss: false });
    setEnemyHP(MAX_HP + 5 * infiniteRound);
    setUsedBosses(prev => [...prev, aiObj.idx]);
    setInfiniteQuirkUsed(false);
    setCurrentScramble(getRandomRow()?.scr || 'Unknown scramble');
    setQuirkHistory(prev => [...prev, aiObj.superQuirk]);
    setShowRoundBanner(true);
    setCurrentTip(getRandomTip());
    if (infiniteRound === 1 && scrambleChoice) {
      setScrambleQuality(scrambleChoice);
    } else if (currentScramble) {
      setScrambleQuality(getScrambleQuality(currentScramble));
    }
    setTimeout(() => setShowRoundBanner(false), 1200);
  }

  // --- Infinite Mode: Track all times for the run ---
  const [solveTimes, setSolveTimes] = useState([]); // Array of numbers
  const [pbSingle, setPbSingle] = useState(null);
  const [pbMo3, setPbMo3] = useState(null);
  const [pbAo5, setPbAo5] = useState(null);
  const [pbAo12, setPbAo12] = useState(null);

  // Infinite: process a round
  function processInfiniteTurn(playerTime) {
    if (!infiniteAI) return;
    const ai = infiniteAI;
    let aiTime;
    if (ai.quirk.effect === 'boss_time_9') {
      aiTime = 9.00;
    } else if (ai.quirk.effect === 'boss_time_8') {
      aiTime = 8.00;
    } else if (ai.quirk.effect === 'freeze') {
      aiTime = 12.00;
    } else if (ai.quirk.effect === 'mirror') {
      aiTime = playerTime;
    } else if (ai.quirk.effect === 'tymon_power') {
      aiTime = 4 + Math.random() * 2;
    } else {
      const minMean = 10.0;
      const maxMean = 13.5;
      const meanVal = Math.max(minMean, maxMean - (infiniteRound - 1) * 0.4);
      const std = 0.7 + 0.05 * Math.min(infiniteRound, 10);
      aiTime = normalRandom(meanVal, std);
    }
    const result = computeInfiniteTurn({
      playerTime,
      aiTime,
      playerHP,
      enemyHP,
      infiniteRound,
      permComboBonus,
      activePowerUps,
      aiQuirk: ai.quirk.effect,
      maxHP: MAX_HP
    });
    let log = `<p><b>Round ${infiniteRound}</b><br/>`;
    log += `Your time: <span class='result-value'>${playerTime.toFixed(2)}</span> sec<br/>`;
    log += `${ai.name}'s time: <span class='result-value'>${aiTime.toFixed(2)}</span> sec<br/>`;
    log += `<b>Quirk:</b> ${ai.quirk.name} - ${ai.quirk.desc}<br/>`;
    if (activePowerUps.length > 0) {
      log += `<b>Your Power-Ups:</b> ${activePowerUps.map(pu => pu.name).join(', ')}<br/>`;
    }
    log += `<b>Damage Calculation:</b> ${result.damageFormula}<br/>`;
    log += `<b>Steps:</b> ${result.formulaSteps.join(' → ')}<br/>`;
    if (result.playerWins) {
      log += `<span style='color:green'><b>You win!</b> ${ai.name} loses <b>${result.damage}</b> HP.</span><br/>`;
      hitSoundRef.current?.play(); // Play hit sound for player win
      setEnemyImpact(true);
      setTimeout(() => setEnemyImpact(false), 500);
    } else {
      log += `<span style='color:red'><b>You lose!</b> You take <b>${result.damage}</b> HP damage.</span><br/>`;
      hitSoundRef.current?.play(); // Play hit sound for player loss
      setPlayerImpact(true);
      setTimeout(() => setPlayerImpact(false), 500);
    }
    log += `<b>Your HP:</b> ${result.nextPlayerHP} / ${MAX_HP} | <b>${ai.name} HP:</b> ${result.nextAIHP}<br/>`;
    log += `</p>`;
    setPlayerHP(result.nextPlayerHP);
    setEnemyHP(result.nextAIHP);
    setInfiniteLog(prev => [...prev, log]);
    if (result.nextPlayerHP <= 0) {
      setGameOverMessage('Game Over! You were defeated by ' + ai.name + '.');
      setGameState(GAME_STATES.GAME_OVER);
      defeatSoundRef.current?.play();
    } else if (result.nextAIHP <= 0) {
      const nextRound = infiniteRound + 1;
      setInfiniteRound(nextRound);
      setEnemyHP(MAX_HP + 5 * infiniteRound);
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
      if ((infiniteRound + 1) % 2 === 0) {
        setPendingPowerUps(getDynamicPowerUps(3, usedPowerUps));
        setShowPowerUpChoice(true);
      } else {
        setTimeout(() => {
          startInfiniteRound();
          setGameState(GAME_STATES.INFINITE_BATTLE);
        }, 1000);
      }
    }
    setActivePowerUps(prev => prev.filter(pu => !['halve_next_damage','see_ai_time','shield','plus10_next'].includes(pu.effect)));
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
                    setUsedPowerUps(prev => [...prev, pu.effect]);
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
            <div style={{
              background: '#f8f8ff',
              border: '1px solid #bcd',
              borderRadius: 8,
              padding: 12,
              margin: '18px 0',
              fontSize: 16
            }}>
              <b>Tip:</b> {currentTip}
            </div>
            <button onClick={() => {
              setPendingStartingPowerUps(getDynamicPowerUps(3));
              setShowStartingPowerUp(true);
              setQuickStart(false);
              setInfinitePlayers([{ name: playerName || 'Player', hp: MAX_HP }]);
              setInfiniteRound(1);
              setInfiniteLog([]);
            }}>
              Start Infinite Battle
            </button>
            <button style={{ marginLeft: 16 }} onClick={() => {
              setPendingStartingPowerUps(getDynamicPowerUps(3));
              setShowStartingPowerUp(true);
              setQuickStart(true);
              setInfinitePlayers([{ name: playerName || 'Player', hp: MAX_HP }]);
              setInfiniteRound(5);
              setInfiniteLog([]);
            }}>
              Quick Start (Round 5)
            </button>
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
              solveTimes={solveTimes}
              pbSingle={pbSingle}
              pbMo3={pbMo3}
              pbAo5={pbAo5}
              pbAo12={pbAo12}
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
