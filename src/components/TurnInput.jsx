import React, { useState, useRef, useEffect } from 'react';

function TurnInput({ tymonCount, onSubmitTime, onUseTymon, currentScramble }) {
  const [timeInput, setTimeInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const playerTime = parseFloat(timeInput);
    if (isNaN(playerTime) || playerTime <= 0) {
      alert("Please enter a valid positive number for your time.");
      return;
    }
    onSubmitTime(playerTime);
    setTimeInput('');
    inputRef.current?.focus();
  };

  const handleTymon = () => {
    onUseTymon();
    setTimeInput('');
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
      <button onClick={handleSubmit}>
        <img src="/attack.png" alt="Attack" style={{ verticalAlign: 'middle', width: '20px', height: '20px' }} /> Submit
      </button>
      {tymonCount > 0 && (
        <button onClick={handleTymon}>
          <img src="/tymon.png" alt="Tymon" style={{ verticalAlign: 'middle', width: '20px', height: '20px' }} /> Use Tymon ({tymonCount} left)
        </button>
      )}
    </div>
  );
}

export default TurnInput;