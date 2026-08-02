function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('0033') && digits.length === 13) return `0${digits.slice(4)}`;
  if (digits.startsWith('33') && digits.length === 11) return `0${digits.slice(2)}`;
  return digits;
}

function pickPrize(prizes, randomValue) {
  const eligiblePrizes = prizes.filter((prize) => (
    prize.isActive
    && prize.remainingStock > 0
    && prize.probability > 0
  ));

  if (eligiblePrizes.length === 0) return null;

  const totalProbability = eligiblePrizes.reduce((sum, prize) => sum + prize.probability, 0);
  if (totalProbability > 1.000001) {
    throw new Error('La probabilité totale des lots actifs dépasse 100 %.');
  }

  let cumulative = 0;
  for (const prize of eligiblePrizes) {
    cumulative += prize.probability;
    if (randomValue <= cumulative) return prize;
  }

  return null;
}

module.exports = { normalizePhone, pickPrize };
