import React, { useRef, useEffect, useState } from 'react';
import CombatantDisplay from './CombatantDisplay';
import TurnInput from './TurnInput';
import GameLog from './GameLog';

// Component to render floating damage numbers
const FloatingDamage = ({ damageInfo, parentRef }) => {
  const { id, target, amount, isCombo } = damageInfo;
  const damageClass = isCombo ? 'floating-damage combo-damage' : 'floating-damage';
  
  // Calculate position relative to the target combatant
  // Note: This relies on IDs passed down to CombatantDisplay. 
  // A ref-based approach might be cleaner but more complex.
  const targetElement = document.getElementById(target === 'player' ? 'playerCombatant' : 'enemyCombatant');
  const containerRect = parentRef.current?.getBoundingClientRect();
  const targetRect = targetElement?.getBoundingClientRect();

  if (!targetRect || !containerRect) return null; // Don't render if elements aren't found

  const style = {
    left: `${(targetRect.left + targetRect.width / 2) - containerRect.left}px`,
    top: `${targetRect.top - containerRect.top}px`,
    // Ensure transform origin is correct for potential scaling animations
    transformOrigin: 'bottom center' 
  };

  return (
    <span key={id} className={damageClass} style={style}>
      -{amount}
    </span>
  );
};

// The main component for the battle phase
function BattleScreen({ 
  playerName, 
  playerHP, 
  enemyHP, 
  comboCount,
  tymonCount, 
  logEntries,
  onSubmitTime, 
  onUseTymon, 
  currentScramble, // Added currentScramble prop
  // Effect props
  playerImpact, 
  enemyImpact,
  floatingDamages,
  comboFlashValue,
  config, // <-- add config prop
  mode, // Add mode prop
  processMultiplayerTurn, // Add processMultiplayerTurn prop
  processTurn, // Add processTurn prop
  handleUseTymon // Add handleUseTymon prop
}) {
  const MAX_HP = 50;
  const battlefieldRef = useRef(null); // Ref for positioning effects
  const vsRef = useRef(null); // Ref for the VS element
  const [comboFlashStyle, setComboFlashStyle] = useState({}); // State for dynamic style

  // Add console log here to check the prop value on render
  console.log("[BattleScreen] Rendering with comboCount:", comboCount); 
  console.log("[BattleScreen] Rendering with comboFlashValue:", comboFlashValue);

  // Calculate combo flash position when needed
  useEffect(() => {
    console.log("[BattleScreen Effect] comboFlashValue changed to:", comboFlashValue);
    if (comboFlashValue > 1 && vsRef.current && battlefieldRef.current) {
      const vsRect = vsRef.current.getBoundingClientRect();
      const containerRect = battlefieldRef.current.getBoundingClientRect();
      setComboFlashStyle({
        left: `${(vsRect.left + vsRect.width / 2) - containerRect.left}px`,
        top: `${vsRect.top - containerRect.top - 40}px`, // Position above VS
        opacity: 1, // Make visible
      });
    } else {
      setComboFlashStyle({ opacity: 0 }); // Hide otherwise
    }
  }, [comboFlashValue]); // Re-calculate when comboFlashValue changes

  return (
    <>
      <div id="battlefieldContainer" className="battlefield-container" ref={battlefieldRef}>
        {/* Render Floating Damages */}
        {floatingDamages.map(dmg => (
          <FloatingDamage key={dmg.id} damageInfo={dmg} parentRef={battlefieldRef} />
        ))}

         {/* Render Combo Flash: add 'active' class conditionally */}
         <div 
           className={`combo-flash ${comboFlashValue > 1 ? 'active' : ''}`} 
           style={comboFlashStyle}
         >
            COMBO x{comboFlashValue || ''}!
         </div>

        <div className="battlefield">
          <CombatantDisplay 
            name={playerName}
            hp={playerHP}
            maxHP={MAX_HP}
            isPlayer={true}
            imgSrc="/yza.png"
            hasImpact={playerImpact} // Pass impact state
          />
          <div className="vs" ref={vsRef}>
            VS
            {comboCount > 1 && (
                <div className="combo-counter">x{comboCount}</div>
            )}
          </div>
          <CombatantDisplay 
            name="Lichi Fang"
            hp={enemyHP}
            maxHP={MAX_HP}
            isPlayer={false}
            imgSrc="/flc.png"
            hasImpact={enemyImpact} // Pass impact state
          />
        </div>
      </div>

      <TurnInput 
        tymonCount={tymonCount}
        onSubmitTime={mode === 'multi' ? processMultiplayerTurn : processTurn}
        onUseTymon={handleUseTymon}
        currentScramble={currentScramble} // Pass currentScramble to TurnInput
        mode={mode} // Pass mode to TurnInput
      />

      <GameLog logEntries={logEntries} />
    </>
  );
}

export default BattleScreen;