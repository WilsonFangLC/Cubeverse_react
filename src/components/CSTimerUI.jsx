import React, { useState, useRef, useEffect } from 'react';

const PHASES = {
  IDLE: 'idle',
  HOLD: 'hold',
  READY: 'ready',
  RUNNING: 'running',
  STOPPED: 'stopped',
};

function CSTimerUI({ onSolve }) {
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [displayTime, setDisplayTime] = useState('0.00');
  const [history, setHistory] = useState([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const holdTimeoutRef = useRef(null);
  const [bgColor, setBgColor] = useState('#f8f8f8');

  // Always show timer (even when not running)
  useEffect(() => {
    if (phase === PHASES.IDLE) setDisplayTime('0.00');
  }, [phase]);

  // Handle key events
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.code !== 'Space') return;
      if (phase === PHASES.IDLE) {
        setPhase(PHASES.HOLD);
        setBgColor('#e57373'); // red
        holdTimeoutRef.current = setTimeout(() => {
          setPhase(PHASES.READY);
          setBgColor('#81c784'); // green
        }, 500);
      } else if (phase === PHASES.RUNNING) {
        // Stop timer
        setPhase(PHASES.STOPPED);
        setBgColor('#f8f8f8');
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
        const final = (performance.now() - startTimeRef.current) / 1000;
        setDisplayTime(final.toFixed(2));
        setHistory(h => [final, ...h]);
        if (onSolve) onSolve(final);
      }
    }
    function handleKeyUp(e) {
      if (e.code !== 'Space') return;
      if (phase === PHASES.HOLD) {
        clearTimeout(holdTimeoutRef.current);
        setPhase(PHASES.IDLE);
        setBgColor('#f8f8f8');
      } else if (phase === PHASES.READY) {
        setPhase(PHASES.RUNNING);
        setBgColor('#f8f8f8');
        startTimeRef.current = performance.now();
        function tick() {
          const elapsed = (performance.now() - startTimeRef.current) / 1000;
          setDisplayTime(elapsed.toFixed(2));
          if (phase === PHASES.RUNNING) timerRef.current = requestAnimationFrame(tick);
        }
        timerRef.current = requestAnimationFrame(tick);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [phase, onSolve]);

  // Reset after stop
  useEffect(() => {
    if (phase === PHASES.STOPPED) {
      const t = setTimeout(() => {
        setPhase(PHASES.IDLE);
        setBgColor('#f8f8f8');
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [phase]);

  let centerText = '';
  if (phase === PHASES.IDLE) centerText = 'READY';
  else if (phase === PHASES.HOLD) centerText = 'HOLD...';
  else if (phase === PHASES.READY) centerText = 'READY...';
  else if (phase === PHASES.RUNNING || phase === PHASES.STOPPED) centerText = displayTime;

  return (
    <div style={{
      minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      background:bgColor,transition:'background 0.3s',
    }}>
      <div style={{fontSize:phase === PHASES.RUNNING || phase === PHASES.STOPPED ? 96 : 64,fontWeight:'bold',color:'#222',letterSpacing:2}}>
        {centerText}
      </div>
      <div style={{marginTop:40}}>
        <b>History:</b>
        <ul style={{fontSize:22,listStyle:'none',padding:0,margin:0}}>
          {history.slice(0,5).map((t,i) => <li key={i}>{t.toFixed(2)}</li>)}
        </ul>
      </div>
      <div style={{marginTop:24,fontSize:16,color:'#888'}}>Space: hold to start, release to go, press again to stop</div>
    </div>
  );
}

export default CSTimerUI;
