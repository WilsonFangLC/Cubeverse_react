import React, { useState, useRef, useEffect } from 'react';

function InfiniteBattleScreen({
  infiniteRound,
  infiniteAI,
  currentScramble,
  playerHP,
  enemyHP,
  MAX_HP,
  activePowerUps,
  processInfiniteTurn,
  infiniteLog,
  showAIRealTime
}) {
  // Input and feedback state
  const [infiniteInput, setInfiniteInput] = useState("");
  const inputRef = useRef();
  const [roundResult, setRoundResult] = useState(null); // 'win' | 'lose' | null

  // Clear input on round/AI change
  useEffect(() => {
    setInfiniteInput("");
    if (inputRef.current) inputRef.current.value = "";
  }, [infiniteRound, enemyHP, infiniteAI]);

  // Animation feedback
  useEffect(() => {
    if (roundResult) {
      const timer = setTimeout(() => setRoundResult(null), 700);
      return () => clearTimeout(timer);
    }
  }, [roundResult]);

  // For showing AI time if power-up is active
  let aiTime = null;
  if (showAIRealTime && infiniteAI) {
    aiTime = infiniteAI.quirk.effect === 'freeze' ? 12.00 : (12 + infiniteRound).toFixed(2);
  }

  return (
    <div>
      <h2>Infinite Multiplayer (AI genned) - Round {infiniteRound}</h2>
      <div style={{background:'#f8f8ff',border:'1px solid #bcd',borderRadius:8,padding:12,marginBottom:16}}>
        <b>How to Play Infinite Mode:</b>
        <ul style={{marginTop:6,marginBottom:6}}>
          <li>Each round, you face a new AI opponent with a unique name, avatar, and a special <b>Quirk</b> that changes the rules for that round.</li>
          <li>Enter your solve time (in seconds) and submit. The AI will also "solve" the scramble.</li>
          <li>The winner is determined by the round's rules and quirks. Damage and HP are shown below.</li>
          <li>Defeat the AI to advance to the next round. Each round gets harder!</li>
          <li>If your HP drops to 0, the run ends. Try to get as far as you can!</li>
          <li><b>Quirks</b> can do things like double damage, reverse win/lose, freeze AI time, and more. Read the quirk description each round!</li>
        </ul>
      </div>
      {infiniteAI && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <img src={infiniteAI.avatar} alt="AI Avatar" style={{ width: 64, height: 64, borderRadius: 8 }} />
          <div>
            <b>{infiniteAI.name}</b>
            <div style={{ fontSize: 14, color: '#888' }}>Quirk: <b>{infiniteAI.quirk.name}</b> - {infiniteAI.quirk.desc}</div>
          </div>
        </div>
      )}
      {activePowerUps.length > 0 && (
        <div style={{margin:'10px 0',padding:'8px 12px',background:'#f6fff6',border:'1px solid #bcd',borderRadius:6}}>
          <b>Active Power-Ups:</b>
          <ul style={{margin:0,paddingLeft:18}}>
            {activePowerUps.map((pu, i) => <li key={pu.name+i}>{pu.name}: {pu.desc}</li>)}
          </ul>
        </div>
      )}
      <div style={{ margin: '10px 0', fontSize: 18 }}>
        <b>Scramble:</b> <span className="scramble">{currentScramble}</span>
      </div>
      <div style={{ margin: '10px 0' }}>
        <b>Your HP:</b> {playerHP} / {MAX_HP} &nbsp; | &nbsp; <b>{infiniteAI?.name} HP:</b> {enemyHP}
      </div>
      {showAIRealTime && aiTime && (
        <div style={{margin:'10px 0',color:'#1a7',fontWeight:'bold'}}>AI’s time this round: {aiTime}</div>
      )}
      {roundResult && (
        <div style={{fontWeight:'bold',fontSize:22,margin:'10px 0',color:roundResult==='win'?'#1a7':'#c0392b',transition:'opacity 0.5s',opacity:1}}>
          {roundResult==='win' ? 'You Win the Round!' : 'You Lose the Round!'}
        </div>
      )}
      <form onSubmit={e => {
        e.preventDefault();
        const val = parseFloat(infiniteInput);
        if (!isNaN(val) && val > 0) {
          // Determine win/lose for animation
          let aiTimeSim = infiniteAI.quirk.effect === 'freeze' ? 12.00 : (12 + infiniteRound);
          let playerWins = val < aiTimeSim;
          if (infiniteAI.quirk.effect === 'reverse') playerWins = !playerWins;
          setRoundResult(playerWins ? 'win' : 'lose');
          processInfiniteTurn(val);
          setInfiniteInput("");
          if (inputRef.current) inputRef.current.value = "";
        }
      }}>
        <input
          id="infiniteTimeInput"
          type="number"
          step="0.01"
          min="0"
          placeholder="Your time (sec)"
          style={{ width: 120, fontSize: 16 }}
          ref={inputRef}
          value={infiniteInput}
          onChange={e => setInfiniteInput(e.target.value)}
        />
        <button
          type="submit"
          style={{ marginLeft: 12, fontWeight: 'bold' }}
          disabled={isNaN(parseFloat(infiniteInput)) || parseFloat(infiniteInput) <= 0}
        >Submit</button>
      </form>
      <div>
        <h3>Log</h3>
        <div style={{ maxHeight: 200, overflowY: 'auto', background: '#fafbfc', border: '1px solid #eee', borderRadius: 8, padding: 10 }}>
          {infiniteLog.map((entry, idx) => (
            <div key={idx} style={{ marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: entry }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default InfiniteBattleScreen;
