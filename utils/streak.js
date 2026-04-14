import { storage } from './storage';

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function yesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export async function recordTransaction() {
  const today = todayString();
  const yesterday = yesterdayString();

  const last = await storage.getItem('streak_last_date');
  const countStr = await storage.getItem('streak_count');
  const count = parseInt(countStr ?? '0', 10) || 0;

  if (last === today) return;

  let newCount;
  if (!last) {
    newCount = 1;
  } else if (last === yesterday) {
    newCount = count + 1;
  } else {
    newCount = 1;
  }

  await storage.setItem('streak_count', String(newCount));
  await storage.setItem('streak_last_date', today);
}

export async function getStreak() {
  const today = todayString();
  const yesterday = yesterdayString();

  const last = await storage.getItem('streak_last_date');
  const countStr = await storage.getItem('streak_count');
  const count = parseInt(countStr ?? '0', 10) || 0;

  if (last === today || last === yesterday) {
    return count;
  }
  return 0;
}
