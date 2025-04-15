import React, { useState, useRef, useEffect } from 'react';

function TurnInput({ tymonCount, onSubmitTime, onUseTymon, currentScramble, mode }) {
  const [timeInput, setTimeInput] = useState('');
  const [opponentTime, setOpponentTime] = useState('');
  const inputRef = useRef(null);
  const opponentInputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const playerTime = parseFloat(timeInput);
    if (isNaN(playerTime) || playerTime <= 0) {
      alert("Please enter a valid positive number for your time.");
      return;
    }
    if (mode === 'multi') {
      const oppTime = parseFloat(opponentTime);
      if (isNaN(oppTime) || oppTime <= 0) {
        alert("Please enter a valid positive number for opponent's time.");
        opponentInputRef.current?.focus();
        return;
      }
      onSubmitTime(playerTime, false, oppTime);
    } else {
      onSubmitTime(playerTime);
    }
    setTimeInput('');
    setOpponentTime('');
    inputRef.current?.focus();
  };

  const handleTymon = () => {
    onUseTymon();
    setTimeInput('');
    setOpponentTime('');
    inputRef.current?.focus();
  };

  return (
    <div id="turnInputArea">
      <h2>Your Turn</h2>
      <p>Scramble: <span className="scramble">{currentScramble}</span></p>
      <p>Enter your solving time (in seconds):</p>
      <input 
        type="number" 
        id="timeInput"
        placeholder="e.g., 11" 
        step="0.1" 
        value={timeInput}
        onChange={(e) => setTimeInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        ref={inputRef}
      />
      {mode === 'multi' && (
        <>
          <p>Enter opponent's solving time (in seconds):</p>
          <input
            type="number"
            id="opponentTimeInput"
            placeholder="e.g., 12"
            step="0.1"
            value={opponentTime}
            onChange={e => setOpponentTime(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            ref={opponentInputRef}
          />
        </>
      )}
      <button onClick={handleSubmit}>
        <img src="/attack.png" alt="Attack" style={{ verticalAlign: 'middle', width: '20px', height: '20px' }} /> Submit
      </button>
      {tymonCount > 0 && mode !== 'multi' && (
        <button onClick={handleTymon}>
          <img src="/tymon.png" alt="Tymon" style={{ verticalAlign: 'middle', width: '20px', height: '20px' }} /> Use Tymon ({tymonCount} left)
        </button>
      )}
    </div>
  );
}

export default TurnInput;