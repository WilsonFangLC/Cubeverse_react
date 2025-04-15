import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import StartScreen from './components/StartScreen';
import BattleScreen from './components/BattleScreen'; 
import GameOverScreen from './components/GameOverScreen';
import ConfigScreen from './components/ConfigScreen';
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
};

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

  const [csvData, setCsvData] = useState([]);
  const [difficulty, setDifficulty] = useState('Medium'); // Default to Medium
  const [customConfig, setCustomConfig] = useState(null);
  const [mode, setMode] = useState('single'); // 'single' or 'multi'
  const [currentScramble, setCurrentScramble] = useState('');

  // Cooperative mode state
  const [coopPlayers, setCoopPlayers] = useState([]); // [{ name, hp }]
  const [coopTimes, setCoopTimes] = useState([]); // [number]
  const [bossHP, setBossHP] = useState(MAX_HP * 2); // Boss has more HP
  const [coopLog, setCoopLog] = useState([]);

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

  // -- Event Handlers --

  const handleNameEntered = (name, selectedMode = 'single', coopNames = []) => {
    setPlayerName(name);
    setMode(selectedMode);
    if (selectedMode === 'cooperative') {
      // Go to coop setup
      setGameState(GAME_STATES.COOP_SETUP);
    } else {
      setGameState(GAME_STATES.DIFFICULTY);
    }
  };

  // Cooperative setup: start game with player names
  const handleCoopStart = (names) => {
    setCoopPlayers(names.map(n => ({ name: n, hp: MAX_HP })));
    setBossHP(MAX_HP * 2);
    setCoopLog([]);
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
    fastestIdxs.forEach(idx => {
      if (times[idx] < bossTime) {
        const diff = bossTime - times[idx];
        const dmg = Math.round(diff * DAMAGE_MULTIPLIER + 5);
        nextBossHP = Math.max(0, nextBossHP - dmg);
        log += `${coopPlayers[idx].name} hits boss for <span class='result-value'>${dmg}</span>! `;
      }
    });
    // Boss attacks slowest alive player if boss is faster
    if (bossTime < maxTime && slowestIdx !== undefined) {
      const diff = maxTime - bossTime;
      const dmg = Math.round(diff * DAMAGE_MULTIPLIER + 5);
      nextPlayers[slowestIdx].hp = Math.max(0, nextPlayers[slowestIdx].hp - dmg);
      log += `Boss hits ${coopPlayers[slowestIdx].name} for <span class='result-value'>${dmg}</span>!`;
    } else {
      log += 'Boss was not faster than any player.';
    }
    log += '</p>';
    setCoopLog(prev => [...prev, log]);
    setCoopPlayers(nextPlayers);
    setBossHP(nextBossHP);
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

  // -- Render Logic --

  const renderGameContent = () => {
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
                  <div><b>Boss HP:</b> {bossHP} / {MAX_HP * 2}</div>
                  <div className="hp-bar" style={{ width: 200, height: 16, background: '#eee', borderRadius: 8, overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ width: `${(bossHP / (MAX_HP * 2)) * 100}%`, height: '100%', background: '#e74c3c', transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="coop-scramble" style={{ margin: '18px 0', fontSize: 18 }}>
              <b>Scramble:</b> <span className="scramble">{currentScramble}</span>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              const times = coopPlayers.map((p, i) => {
                if (p.hp <= 0) return 9999; // eliminated players get dummy high time
                const v = document.getElementById('coopTime' + i).value;
                return parseFloat(v);
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
                      <td style={{ padding: 6, fontWeight: 'bold', color: p.hp <= 0 ? '#c0392b' : undefined }}>{p.name}{p.hp <= 0 ? ' (ELIMINATED)' : ''}</td>
                      <td style={{ padding: 6 }}>
                        <div style={{ width: 80, height: 12, background: '#eee', borderRadius: 6, display: 'inline-block', marginRight: 6 }}>
                          <div style={{ width: `${(p.hp / MAX_HP) * 100}%`, height: '100%', background: '#3498db', borderRadius: 6, transition: 'width 0.3s' }} />
                        </div>
                        {p.hp}
                      </td>
                      <td style={{ padding: 6 }}>
                        <input id={'coopTime' + i} type="number" step="0.01" min="0" style={{ width: 70 }} disabled={p.hp <= 0} placeholder={p.hp <= 0 ? 'ELIM' : ''} />
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
        </ul>
      </div>
      <audio ref={hitSoundRef} src="/hit.wav" preload="auto"></audio>
      <audio ref={victorySoundRef} src="/victory.mp3" preload="auto"></audio>
      <audio ref={defeatSoundRef} src="/failure.wav" preload="auto"></audio>
    </div>
  );
}

export default App;
