function normalizePhone(phone) {
  return String(phone || '')
    .replace(/\D/g, '')
    .trim();
}

function pickPrize(prizes, randomValue) {
  const eligiblePrizes = prizes.filter((prize) => prize.isActive && prize.remainingStock > 0 && prize.probability > 0);

  if (eligiblePrizes.length === 0) {
    return null;
  }

  const totalProbability = eligiblePrizes.reduce((sum, prize) => sum + prize.probability, 0);
  const divisor = totalProbability > 1 ? 100 : 1;
  let cumulative = 0;

  for (const prize of eligiblePrizes) {
    cumulative += prize.probability / divisor;
    if (randomValue <= cumulative) {
      return prize;
    }
  }

  return null;
}

module.exports = {
  normalizePhone,
  pickPrize,
};
