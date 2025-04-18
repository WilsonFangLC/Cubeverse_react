import React, { useState, useRef, useEffect } from 'react';

function StartScreen({ onStartBattle }) {
  const [playerName, setPlayerName] = useState('');
  const [mode, setMode] = useState('single'); // 'single' or 'pvp'
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleStartClick = () => {
    onStartBattle(playerName.trim() || 'Player', mode);
  };

  return (
    <>
      {/* Logo in top-right corner */}
      <img src="/Niu_logo.png" alt="Niu Logo" style={{ position: 'absolute', top: 24, right: 32, width: 80, height: 'auto', zIndex: 10 }} />
      <h1>Cubeverse: Simultaneous Cube Challenge</h1>
      <h5>Developed by Lichi</h5>
      <img src="/coverimage.png" alt="Logo" style={{ width: '700px', height: 'auto' }} /> 
      <div id="startForm">
        <p>Enter your name to start:</p>
        <input 
          type="text" 
          id="playerNameInput"
          placeholder="Your name" 
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleStartClick(); }}
          ref={inputRef}
        />
        <div style={{ margin: '10px 0' }}>
          <label>
            <input
              type="radio"
              name="mode"
              value="single"
              checked={mode === 'single'}
              onChange={() => setMode('single')}
            />
            Single Player
          </label>
          <label style={{ marginLeft: '20px' }}>
            <input
              type="radio"
              name="mode"
              value="pvp"
              checked={mode === 'pvp'}
              onChange={() => setMode('pvp')}
            />
            Player vs Player Mode
          </label>
          <label style={{ marginLeft: '20px' }}>
            <input
              type="radio"
              name="mode"
              value="cooperative"
              checked={mode === 'cooperative'}
              onChange={() => setMode('cooperative')}
            />
            Cooperative Mode
          </label>
          <label style={{ marginLeft: '20px' }}>
            <input
              type="radio"
              name="mode"
              value="infinite"
              checked={mode === 'infinite'}
              onChange={() => setMode('infinite')}
            />
            Infinite Multiplayer (AI genned)
          </label>
        </div>
        <button onClick={handleStartClick}>Start Battle</button>
      </div>
    </>
  );
}

export default StartScreen;