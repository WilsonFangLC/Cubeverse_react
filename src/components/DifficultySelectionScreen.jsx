import React from 'react';

function DifficultySelectionScreen({ onSelectDifficulty }) {
  return (
    <div className="difficulty-selection">
      <h2>Select Difficulty</h2>
      <button onClick={() => onSelectDifficulty('Easy')}>Easy</button>
      <button onClick={() => onSelectDifficulty('Medium')}>Medium</button>
      <button onClick={() => onSelectDifficulty('Hard')}>Hard</button>
    </div>
  );
}

export default DifficultySelectionScreen;