// state.js — the duel's state: deck, hands, Ember, nights, score, records.
// Pure data plus the small transitions; rendering and input live elsewhere.

import {
  MAX_EMBER, HAND_SIZE, TRICKS_PER_NIGHT, MAX_NIGHTS,
  STORAGE_KEY, SCORING, RULES,
} from './config.js';
import { newShuffledDeck, drawCards, sortHand } from './deck.js';
import { freshStreaks } from './rules.js';

export function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { wins: 0, losses: 0, bestStreak: 0, bestScore: 0, duels: 0 };
    const r = JSON.parse(raw);
    return {
      wins: r.wins || 0, losses: r.losses || 0,
      bestStreak: r.bestStreak || 0, bestScore: r.bestScore || 0,
      duels: r.duels || 0,
    };
  } catch (e) {
    return { wins: 0, losses: 0, bestStreak: 0, bestScore: 0, duels: 0 };
  }
}

export function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) { /* hosted pages may block storage; the duel still plays */ }
}

export function newMatch(difficultyId, rng) {
  const deck = newShuffledDeck(rng);
  const discard = [];
  const match = {
    difficultyId,
    rng,
    deck,
    discard,
    yourHand: sortHand(drawCards(deck, discard, HAND_SIZE, rng)),
    aiHand: sortHand(drawCards(deck, discard, HAND_SIZE, rng)),
    yourEmber: MAX_EMBER,
    aiEmber: MAX_EMBER,
    night: 1,
    trickInNight: 0,
    yourTricksNight: 0,
    aiTricksNight: 0,
    yourTricksTotal: 0,
    aiTricksTotal: 0,
    nightsWonYou: 0,
    nightsWonAi: 0,
    damageDealt: 0,
    damageTaken: 0,
    blazesLit: 0,
    streaks: freshStreaks(),
    seenCards: [],       // cards you have played, for the counting keeper
    yourLastCard: null,
    log: [],
    phase: 'play',       // 'play' | 'trick' | 'night' | 'over'
    winner: null,        // 'you' | 'ai' | null
    score: 0,
  };
  return match;
}

// Draw both hands back up to HAND_SIZE at the start of a night.
export function drawUp(match) {
  const needYou = HAND_SIZE - match.yourHand.length;
  const needAi = HAND_SIZE - match.aiHand.length;
  if (needYou > 0) match.yourHand = sortHand([...match.yourHand, ...drawCards(match.deck, match.discard, needYou, match.rng)]);
  if (needAi > 0) match.aiHand = sortHand([...match.aiHand, ...drawCards(match.deck, match.discard, needAi, match.rng)]);
}

// The night is over: tally tricks, heal the night's winner, advance or end.
export function endNight(match) {
  let nightWinner = null;
  if (match.yourTricksNight > match.aiTricksNight) nightWinner = 'you';
  else if (match.aiTricksNight > match.yourTricksNight) nightWinner = 'ai';
  if (nightWinner === 'you') {
    match.nightsWonYou++;
    match.yourEmber = Math.min(MAX_EMBER, match.yourEmber + RULES.nightWinHeal);
  } else if (nightWinner === 'ai') {
    match.nightsWonAi++;
    match.aiEmber = Math.min(MAX_EMBER, match.aiEmber + RULES.nightWinHeal);
  }
  match.yourTricksNight = 0;
  match.aiTricksNight = 0;
  match.trickInNight = 0;
  return nightWinner;
}

// Is the duel over, and who won it? Ember hitting zero ends it at once;
// after the seventh night the fuller lantern wins.
export function checkDuelEnd(match) {
  if (match.yourEmber <= 0 && match.aiEmber <= 0) return match.yourEmber >= match.aiEmber ? 'you' : 'ai';
  if (match.yourEmber <= 0) return 'ai';
  if (match.aiEmber <= 0) return 'you';
  if (match.night > MAX_NIGHTS) return match.yourEmber >= match.aiEmber ? 'you' : 'ai';
  return null;
}

export function computeScore(match) {
  let score = 0;
  score += match.damageDealt * SCORING.perDamageDealt;
  score += match.yourTricksTotal * SCORING.perTrickWon;
  score += match.nightsWonYou * SCORING.perNightWon;
  score += match.blazesLit * SCORING.blazeBonus;
  if (match.winner === 'you') {
    score += SCORING.winBonus;
    score += Math.max(0, match.yourEmber) * SCORING.emberRemainingBonus;
  }
  return score;
}

export function scoreBreakdown(match) {
  return [
    { label: 'Damage dealt', value: match.damageDealt, points: match.damageDealt * SCORING.perDamageDealt },
    { label: 'Tricks won', value: match.yourTricksTotal, points: match.yourTricksTotal * SCORING.perTrickWon },
    { label: 'Nights won', value: match.nightsWonYou, points: match.nightsWonYou * SCORING.perNightWon },
    { label: 'Blazes lit', value: match.blazesLit, points: match.blazesLit * SCORING.blazeBonus },
    { label: 'Duel won', value: match.winner === 'you' ? 1 : 0, points: match.winner === 'you' ? SCORING.winBonus : 0 },
    { label: 'Ember left', value: Math.max(0, match.yourEmber), points: match.winner === 'you' ? Math.max(0, match.yourEmber) * SCORING.emberRemainingBonus : 0 },
  ];
}
