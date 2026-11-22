// ai.js — the three keepers. Each difficulty is a different brain:
//   candle  — plays by feel (mostly random, sometimes its best card).
//   lantern — greedy: wins tricks cheaply, saves Lanterns, heals when hurt.
//   bonfire — counts: tracks the cards you have played, counters your suits,
//             holds Lanterns for the late nights, hunts your Blaze.
// All three pick from the same hand the player sees shrinking — their choices
// can be read and countered, which is the whole game.

import { DIFFICULTIES, RULES, DECK_SPEC } from './config.js';
import { effectiveValue, suitBeats } from './rules.js';
import { pick } from './random.js';

function lowestCard(hand) {
  return hand.reduce((a, b) => (a.value < b.value ? a : b));
}
function highestCard(hand) {
  return hand.reduce((a, b) => (a.value > b.value ? a : b));
}
function byKind(hand, kind) {
  return hand.filter((c) => c.kind === kind);
}

// The cheapest card that would beat `targetEff` against a card of `targetSuit`.
function cheapestWinner(hand, targetCard) {
  const winners = hand
    .filter((c) => c.kind !== 'ember')
    .filter((c) => effectiveValue(c, targetCard) > effectiveValue(targetCard, c));
  if (winners.length === 0) return null;
  return winners.reduce((a, b) => (a.value < b.value ? a : b));
}

function chooseRandom(hand, rng, ctx) {
  // Candle: 1 in 4 it plays its best card, otherwise anything goes.
  if (rng() < 0.25) return highestCard(hand);
  return hand[pick(rng, hand.length)];
}

function chooseGreedy(hand, rng, ctx) {
  const { ember, night, trickInNight, yourLastCard, streaks } = ctx;
  const diff = DIFFICULTIES.lantern;
  // Hurt? Bank an Ember.
  const embers = byKind(hand, 'ember');
  if (embers.length > 0 && ember <= diff.emberPlayAt) return embers[0];
  // Behind on Ember and the night is late? Light a Lantern.
  const lanterns = byKind(hand, 'lantern');
  if (lanterns.length > 0 && night >= diff.lanternSaveUntil && ember < 20) return lanterns[0];
  // Counter the suit you just played, cheaply, if you can.
  if (yourLastCard && yourLastCard.kind !== 'ember') {
    const counter = hand
      .filter((c) => c.kind !== 'ember' && c.kind !== 'lantern')
      .filter((c) => suitBeats(c.suit, yourLastCard.suit))
      .sort((a, b) => a.value - b.value)[0];
    if (counter && rng() < 0.7) return counter;
  }
  // Losing the night? Spend a mid card to stop the rot.
  if (streaks.you >= 2 && rng() < 0.6) {
    const sorted = [...hand].filter((c) => c.kind !== 'ember').sort((a, b) => b.value - a.value);
    return sorted[Math.min(1, sorted.length - 1)] || sorted[0];
  }
  // Otherwise play a low card and save the fire.
  const low = hand.filter((c) => c.kind !== 'ember' && c.kind !== 'lantern')
    .sort((a, b) => a.value - b.value);
  return low[0] || hand[0];
}

function chooseCounting(hand, rng, ctx) {
  const { ember, night, trickInNight, yourLastCard, streaks, seenCards, yourHandSize } = ctx;
  const diff = DIFFICULTIES.bonfire;
  const embers = byKind(hand, 'ember');
  if (embers.length > 0 && ember <= diff.emberPlayAt) return embers[0];
  const lanterns = byKind(hand, 'lantern');
  // Hold Lanterns until the late nights, then spend them to close the duel.
  if (lanterns.length > 0 && night >= diff.lanternSaveUntil) {
    if (ember <= 14 || trickInNight >= 4 || streaks.you >= 2) return lanterns[0];
  }
  // You are one trick from BLAZE — throw your best card at it.
  if (streaks.you >= 2) {
    const best = highestCard(hand.filter((c) => c.kind !== 'ember'));
    if (best) return best;
  }
  // Counter your last suit with the cheapest card that beats it.
  if (yourLastCard && yourLastCard.kind !== 'ember' && yourLastCard.kind !== 'lantern') {
    const counter = hand
      .filter((c) => c.kind !== 'ember' && c.kind !== 'lantern')
      .filter((c) => suitBeats(c.suit, yourLastCard.suit))
      .sort((a, b) => a.value - b.value)[0];
    if (counter) return counter;
  }
  // Estimate your best remaining card from what you have shown, and beat it
  // cheaply if you can; otherwise duck with the lowest card.
  if (seenCards && seenCards.length > 0) {
    const yourBestSeen = Math.max(...seenCards.map((c) => c.value));
    const cheap = hand
      .filter((c) => c.kind !== 'ember')
      .filter((c) => c.value >= yourBestSeen)
      .sort((a, b) => a.value - b.value)[0];
    if (cheap && rng() < 0.8) return cheap;
  }
  const low = hand.filter((c) => c.kind !== 'ember' && c.kind !== 'lantern')
    .sort((a, b) => a.value - b.value);
  return low[0] || hand[0];
}

// Pick the AI's card for this trick. `ctx` carries everything the brain
// is allowed to know: its Ember, the night and trick, your last played card,
// both streaks, and the cards you have already shown this duel.
export function chooseCard(difficultyId, hand, rng, ctx) {
  if (hand.length === 0) return null;
  if (hand.length === 1) return hand[0];
  const diff = DIFFICULTIES[difficultyId] || DIFFICULTIES.lantern;
  if (diff.ai === 'random') return chooseRandom(hand, rng, ctx);
  if (diff.ai === 'greedy') return chooseGreedy(hand, rng, ctx);
  return chooseCounting(hand, rng, ctx);
}

// A one-line tell the table can show after the keeper plays, so its choices
// stay readable: why it played what it played.
export function explainPick(card, difficultyId, ctx) {
  if (card.kind === 'ember') return 'The keeper banks an Ember and steadies itself.';
  if (card.kind === 'lantern') return 'The keeper lights a High Lantern — the whole court flinches.';
  if (ctx.yourLastCard && suitBeats(card.suit, ctx.yourLastCard.suit)) {
    return `The keeper answers your ${ctx.yourLastCard.suit} with ${card.suit} — a counter.`;
  }
  if (ctx.streaks && ctx.streaks.you >= 2) return 'The keeper throws its best at your Blaze.';
  return 'The keeper plays it cool.';
}
