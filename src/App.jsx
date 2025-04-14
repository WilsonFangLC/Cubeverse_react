import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import StartScreen from './components/StartScreen';
import BattleScreen from './components/BattleScreen'; 
import GameOverScreen from './components/GameOverScreen';
import { 
  normalRandom, 
  MAX_HP, 
  INITIAL_TYMON_COUNT, 
  DAMAGE_MULTIPLIER, 
  ENEMY_TIME_MEAN, 
  ENEMY_TIME_STD 
} from './utils/gameLogic';

// Define game states
const GAME_STATES = {
  START: 'START',
  BATTLE: 'BATTLE',
  GAME_OVER: 'GAME_OVER',
};

function App() {
  // State Variables
  const [gameState, setGameState] = useState(GAME_STATES.START);
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

  const processTurn = (playerTime, isTymon = false) => {
    if (isProcessingTurn || csvData.length === 0) return;
    setIsProcessingTurn(true);

    const randomRow = getRandomRow();
    const scramble = randomRow ? randomRow.scr : 'Unknown scramble';
    const enemyTime = randomRow && randomRow.rest ? parseFloat(randomRow.rest) : normalRandom(ENEMY_TIME_MEAN, ENEMY_TIME_STD);

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
    if (tymonCount > 0 && !isProcessingTurn && csvData.length > 0) {
      setTymonCount(prev => prev - 1);
      const randomRow = getRandomRow();
      const tymonTime = randomRow ? parseFloat(randomRow.time) : (Math.random() * 2) + 4;
      processTurn(tymonTime, true);
    }
  };

  // -- Event Handlers --

  const handleStartBattle = (name) => {
    setPlayerName(name);
    // Reset core game state
    setPlayerHP(MAX_HP);
    setEnemyHP(MAX_HP);
    setComboCount(0);
    setTymonCount(INITIAL_TYMON_COUNT);
    setLogEntries([]);
    setIsProcessingTurn(false);
    setGameOverMessage('');
    // Reset visual effect states
    setPlayerImpact(false);
    setEnemyImpact(false);
    setFloatingDamages([]);
    setComboFlashValue(0); // Ensure flash value is reset
    // Set game state LAST after all resets are queued
    setGameState(GAME_STATES.BATTLE);
  };

  const handlePlayAgain = () => {
      setGameState(GAME_STATES.START); 
  };

  // -- Render Logic --

  const renderGameContent = () => {
    switch (gameState) {
      case GAME_STATES.START:
        return <StartScreen onStartBattle={handleStartBattle} />;
      case GAME_STATES.BATTLE:
        const randomRow = getRandomRow();
        const currentScramble = randomRow ? randomRow.scr : 'Unknown scramble';
        return (
          <BattleScreen 
            playerName={playerName}
            playerHP={playerHP}
            enemyHP={enemyHP}
            comboCount={comboCount}
            tymonCount={tymonCount}
            logEntries={logEntries}
            onSubmitTime={processTurn} 
            onUseTymon={handleUseTymon}
            playerImpact={playerImpact}
            enemyImpact={enemyImpact}
            floatingDamages={floatingDamages}
            comboFlashValue={comboFlashValue}
            currentScramble={currentScramble} // Pass currentScramble to BattleScreen
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
          <li>You enter your solving time (in seconds), and the enemy's time is simulated (from a normal distribution with mean = 11.62 and std = 1.10).</li>
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
