// Function to sample a normally distributed random number using Box–Muller transform.
export function normalRandom(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * std + mean;
}

// Constants
export const MAX_HP = 50;
export const INITIAL_TYMON_COUNT = 3;

// Add difficulty-based parameters
export const DIFFICULTY_SETTINGS = {
  Easy: {
    ENEMY_TIME_MEAN: 13.0,
    ENEMY_TIME_STD: 1.5,
    DAMAGE_MULTIPLIER: 4,
  },
  Medium: {
    ENEMY_TIME_MEAN: 11.62,
    ENEMY_TIME_STD: 1.1,
    DAMAGE_MULTIPLIER: 5,
  },
  Hard: {
    ENEMY_TIME_MEAN: 10.0,
    ENEMY_TIME_STD: 0.8,
    DAMAGE_MULTIPLIER: 6,
  },
};