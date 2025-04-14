import React, { useState } from 'react';

function TurnInput({ tymonCount, onSubmitTime, onUseTymon, currentScramble }) {
  const [timeInput, setTimeInput] = useState('');

  const handleSubmit = () => {
    const playerTime = parseFloat(timeInput);
    if (isNaN(playerTime) || playerTime <= 0) {
      alert("Please enter a valid positive number for your time.");
      return;
    }
    onSubmitTime(playerTime);
    setTimeInput(''); // Clear input after submission
  };

  const handleTymon = () => {
    onUseTymon();
    setTimeInput(''); // Clear input if Tymon is used
  };

  return (
    <div id="turnInputArea"> {/* Added a wrapper div */}
      <h2>Your Turn</h2>
      <p>Scramble: <span className="scramble">{currentScramble}</span></p>
      <p>Enter your solving time (in seconds):</p>
      <input 
        type="number" 
        id="timeInput" // Keep ID for potential CSS targeting
        placeholder="e.g., 11" 
        step="0.1" 
        value={timeInput}
        onChange={(e) => setTimeInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
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