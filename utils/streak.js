import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const [lastDate, countStr] = await AsyncStorage.multiGet(['streak_last_date', 'streak_count']);
  const last = lastDate[1];
  const count = parseInt(countStr[1] ?? '0', 10) || 0;

  if (last === today) {
    // Already recorded today — nothing to do
    return;
  }

  let newCount;
  if (!last) {
    newCount = 1;
  } else if (last === yesterday) {
    newCount = count + 1;
  } else {
    newCount = 1;
  }

  await AsyncStorage.multiSet([
    ['streak_count', String(newCount)],
    ['streak_last_date', today],
  ]);
}

export async function getStreak() {
  const today = todayString();
  const yesterday = yesterdayString();

  const [lastDate, countStr] = await AsyncStorage.multiGet(['streak_last_date', 'streak_count']);
  const last = lastDate[1];
  const count = parseInt(countStr[1] ?? '0', 10) || 0;

  if (last === today || last === yesterday) {
    return count;
  }
  return 0;
}
