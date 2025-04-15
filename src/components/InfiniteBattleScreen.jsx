import React, { useState, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';
Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

function InfiniteBattleScreen({
  infiniteRound,
  infiniteBestRound,
  infiniteAI,
  currentScramble,
  playerHP,
  enemyHP,
  MAX_HP,
  activePowerUps,
  processInfiniteTurn,
  infiniteLog,
  showAIRealTime,
  quirkHistory = [],
  powerupHistory = [],
  nextQuirk,
  scrambleQuality,
  solveTimes = [],
  pbSingle,
  pbMo3,
  pbAo5,
  pbAo12
}) {
  // Input and feedback state
  const [infiniteInput, setInfiniteInput] = useState("");
  const inputRef = useRef();
  const [roundResult, setRoundResult] = useState(null); // 'win' | 'lose' | null

  // Tooltip style
  const tooltipStyle = {
    position: 'absolute',
    background: '#222',
    color: '#fff',
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 13,
    zIndex: 10,
    whiteSpace: 'pre-line',
    pointerEvents: 'none',
    maxWidth: 220,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
  };

  function Tooltip({ text, children }) {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    return (
      <span
        style={{ position: 'relative', cursor: 'help' }}
        onMouseEnter={e => {
          setShow(true);
          const rect = e.currentTarget.getBoundingClientRect();
          setPos({ x: rect.width / 2, y: rect.height });
        }}
        onMouseLeave={() => setShow(false)}
      >
        {children}
        {show && (
          <span style={{ ...tooltipStyle, left: pos.x, top: pos.y + 8 }}>
            {text}
          </span>
        )}
      </span>
    );
  }

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

  // --- Virtual Timer State ---
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerValue, setTimerValue] = useState(0);
  const [timerReady, setTimerReady] = useState(false); // holding space
  const [timerReallyReady, setTimerReallyReady] = useState(false); // held long enough
  const timerStartRef = useRef(null);
  const timerRAF = useRef(null);
  const holdTimeout = useRef(null);
  // Refs for state in event handlers
  const timerRunningRef = useRef(timerRunning);
  const timerReadyRef = useRef(timerReady);
  const timerReallyReadyRef = useRef(timerReallyReady);
  useEffect(() => { timerRunningRef.current = timerRunning; }, [timerRunning]);
  useEffect(() => { timerReadyRef.current = timerReady; }, [timerReady]);
  useEffect(() => { timerReallyReadyRef.current = timerReallyReady; }, [timerReallyReady]);

  // CSTimer-style timer logic (register listeners only once)
  useEffect(() => {
    function updateTimer() {
      if (timerRunningRef.current && timerStartRef.current) {
        const elapsed = (performance.now() - timerStartRef.current) / 1000;
        setTimerValue(elapsed);
        timerRAF.current = requestAnimationFrame(updateTimer);
      }
    }
    function handleKeyDown(e) {
      if (document.activeElement === inputRef.current) return;
      if (!timerRunningRef.current && !timerReadyRef.current && e.code === 'Space') {
        setTimerReady(true);
        holdTimeout.current = setTimeout(() => {
          setTimerReallyReady(true);
        }, 350);
      } else if (timerRunningRef.current && e.type === 'keydown') {
        setTimerRunning(false);
        cancelAnimationFrame(timerRAF.current);
        if (timerStartRef.current) {
          const elapsed = (performance.now() - timerStartRef.current) / 1000;
          setTimerValue(elapsed);
          setInfiniteInput(elapsed.toFixed(2));
          if (inputRef.current) inputRef.current.value = elapsed.toFixed(2);
        }
      }
    }
    function handleKeyUp(e) {
      if (timerReadyRef.current && e.code === 'Space') {
        clearTimeout(holdTimeout.current);
        if (timerReallyReadyRef.current) {
          setTimerRunning(true);
          setTimerValue(0);
          timerStartRef.current = performance.now();
          timerRAF.current = requestAnimationFrame(updateTimer);
        }
        setTimerReady(false);
        setTimerReallyReady(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearTimeout(holdTimeout.current);
      cancelAnimationFrame(timerRAF.current);
    };
  }, []);

  // --- CSTimer-inspired: Large, animated timer display and color feedback ---
  const [recentSolveIdx, setRecentSolveIdx] = useState(null);
  const [pbFlash, setPbFlash] = useState(false);

  // Animate timer color and size
  let timerColor = '#222';
  if (timerReallyReady) timerColor = '#27ae60'; // Green for ready
  if (timerRunning) timerColor = '#3498db'; // Blue for running
  if (pbFlash) timerColor = '#27ae60';

  // Animate new solve entry
  useEffect(() => {
    if (solveTimes.length > 0) {
      setRecentSolveIdx(solveTimes.length - 1);
      setTimeout(() => setRecentSolveIdx(null), 900);
    }
  }, [solveTimes.length]);

  // Flash background on PB
  useEffect(() => {
    if (pbSingle && solveTimes[solveTimes.length-1] === pbSingle) {
      setPbFlash(true);
      setTimeout(() => setPbFlash(false), 600);
    }
  }, [pbSingle, solveTimes]);

  // Auto-focus input after each solve
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [solveTimes.length]);

  // Keyboard shortcuts: Enter to submit, Esc to clear
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setInfiniteInput('');
        if (inputRef.current) inputRef.current.value = '';
      }
      if (e.key === 'Enter' && document.activeElement === inputRef.current) {
        const val = parseFloat(infiniteInput);
        if (!isNaN(val) && val > 0) {
          let aiTimeSim = infiniteAI.quirk.effect === 'freeze' ? 12.00 : (12 + infiniteRound);
          let playerWins = val < aiTimeSim;
          if (infiniteAI.quirk.effect === 'reverse') playerWins = !playerWins;
          setRoundResult(playerWins ? 'win' : 'lose');
          processInfiniteTurn(val);
          setInfiniteInput("");
          if (inputRef.current) inputRef.current.value = "";
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [infiniteInput, infiniteAI, infiniteRound]);

  // --- Chart Data ---
  const chartData = {
    labels: solveTimes.map((_, i) => i + 1),
    datasets: [
      {
        label: 'Solve Time (s)',
        data: solveTimes,
        fill: false,
        borderColor: '#3498db',
        backgroundColor: '#3498db',
        tension: 0.2,
        pointRadius: 3,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { title: { display: true, text: 'Solve #' } },
      y: { title: { display: true, text: 'Time (s)' }, min: 0 }
    }
  };

  // --- Helper for highlighting PBs ---
  function highlight(val, pb) {
    return val && pb && val === pb ? { color: '#e67e22', fontWeight: 'bold' } : {};
  }

  // Helper functions for mo3, ao5, ao12
  function mean(arr) {
    if (!arr || arr.length === 0) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  function ao(arr, n) {
    if (!arr || arr.length < n) return null;
    const lastN = arr.slice(-n);
    if (n >= 5) {
      const sorted = [...lastN].sort((a, b) => a - b);
      sorted.shift();
      sorted.pop();
      return mean(sorted);
    }
    return mean(lastN);
  }

  // --- Scoring Rules Box ---
  const scoringRules = [
    'New PB (single, mo3, ao5, ao12): +3 damage',
    'Consistency (±0.2s of previous): +3 damage',
    'Combo: +1 damage per consecutive win',
    'Power-ups and quirks can further modify damage',
    'Bosses have special effects!'
  ];

  // --- Session Stats Panel ---
  const sessionStats = {
    count: solveTimes.length,
    mean: mean(solveTimes),
    stddev: solveTimes.length > 1 ? Math.sqrt(mean(solveTimes.map(t => (t - mean(solveTimes))**2))) : 0,
    best: solveTimes.length ? Math.min(...solveTimes) : null,
    worst: solveTimes.length ? Math.max(...solveTimes) : null
  };

  return (
    <div style={{display:'flex',alignItems:'flex-start',gap:32}}>
      <div style={{flex:1}}>
        <h2>Infinite Multiplayer (AI genned) - Round {infiniteRound}</h2>
        {infiniteAI?.isBoss && (
          <div style={{
            background:'linear-gradient(90deg,#ffe082 0%,#ffd54f 50%,#ffe082 100%)',
            color:'#b26a00',
            fontWeight:'bold',
            fontSize:22,
            borderRadius:8,
            padding:'10px 0',
            margin:'10px 0 18px 0',
            boxShadow:'0 2px 12px #ffd54f88',
            textAlign:'center',
            letterSpacing:1
          }}>
            BOSS ROUND!
          </div>
        )}
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
            <img src={infiniteAI.avatar} alt="AI Avatar" style={{ width: 64, height: 64, borderRadius: 8, border: infiniteAI.isBoss ? '3px solid gold' : 'none', boxShadow: infiniteAI.isBoss ? '0 0 18px 2px gold' : 'none' }} />
            <div>
              <b>{infiniteAI.name} {infiniteAI.isBoss && <span style={{color:'#e67e22',fontWeight:'bold',marginLeft:6}} title="Boss">👑 BOSS</span>}</b>
              <div style={{ fontSize: 14, color: '#888' }}>
                Quirk: <Tooltip text={infiniteAI.quirk.desc}><b>{infiniteAI.quirk.name}</b></Tooltip> - {infiniteAI.quirk.desc}
              </div>
              {nextQuirk && (
                <div style={{ fontSize: 13, color: '#1a7', marginTop: 4 }}>
                  <b>Next Round Quirk Preview:</b> <Tooltip text={nextQuirk.desc}><b>{nextQuirk.name}</b></Tooltip> - {nextQuirk.desc}
                </div>
              )}
            </div>
          </div>
        )}
        {activePowerUps.length > 0 && (
          <div style={{margin:'10px 0',padding:'8px 12px',background:'#f6fff6',border:'1px solid #bcd',borderRadius:6}}>
            <b>Active Power-Ups:</b>
            <ul style={{margin:0,paddingLeft:18}}>
              {activePowerUps.map((pu, i) => (
                <li key={pu.name+i}>
                  <Tooltip text={pu.desc}>{pu.name}</Tooltip>: {pu.desc}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div style={{ margin: '10px 0', fontSize: 18 }}>
          <b>Scramble:</b> <span className="scramble">{currentScramble}</span>
          <span style={{marginLeft:16,padding:'2px 10px',borderRadius:6,background:scrambleQuality==='Easy'?'#d4efdf':scrambleQuality==='Hard'?'#f9e79f':'#d6eaf8',color:'#333',fontWeight:'bold',fontSize:15}}>
            {scrambleQuality} Scramble
          </span>
        </div>
        <div style={{fontSize:13,margin:'-8px 0 12px 0',color:'#888'}}>
          <b>What does scramble quality mean?</b> Easy: AI is slower, you have an advantage. Hard: AI is faster, round is tougher. Medium: normal.
        </div>
        <div style={{ margin: '10px 0' }}>
          <b>Your HP:</b> {playerHP} / {MAX_HP}
          <div style={{ width: 180, height: 14, background: '#eee', borderRadius: 7, margin: '4px 0 10px 0', overflow: 'hidden' }}>
            <div style={{ width: `${(playerHP / MAX_HP) * 100}%`, height: '100%', background: '#3498db', borderRadius: 7, transition: 'width 0.3s' }} />
          </div>
          <b>{infiniteAI?.name} HP:</b> {enemyHP}
          <div style={{ width: 180, height: 14, background: '#eee', borderRadius: 7, margin: '4px 0 10px 0', overflow: 'hidden' }}>
            <div style={{ width: `${(enemyHP / MAX_HP) * 100}%`, height: '100%', background: '#e74c3c', borderRadius: 7, transition: 'width 0.3s' }} />
          </div>
        </div>
        {showAIRealTime && aiTime && (
          <div style={{margin:'10px 0',color:'#1a7',fontWeight:'bold'}}>AI’s time this round: {aiTime} <span style={{fontSize:13,marginLeft:8}}>(Inspection+ or See AI Time active)</span></div>
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
        {/* Always show timer, style and value depend on state */}
        <div style={{
          position: timerRunning ? 'fixed' : 'relative',
          top: timerRunning ? 40 : undefined,
          left: timerRunning ? 0 : undefined,
          right: timerRunning ? 0 : undefined,
          zIndex: timerRunning ? 2000 : undefined,
          textAlign: 'center',
          fontSize: timerRunning ? 64 : timerReallyReady ? 56 : 48,
          fontWeight: 'bold',
          color: timerColor,
          letterSpacing: 2,
          transition: 'color 0.3s,font-size 0.3s',
          pointerEvents: 'none',
          textShadow: pbFlash ? '0 0 24px #27ae60' : '0 2px 8px #aaa',
          margin: timerRunning ? undefined : '16px 0 8px 0',
          opacity: 1
        }}>
          {timerRunning || timerReallyReady ? timerValue.toFixed(2) : '0.00'}
        </div>
        {timerRunning && (
          <div style={{fontSize:18,color:'#1a7',margin:'10px 0'}}>Timer: {timerValue.toFixed(2)}s (press any key to stop)</div>
        )}
        <div>
          <h3>Log</h3>
          <div style={{ maxHeight: 200, overflowY: 'auto', background: '#fafbfc', border: '1px solid #eee', borderRadius: 8, padding: 10 }}>
            {infiniteLog.map((entry, idx) => (
              <div key={idx} style={{ marginBottom: 10 }} dangerouslySetInnerHTML={{ __html: entry }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{width:260,minWidth:200,background:'#f8fafd',border:'1px solid #bcd',borderRadius:8,padding:'14px 12px',fontSize:15}}>
        <b>Run History</b>
        <div style={{marginTop:10}}>
          <b>Solves:</b>
          <table style={{width:'100%',fontSize:14,marginTop:4,marginBottom:8}}>
            <thead>
              <tr style={{background:'#f4f4f4'}}><th>#</th><th>Time</th></tr>
            </thead>
            <tbody>
              {solveTimes.map((t,i) => (
                <tr key={i} style={{
                  ...highlight(t, pbSingle),
                  background: recentSolveIdx === i ? '#e8f8e8' : undefined,
                  transition:'background 0.6s'
                }}>
                  <td>{i+1}</td>
                  <td>{t.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{fontSize:13,margin:'8px 0'}}>
            <div>PB: <span style={highlight(pbSingle, pbSingle)}>{pbSingle ? pbSingle.toFixed(2) : '-'}</span></div>
            <div>mo3: <span style={highlight(mean(solveTimes.slice(-3)), pbMo3)}>{solveTimes.length>=3 ? mean(solveTimes.slice(-3)).toFixed(2) : '-'}</span> (PB: <span style={highlight(pbMo3, pbMo3)}>{pbMo3 ? pbMo3.toFixed(2) : '-'}</span>)</div>
            <div>ao5: <span style={highlight(ao(solveTimes,5), pbAo5)}>{solveTimes.length>=5 ? ao(solveTimes,5).toFixed(2) : '-'}</span> (PB: <span style={highlight(pbAo5, pbAo5)}>{pbAo5 ? pbAo5.toFixed(2) : '-'}</span>)</div>
            <div>ao12: <span style={highlight(ao(solveTimes,12), pbAo12)}>{solveTimes.length>=12 ? ao(solveTimes,12).toFixed(2) : '-'}</span> (PB: <span style={highlight(pbAo12, pbAo12)}>{pbAo12 ? pbAo12.toFixed(2) : '-'}</span>)</div>
          </div>
          <div style={{margin:'12px 0'}}>
            <Line data={chartData} options={chartOptions} height={120} />
          </div>
        </div>
        <div style={{marginTop:10}}>
          <b>Quirks Faced:</b>
          <ul style={{margin:0,paddingLeft:18}}>
            {quirkHistory.filter(Boolean).length > 0 ? quirkHistory.filter(Boolean).map((q, i) => (
              <li key={q.name+i} title={q.desc}>{q.name}</li>
            )) : <li style={{color:'#888'}}>None yet</li>}
          </ul>
        </div>
        <div style={{marginTop:10}}>
          <b>Power-Ups Chosen:</b>
          <ul style={{margin:0,paddingLeft:18}}>
            {powerupHistory.length > 0 ? powerupHistory.map((p, i) => (
              <li key={p.name+i} title={p.desc}>{p.name}</li>
            )) : <li style={{color:'#888'}}>None yet</li>}
          </ul>
        </div>
        <div style={{marginTop:14,padding:'8px 10px',background:'#f9fbe7',border:'1px solid #e1e7b6',borderRadius:6,fontSize:13}}>
          <b>Scoring Rules:</b>
          <ul style={{margin:0,paddingLeft:18}}>
            {scoringRules.map(rule => <li key={rule}>{rule}</li>)}
          </ul>
        </div>
        <div style={{margin:'10px 0',padding:'8px 10px',background:'#f8f8ff',border:'1px solid #bcd',borderRadius:6,fontSize:13}}>
          <b>Session Stats:</b>
          <div>Count: {sessionStats.count}</div>
          <div>Mean: {sessionStats.mean ? sessionStats.mean.toFixed(2) : '-'}</div>
          <div>Stddev: {sessionStats.stddev ? sessionStats.stddev.toFixed(2) : '-'}</div>
          <div>Best: {sessionStats.best ? sessionStats.best.toFixed(2) : '-'}</div>
          <div>Worst: {sessionStats.worst ? sessionStats.worst.toFixed(2) : '-'}</div>
        </div>
      </div>
    </div>
  );
}

export default InfiniteBattleScreen;
