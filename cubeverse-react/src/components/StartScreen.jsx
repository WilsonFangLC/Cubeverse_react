import React, { useState } from 'react';

function StartScreen({ onStartBattle }) {
  const [playerName, setPlayerName] = useState('');

  const handleStartClick = () => {
    // Pass the entered name (or default) back to the App component
    onStartBattle(playerName.trim() || 'Player'); 
  };

  return (
    <>
      <h1>Cubeverse: Simultaneous Cube Challenge</h1>
      <h5>Developed by Lichi</h5>
      {/* Use relative path from public folder for images */}
      <img src="/coverimage.png" alt="Logo" style={{ width: '700px', height: 'auto' }} /> 
      <div id="startForm">
        <p>Enter your name to start:</p>
        <input 
          type="text" 
          id="playerNameInput" // Keep ID for potential CSS targeting if needed
          placeholder="Your name" 
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleStartClick(); }}
        />
        <button onClick={handleStartClick}>Start Battle</button>
      </div>
      {/* The turn log will be part of the BattleScreen */}
    </>
  );
}

export default StartScreen; 