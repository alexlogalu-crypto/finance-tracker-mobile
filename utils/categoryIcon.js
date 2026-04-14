export function getCategoryEmoji(iconName) {
  const map = {
    'coffee': '☕',
    'utensils': '🍽️',
    'shopping-basket': '🛒',
    'home': '🏠',
    'film': '🎬',
    'shopping-bag': '🛍️',
    'car': '🚗',
    'heartbeat': '❤️',
    'money-bill-wave': '💵',
    'bolt': '⚡',
    'plane': '✈️',
    'graduation-cap': '🎓',
    'dumbbell': '💪',
    'laptop': '💻',
    'chart-line': '📈',
    'coins': '🪙',
    'shield-alt': '🛡️',
    'gift': '🎁',
    'tag': '🏷️',
  };
  return map[iconName] || '💰';
}
