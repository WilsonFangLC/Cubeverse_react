import React from 'react';

// Simple display for player/enemy info
function CombatantDisplay({ name, hp, maxHP, isPlayer, imgSrc, hasImpact }) {
  const hpPercent = Math.max((hp / maxHP) * 100, 0);
  const barClass = isPlayer ? 'player-bar' : 'enemy-bar';
  const imgClass = `combatant-img ${hasImpact ? 'impact' : ''}`;
  const combatantId = isPlayer ? 'playerCombatant' : 'enemyCombatant';

  return (
    <div className={`combatant`} id={combatantId}>
      <img src={imgSrc} alt={isPlayer ? 'Player' : 'Enemy'} className={imgClass} />
      <p>
        <span className="name-label">{isPlayer ? 'Player:' : 'Enemy:'}</span> {name} - HP: <span className="hp-value">{hp}</span> / {maxHP}
      </p>
      <div className="bar-container">
        <div className={`bar ${barClass}`} style={{ width: `${hpPercent}%` }}></div>
      </div>
    </div>
  );
}

export default CombatantDisplay; 