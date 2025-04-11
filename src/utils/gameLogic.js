import Papa from 'papaparse';

// Function to sample a normally distributed random number using Box–Muller transform.
export function normalRandom(mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * std + mean;
}

// Function to randomly select a scramble and time from the CSV data
export async function getRandomScrambleAndTime() {
  try {
    const response = await fetch('/further_curated_data.csv');
    if (!response.ok) {
      throw new Error('Failed to fetch CSV file');
    }
    const csvText = await response.text();
    const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const rows = parsedData.data;

    console.log('Parsed CSV Data:', rows);

    if (!rows || rows.length === 0) {
      console.error('CSV data is empty or failed to load.');
      return { scramble: 'No scramble available', time: 0 };
    }

    const randomRow = rows[Math.floor(Math.random() * rows.length)];
    const { rest: time, scr: scramble } = randomRow;
    return { scramble: scramble.trim(), time: parseFloat(time) };
  } catch (error) {
    console.error('Error loading CSV data:', error);
    return { scramble: 'No scramble available', time: 0 };
  }
}

// Constants
export const MAX_HP = 50;
export const INITIAL_TYMON_COUNT = 3;
export const DAMAGE_MULTIPLIER = 5;
export const ENEMY_TIME_MEAN = 11.62;
export const ENEMY_TIME_STD = 1.10;