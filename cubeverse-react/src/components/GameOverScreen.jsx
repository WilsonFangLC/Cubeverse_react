import React from 'react';

function GameOverScreen({ message, playerHP, enemyHP, onPlayAgain }) {
  const MAX_HP = 50; // Or get from props/context if it can vary
  const isVictory = message.toLowerCase().includes('victory');
  const outcomeImage = isVictory ? '/victory.png' : '/defeat.png';
  
  return (
    <div id="gameOverScreen"> {/* Added a wrapper div */}
      <h2>{message}</h2>
      <img src={outcomeImage} alt={isVictory ? 'Victory' : 'Defeat'} className="outcome-img" />
      <p>
        Final Stats: Player HP: <span className="result-value">{playerHP}</span> / {MAX_HP}, 
        Enemy HP: <span className="result-value">{enemyHP}</span> / {MAX_HP}
      </p>
      <button onClick={onPlayAgain}>Play Again</button>
    </div>
  );
}

export default GameOverScreen; 