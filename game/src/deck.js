// deck.js — builds the 60-card Lantern Court deck, shuffles it, deals hands.
// A card: { id, suit, kind, value, name, text }. Suits: flame/tide/thorn/gale.
// Kinds: 'number' | 'flare' | 'wisp' | 'lantern' | 'ember'.

import { DECK_SPEC, SUITS } from './config.js';
import { shuffleInPlace } from './random.js';

let nextId = 1;

export function makeCard(suit, kind, value, name, text) {
  return { id: nextId++, suit, kind, value, name, text };
}

export function buildDeck() {
  const cards = [];
  for (const suit of DECK_SPEC.suits) {
    const s = SUITS[suit];
    for (const v of DECK_SPEC.numberValues) {
      cards.push(makeCard(suit, 'number', v, `${v} of ${s.name}`, `A ${s.name} card worth ${v}.`));
    }
    cards.push(makeCard(suit, 'flare', DECK_SPEC.flareValue, `Flare of ${s.name}`,
      `Worth ${DECK_SPEC.flareValue}. +2 damage if it wins the trick.`));
    cards.push(makeCard(suit, 'wisp', DECK_SPEC.wispValue, `Wisp of ${s.name}`,
      `Worth ${DECK_SPEC.wispValue}. Steals 3 Ember if it wins the trick.`));
  }
  for (let i = 0; i < DECK_SPEC.lanternCount; i++) {
    cards.push(makeCard('lantern', 'lantern', DECK_SPEC.lanternValue, 'High Lantern',
      `Worth ${DECK_SPEC.lanternValue}, beats any suit — but costs ${DECK_SPEC.lanternCost} Ember to light.`));
  }
  for (let i = 0; i < DECK_SPEC.emberCount; i++) {
    cards.push(makeCard('ember', 'ember', 0, 'Banked Ember',
      `Worth 0. Heals ${DECK_SPEC.emberHeal} Ember when played, win or lose.`));
  }
  return cards;
}

export function newShuffledDeck(rng) {
  return shuffleInPlace(rng, buildDeck());
}

// Draw n cards, reshuffling the discard pile into the deck when it runs dry.
export function drawCards(deck, discard, n, rng) {
  const drawn = [];
  for (let i = 0; i < n; i++) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck.push(...shuffleInPlace(rng, discard.splice(0)));
    }
    drawn.push(deck.pop());
  }
  return drawn;
}

export function sortHand(hand) {
  const suitOrder = { flame: 0, tide: 1, thorn: 2, gale: 3, lantern: 4, ember: 5 };
  return [...hand].sort((a, b) =>
    (suitOrder[a.suit] - suitOrder[b.suit]) || (b.value - a.value));
}

export function countBySuit(cards) {
  const counts = {};
  for (const c of cards) counts[c.suit] = (counts[c.suit] || 0) + 1;
  return counts;
}
