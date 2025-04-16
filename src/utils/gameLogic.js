// Function to sample a normally distributed random number using Box–Muller transform.
export function normalRandom(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * std + mean;
}

// Helper functions for mo3, ao5, ao12
export function mean(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function ao(arr, n) {
  if (!arr || arr.length < n) return null;
  const lastN = arr.slice(-n);
  if (n >= 5) {
    const sorted = [...lastN].sort((a, b) => a - b);
    sorted.shift();
    sorted.pop();
    return mean(sorted);
  }
  return mean(lastN);
}

// Constants
export const MAX_HP = 50;
export const INITIAL_TYMON_COUNT = 3;

// Add difficulty-based parameters
export const DIFFICULTY_SETTINGS = {
  Easy: {
    ENEMY_TIME_MEAN: 13.0,
    ENEMY_TIME_STD: 1.5,
    DAMAGE_MULTIPLIER: 4,
  },
  Medium: {
    ENEMY_TIME_MEAN: 11.62,
    ENEMY_TIME_STD: 1.1,
    DAMAGE_MULTIPLIER: 5,
  },
  Hard: {
    ENEMY_TIME_MEAN: 10.0,
    ENEMY_TIME_STD: 0.8,
    DAMAGE_MULTIPLIER: 6,
  },
};

// Pure game logic for a single turn (returns result object)
export function computeTurn({ playerTime, enemyTime, playerHP, enemyHP, comboCount, damageMultiplier }) {
  let resultText = '';
  let nextPlayerHP = playerHP;
  let nextEnemyHP = enemyHP;
  let nextComboCount = comboCount;
  let floatingDamage = null;
  let comboFlash = null;
  if (playerTime < enemyTime) {
    const diff = enemyTime - playerTime;
    const baseDamage = Math.round((diff * damageMultiplier) + 5);
    nextComboCount++;
    const comboBonus = nextComboCount;
    const totalDamage = baseDamage + comboBonus;
    nextEnemyHP = Math.max(0, enemyHP - totalDamage);
    resultText = `You were faster by ${diff.toFixed(2)} sec. Enemy loses ${baseDamage} HP + ${comboBonus} combo bonus = ${totalDamage} total damage! (${nextComboCount}x combo)`;
    floatingDamage = { target: 'enemy', amount: totalDamage, isCombo: nextComboCount > 1 };
    comboFlash = nextComboCount;
  } else if (playerTime > enemyTime) {
    const diff = playerTime - enemyTime;
    const damage = Math.round((diff * damageMultiplier) + 5);
    nextPlayerHP = Math.max(0, playerHP - damage);
    nextComboCount = 0;
    resultText = `Enemy was faster by ${diff.toFixed(2)} sec. You lose ${damage} HP.`;
    floatingDamage = { target: 'player', amount: damage, isCombo: false };
    comboFlash = 0;
  } else {
    resultText = `It's a tie! No damage dealt.`;
    comboFlash = nextComboCount;
  }
  return {
    nextPlayerHP,
    nextEnemyHP,
    nextComboCount,
    resultText,
    floatingDamage,
    comboFlash
  };
}

// Pure game logic for infinite mode (returns result object)
export function computeInfiniteTurn({
  playerTime,
  aiTime,
  playerHP,
  enemyHP,
  infiniteRound,
  permComboBonus,
  activePowerUps,
  aiQuirk,
  maxHP
}) {
  let playerWins = playerTime < aiTime;
  let baseDamage = Math.abs(playerTime - aiTime) * 5 + 5;
  let damage = Math.round(baseDamage);
  let damageFormula = `|${playerTime.toFixed(2)} - ${aiTime.toFixed(2)}| * 5 + 5`;
  let formulaSteps = [`Base: ${damageFormula} = ${baseDamage.toFixed(2)}`];
  let addModifiers = 0;
  let mulModifiers = 1;
  let modifierNotes = [];
  if (infiniteRound <= 5) {
    mulModifiers *= 1.5;
    modifierNotes.push('x1.5 (early round)');
    formulaSteps.push('Early round: *1.5');
  }
  if (permComboBonus) {
    addModifiers += permComboBonus;
    modifierNotes.push(`+${permComboBonus} permanent combo bonus`);
    formulaSteps.push(`+${permComboBonus} permanent combo bonus`);
  }
  if (activePowerUps.some(pu => pu.effect === 'halve_next_damage') && !playerWins) {
    mulModifiers *= 0.5;
    modifierNotes.push('x0.5 (Halve Next Damage)');
    formulaSteps.push('Halved: *0.5');
  }
  if (activePowerUps.some(pu => pu.effect === 'plus10_next') && playerWins) {
    addModifiers += 10;
    modifierNotes.push('+10 (Deal +10 Next Hit)');
    formulaSteps.push('+10 from Deal +10 Next Hit');
  }
  if (activePowerUps.some(pu => pu.effect === 'shield') && !playerWins) {
    mulModifiers = 0;
    addModifiers = 0;
    modifierNotes.push('Set to 0 by Shield');
    formulaSteps.push('Set to 0 by Shield');
  }
  if (aiQuirk === 'double_damage') {
    mulModifiers *= 2;
    modifierNotes.push('x2 (Double Damage quirk)');
    formulaSteps.push('Doubled by Double Damage quirk');
  }
  // ...add more quirk/powerup logic as needed...
  damage = Math.round(damage * mulModifiers + addModifiers);
  if (modifierNotes.length > 0) {
    damageFormula += ', ' + modifierNotes.join(', ');
  }
  let nextPlayerHP = playerHP;
  let nextAIHP = enemyHP;
  if (playerWins) {
    nextAIHP = Math.max(0, enemyHP - damage);
  } else {
    nextPlayerHP = Math.max(0, playerHP - damage);
  }
  return {
    nextPlayerHP,
    nextAIHP,
    playerWins,
    damage,
    damageFormula,
    formulaSteps
  };
}

// Pure game logic for cooperative mode (returns result object)
export function computeCoopTurn({
  times,
  coopPlayers,
  bossHP,
  coopTask,
  config
}) {
  const { ENEMY_TIME_MEAN, ENEMY_TIME_STD, DAMAGE_MULTIPLIER, USE_REAL_SOLVE } = config;
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
  let log = [];
  // Alive players faster than boss deal damage
  aliveIdxs.forEach(idx => {
    if (times[idx] < bossHP) {
      const diff = bossHP - times[idx];
      const dmg = Math.round(diff * DAMAGE_MULTIPLIER + 5);
      nextBossHP = Math.max(0, nextBossHP - dmg);
      log.push({ type: 'hit', player: coopPlayers[idx].name, dmg });
    }
  });
  // Coop task check
  let taskAchieved = false;
  if (coopTask) {
    if (coopTask.type === 'average') {
      const avg = aliveTimes.reduce((a, b) => a + b, 0) / aliveTimes.length;
      if (Math.abs(avg - coopTask.target) <= 0.3) taskAchieved = true;
    } else if (coopTask.type === 'identical') {
      if (aliveTimes.every(t => Math.abs(t - coopTask.target) <= 0.5)) taskAchieved = true;
    }
    if (taskAchieved) {
      nextBossHP = Math.max(0, nextBossHP - 5);
      log.push({ type: 'task', achieved: true });
    } else {
      log.push({ type: 'task', achieved: false });
    }
  }
  // Boss attacks slowest alive player if boss is faster
  if (bossHP < maxTime && slowestIdx !== undefined) {
    const diff = maxTime - bossHP;
    const dmg = Math.round(diff * DAMAGE_MULTIPLIER + 5);
    nextPlayers[slowestIdx].hp = Math.max(0, nextPlayers[slowestIdx].hp - dmg);
    log.push({ type: 'boss_hit', player: coopPlayers[slowestIdx].name, dmg });
  } else {
    log.push({ type: 'boss_no_hit' });
  }
  return {
    nextPlayers,
    nextBossHP,
    log
  };
}