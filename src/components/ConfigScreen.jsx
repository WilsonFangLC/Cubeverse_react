import React, { useState } from 'react';

function ConfigScreen({ onStart, initialConfig }) {
  const [enemyTimeMean, setEnemyTimeMean] = useState(initialConfig.ENEMY_TIME_MEAN);
  const [enemyTimeStd, setEnemyTimeStd] = useState(initialConfig.ENEMY_TIME_STD);
  const [damageMultiplier, setDamageMultiplier] = useState(initialConfig.DAMAGE_MULTIPLIER);
  const [useRealSolve, setUseRealSolve] = useState(initialConfig.USE_REAL_SOLVE ?? true);
  const [tymonMean, setTymonMean] = useState(initialConfig.TYMON_MEAN ?? 5.0);
  const [tymonStd, setTymonStd] = useState(initialConfig.TYMON_STD ?? 0.5);

  const handleSubmit = (e) => {
    e.preventDefault();
    onStart({
      ENEMY_TIME_MEAN: parseFloat(enemyTimeMean),
      ENEMY_TIME_STD: parseFloat(enemyTimeStd),
      DAMAGE_MULTIPLIER: parseFloat(damageMultiplier),
      USE_REAL_SOLVE: useRealSolve,
      TYMON_MEAN: parseFloat(tymonMean),
      TYMON_STD: parseFloat(tymonStd),
    });
  };

  return (
    <div className="config-screen">
      <h2>Game Configuration</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Enemy Time Source:
          <select value={useRealSolve ? 'real' : 'random'} onChange={e => setUseRealSolve(e.target.value === 'real')}>
            <option value="real">Use Real Solve</option>
            <option value="random">Random Sample</option>
          </select>
        </label>
        <br />
        <label>
          Enemy Time Mean:
          <input
            type="number"
            step="0.01"
            value={enemyTimeMean}
            onChange={e => setEnemyTimeMean(e.target.value)}
            disabled={useRealSolve}
          />
        </label>
        <br />
        <label>
          Enemy Time Std:
          <input
            type="number"
            step="0.01"
            value={enemyTimeStd}
            onChange={e => setEnemyTimeStd(e.target.value)}
            disabled={useRealSolve}
          />
        </label>
        <br />
        <label>
          Damage Multiplier:
          <input
            type="number"
            step="0.1"
            value={damageMultiplier}
            onChange={e => setDamageMultiplier(e.target.value)}
          />
        </label>
        <br />
        <label>
          Tymon Sample Mean:
          <input
            type="number"
            step="0.01"
            value={tymonMean}
            onChange={e => setTymonMean(e.target.value)}
          />
        </label>
        <br />
        <label>
          Tymon Sample Std:
          <input
            type="number"
            step="0.01"
            value={tymonStd}
            onChange={e => setTymonStd(e.target.value)}
          />
        </label>
        <br />
        <button type="submit">Start Battle</button>
      </form>
    </div>
  );
}

export default ConfigScreen;
