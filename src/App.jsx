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

  const handleNameEntered = (name, selectedMode = 'single') => {
    setPlayerName(name);
    setMode(selectedMode);
    setGameState(GAME_STATES.DIFFICULTY);
  };

  const handleConfigStart = (config) => {
    setCustomConfig(config);
    setPlayerHP(MAX_HP);
    setEnemyHP(MAX_HP);
    setComboCount(0);
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
    // Use opponentTime directly
    const enemyTime = opponentTime;
    const { DAMAGE_MULTIPLIER } = customConfig || DIFFICULTY_SETTINGS[difficulty];
    let resultText = `<p>Your time: <span class='result-value'>${playerTime.toFixed(2)}</span> sec. Opponent's time: <span class='result-value'>${enemyTime.toFixed(2)}</span> sec.</p>`;
    let nextPlayerHP = playerHP;
    let nextEnemyHP = enemyHP;
    let nextComboCount = comboCount;
    if (playerTime < enemyTime) {
      const diff = enemyTime - playerTime;
      const baseDamage = Math.round((diff * DAMAGE_MULTIPLIER) + 5);
      nextComboCount++;
      const comboBonus = nextComboCount;
      const totalDamage = baseDamage + comboBonus;
      nextEnemyHP = Math.max(0, enemyHP - totalDamage);
      resultText += `You were faster by <span class='result-value'>${diff.toFixed(2)}</span> sec. Opponent loses <span class='result-value'>${totalDamage}</span> HP.`;
      showFloatingDamage('enemy', totalDamage, nextComboCount > 1);
      setComboFlashValue(nextComboCount);
      hitSoundRef.current?.play();
      setEnemyImpact(true);
      setTimeout(() => setEnemyImpact(false), 500);
    } else if (playerTime > enemyTime) {
      const diff = playerTime - enemyTime;
      const damage = Math.round((diff * DAMAGE_MULTIPLIER) + 5);
      nextPlayerHP = Math.max(0, playerHP - damage);
      nextComboCount = 0;
      resultText += `Opponent was faster by <span class='result-value'>${diff.toFixed(2)}</span> sec. You lose <span class='result-value'>${damage}</span> HP.`;
      hitSoundRef.current?.play();
      setPlayerImpact(true);
      showFloatingDamage('player', damage, false);
      setTimeout(() => setPlayerImpact(false), 500);
    } else {
      resultText += `It's a tie! No damage dealt.`;
    }
    appendLog(resultText);
    setPlayerHP(nextPlayerHP);
    setEnemyHP(nextEnemyHP);
    setComboCount(nextComboCount);
    if (nextPlayerHP <= 0 || nextEnemyHP <= 0) {
      const message = nextPlayerHP <= 0 ? 'Game Over! You were defeated.' : 'Victory! You defeated your opponent.';
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
        </ul>
      </div>
      <audio ref={hitSoundRef} src="/hit.wav" preload="auto"></audio>
      <audio ref={victorySoundRef} src="/victory.mp3" preload="auto"></audio>
      <audio ref={defeatSoundRef} src="/failure.wav" preload="auto"></audio>
    </div>
  );
}

export default App;
