// shots.js — deterministic screenshot staging for ?shot=start|play|end|loss.
// Each shot is a legal game state built with the real deck and rules, so the
// screenshots are renders of the game's own code, never mock-ups.

import { MAX_EMBER } from './config.js';
import { drawCards } from './deck.js';
import { computeScore } from './state.js';

// Read ?shot= and ?seed= from the page URL.
export function getShotParams() {
  const q = new URLSearchParams(window.location.search);
  return { shot: q.get('shot'), seed: Number(q.get('seed') || 1) };
}

// Stage a mid-duel table: night 3, two tricks into it, you two tricks from a
// BLAZE, Ember 24–19 in your favour, and a pair of cards on the table.
export function stagePlayMatch(match, seed) {
  const rng = match.rng;
  match.night = 3;
  match.trickInNight = 2;
  match.yourTricksNight = 2;
  match.aiTricksNight = 0;
  match.yourTricksTotal = 9;
  match.aiTricksTotal = 4;
  match.nightsWonYou = 2;
  match.nightsWonAi = 0;
  match.yourEmber = 24;
  match.aiEmber = 19;
  match.damageDealt = 27;
  match.damageTaken = 11;
  match.blazesLit = 1;
  match.streaks.you = 2; // one more win lights a BLAZE
  match.streaks.youSuitRun = { suit: 'flame', count: 2 }; // KINDLING one away
  match.score = computeScore(match);
  // Fresh hands from the same deck, so the cards are real draws.
  match.yourHand = drawCards(match.deck, match.discard, 5, rng);
  match.aiHand = drawCards(match.deck, match.discard, 5, rng);
  match.log = [
    'Night 3 opens — the court holds its breath.',
    'You take the trick: 9 of Flame beats 6 of Thorn — 8 damage.',
    'You take the trick: Flare of Tide beats 4 of Gale — 9 damage. BLAZE armed!',
    'Sable eyes your Flame run — the keeper is counting your suits.',
  ];
  // The pair on the table: your Flame 8 against the keeper's Tide 5.
  const playedYou = match.yourHand.find((c) => c.suit === 'flame' && c.value >= 6)
    || match.yourHand[0];
  const playedAi = match.aiHand.find((c) => c.suit === 'tide')
    || match.aiHand[0];
  match.yourHand = match.yourHand.filter((c) => c !== playedYou);
  match.aiHand = match.aiHand.filter((c) => c !== playedAi);
  match.discard.push(playedYou, playedAi);
  return { playedYou, playedAi };
}

// Stage a finished duel for the end screens. `won` picks the win or loss shot.
export function stageEndMatch(match, won) {
  match.night = 7;
  match.trickInNight = 5;
  match.yourTricksTotal = won ? 22 : 13;
  match.aiTricksTotal = won ? 13 : 22;
  match.nightsWonYou = won ? 5 : 2;
  match.nightsWonAi = won ? 2 : 5;
  match.damageDealt = won ? 61 : 34;
  match.damageTaken = won ? 29 : 58;
  match.blazesLit = won ? 3 : 1;
  match.yourEmber = won ? 17 : 0;
  match.aiEmber = won ? 0 : 21;
  match.winner = won ? 'you' : 'ai';
  match.phase = 'over';
  match.score = computeScore(match);
  match.log = won
    ? ['The seventh night ends — the court is yours.', 'Sable bows. The lanterns burn for you.']
    : ['The seventh night ends — your lantern gutters out.', 'Sable bows. The court keeps its keeper.'];
  return match;
}
