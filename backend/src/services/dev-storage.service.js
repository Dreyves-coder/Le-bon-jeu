const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { pickPrize, normalizePhone } = require('../utils/draw');

const dataDirectory = path.resolve(__dirname, '../../data');
const dataFile = process.env.DEV_DATA_FILE
  ? path.resolve(process.env.DEV_DATA_FILE)
  : path.join(dataDirectory, 'dev-store.json');

const defaultState = {
  settings: {
    id: 'default',
    gameName: 'La Roue des Cadeaux',
    welcomeMessage: 'Tentez votre chance',
    loseMessage: 'Dommage, ce sera pour une prochaine fois.',
    participationPeriod: 'daily',
    isGameActive: false,
    returnDelaySeconds: 5,
  },
  prizes: [
    {
      id: 'dev-wine',
      name: 'Une bouteille de vin',
      description: 'Une bouteille sélectionnée par le restaurant',
      probability: 0.08,
      initialStock: 10,
      remainingStock: 10,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'dev-dessert',
      name: 'Dessert offert',
      description: 'Un dessert au choix',
      probability: 0.14,
      initialStock: 15,
      remainingStock: 15,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'dev-discount',
      name: '-20 % sur votre prochaine visite',
      description: 'Réduction valable sur une prochaine visite',
      probability: 0.18,
      initialStock: 25,
      remainingStock: 25,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'dev-coffee',
      name: 'Café offert',
      description: 'Un café maison offert',
      probability: 0.22,
      initialStock: 30,
      remainingStock: 30,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],
  participants: [],
  draws: [],
};

function loadState() {
  try {
    if (fs.existsSync(dataFile)) {
      const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      return {
        ...structuredClone(defaultState),
        ...saved,
        settings: { ...defaultState.settings, ...saved.settings },
      };
    }
  } catch (error) {
    console.warn('[dev] Le stockage local était illisible et a été réinitialisé.', error.message);
  }
  return structuredClone(defaultState);
}

let state = loadState();

function saveState() {
  fs.mkdirSync(dataDirectory, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2), 'utf8');
}

function isDevelopmentFallbackEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.DEV_FILE_STORAGE === 'true';
}

function isSameLocalDay(first, second) {
  const date = new Date(first);
  return date.getFullYear() === second.getFullYear()
    && date.getMonth() === second.getMonth()
    && date.getDate() === second.getDate();
}

function canParticipate(phone) {
  const normalizedPhone = normalizePhone(phone);
  const now = new Date();
  return !state.participants.some(
    (participant) => participant.normalizedPhone === normalizedPhone
      && isSameLocalDay(participant.createdAt, now),
  );
}

function draw(participantData) {
  if (!state.settings.isGameActive || !canParticipate(participantData.phone)) return null;

  const now = new Date().toISOString();
  const participant = {
    id: randomUUID(),
    ...participantData,
    normalizedPhone: normalizePhone(participantData.phone),
    createdAt: now,
  };
  const prize = pickPrize(state.prizes, Math.random());
  if (prize) {
    prize.remainingStock -= 1;
    if (prize.remainingStock <= 0) {
      prize.remainingStock = 0;
      prize.isActive = false;
    }
  }

  const savedDraw = {
    id: randomUUID(),
    participantId: participant.id,
    prizeId: prize?.id || null,
    resultType: prize ? 'WIN' : 'LOSS',
    createdAt: now,
  };
  state.participants.unshift(participant);
  state.draws.unshift(savedDraw);
  state.settings.isGameActive = false;
  saveState();

  return {
    participantId: participant.id,
    drawId: savedDraw.id,
    resultType: savedDraw.resultType,
    prize: prize ? { id: prize.id, name: prize.name } : null,
  };
}

function getPrizes() {
  return state.prizes.map((prize) => ({ ...prize }));
}

function createPrize(input) {
  const stock = Math.max(0, Number(input.initialStock ?? input.remainingStock ?? 0));
  const prize = {
    id: randomUUID(),
    name: String(input.name || '').trim(),
    description: String(input.description || '').trim(),
    probability: Math.max(0, Math.min(1, Number(input.probability) || 0)),
    initialStock: stock,
    remainingStock: stock,
    isActive: stock > 0 && input.isActive !== false,
    createdAt: new Date().toISOString(),
  };
  state.prizes.push(prize);
  saveState();
  return { ...prize };
}

function updatePrize(id, input) {
  const prize = state.prizes.find((item) => item.id === id);
  if (!prize) return null;
  if (input.name !== undefined) prize.name = String(input.name).trim();
  if (input.description !== undefined) prize.description = String(input.description).trim();
  if (input.probability !== undefined) prize.probability = Math.max(0, Math.min(1, Number(input.probability) || 0));
  if (input.remainingStock !== undefined) {
    prize.remainingStock = Math.max(0, Number(input.remainingStock) || 0);
    prize.initialStock = Math.max(prize.initialStock, prize.remainingStock);
    if (prize.remainingStock === 0) prize.isActive = false;
  }
  if (input.isActive !== undefined) prize.isActive = prize.remainingStock > 0 && Boolean(input.isActive);
  saveState();
  return { ...prize };
}

function getSettings() {
  return { ...state.settings };
}

function updateSettings(changes) {
  const allowed = ['gameName', 'welcomeMessage', 'loseMessage', 'participationPeriod', 'isGameActive', 'returnDelaySeconds'];
  const safeChanges = Object.fromEntries(Object.entries(changes).filter(([key]) => allowed.includes(key)));
  state.settings = { ...state.settings, ...safeChanges, id: 'default' };
  saveState();
  return getSettings();
}

function enrichedDraw(drawItem) {
  return {
    ...drawItem,
    participant: state.participants.find((item) => item.id === drawItem.participantId) || null,
    prize: state.prizes.find((item) => item.id === drawItem.prizeId) || null,
  };
}

function getParticipants() {
  return state.participants.map((participant) => ({
    ...participant,
    draws: state.draws.filter((item) => item.participantId === participant.id),
  }));
}

function getDraws() {
  return state.draws.map(enrichedDraw);
}

function getDashboard() {
  const winnersCount = state.draws.filter((item) => item.resultType === 'WIN').length;
  const remainingStock = state.prizes.reduce((total, prize) => total + prize.remainingStock, 0);
  const activePrizesCount = state.prizes.filter((prize) => prize.isActive && prize.remainingStock > 0).length;
  const lowStockPrizes = state.prizes.filter((prize) => {
    const threshold = Math.max(2, Math.ceil(prize.initialStock * 0.2));
    return prize.isActive && prize.remainingStock > 0 && prize.remainingStock <= threshold;
  }).map((prize) => ({
    id: prize.id,
    name: prize.name,
    remainingStock: prize.remainingStock,
    threshold: Math.max(2, Math.ceil(prize.initialStock * 0.2)),
  }));
  const outOfStockPrizes = state.prizes.filter((prize) => prize.remainingStock === 0).map((prize) => ({
    id: prize.id,
    name: prize.name,
  }));
  return {
    participantsCount: state.participants.length,
    drawsCount: state.draws.length,
    winnersCount,
    remainingStock,
    activePrizesCount,
    lowStockPrizes,
    outOfStockPrizes,
    winRate: state.draws.length ? Math.round((winnersCount / state.draws.length) * 1000) / 10 : 0,
    recentDraws: getDraws().slice(0, 6),
  };
}

module.exports = {
  isDevelopmentFallbackEnabled,
  canParticipate,
  draw,
  getPrizes,
  createPrize,
  updatePrize,
  getSettings,
  updateSettings,
  getParticipants,
  getDraws,
  getDashboard,
};
