// rules.js — the heart of the duel: suit cycle, trick resolution, combos.
// Pure functions, no DOM: the Node logic harness tests these directly.

import { SUITS, RULES, DECK_SPEC } from './config.js';

// Does suit A beat suit B in the kindling cycle?
export function suitBeats(a, b) {
  if (!SUITS[a] || !SUITS[b]) return false; // Lantern / Ember have no suit edge
  return SUITS[a].beats === b;
}

// Effective value of `card` against `opponent`: base value +/- the suit swing.
export function effectiveValue(card, opponent) {
  if (card.kind === 'lantern' || card.kind === 'ember') return card.value;
  let v = card.value;
  if (suitBeats(card.suit, opponent.suit)) v += RULES.suitAdvantage;
  else if (suitBeats(opponent.suit, card.suit)) v -= RULES.suitAdvantage;
  return Math.max(0, v);
}

// Resolve one trick. `streaks` tracks each side's running wins and suit runs.
// Returns { winner: 'you'|'ai'|'tie', yourEff, aiEff, damage, healYou, healAi,
//   steal, lines: [human-readable lines], blaze, kindling }.
// Damage is dealt to the loser; heals apply to whoever played an Ember card.
export function resolveTrick(yourCard, aiCard, streaks) {
  const yourEff = effectiveValue(yourCard, aiCard);
  const aiEff = effectiveValue(aiCard, yourCard);
  const lines = [];
  let winner = 'tie';
  if (yourEff > aiEff) winner = 'you';
  else if (aiEff > yourEff) winner = 'ai';

  let damage = 0;
  let steal = 0;
  let blaze = false;
  let kindling = false;

  if (winner !== 'tie') {
    const diff = Math.abs(yourEff - aiEff);
    damage = Math.max(RULES.minDamage, diff) + RULES.baseDamage;
    // A tied trick leaves a grudge: the next winner takes +2.
    if (streaks.tiePending) {
      damage += RULES.tieBonus;
      lines.push(`The dead calm breaks — +${RULES.tieBonus} damage.`);
    }
    // BLAZE: three tricks in a row doubles the next trick's damage.
    const winStreak = winner === 'you' ? streaks.you : streaks.ai;
    if (winStreak >= RULES.blazeStreak) {
      damage *= RULES.blazeMultiplier;
      blaze = true;
      lines.push(`BLAZE! Three in a row — damage doubled to ${damage}.`);
    }
    // KINDLING: the winner played the same wind suit three tricks running.
    // (Lantern and Ember are not wind suits and never kindle.)
    const suitRun = winner === 'you' ? streaks.youSuitRun : streaks.aiSuitRun;
    const winCard2 = winner === 'you' ? yourCard : aiCard;
    if (suitRun.suit && SUITS[suitRun.suit] && suitRun.count >= RULES.kindlingStreak - 1 &&
        winCard2.suit === suitRun.suit) {
      damage += RULES.kindlingBonus;
      kindling = true;
      lines.push(`KINDLING! Three ${SUITS[suitRun.suit].name} in a row — +${RULES.kindlingBonus} damage.`);
    }
    const winCard = winner === 'you' ? yourCard : aiCard;
    if (winCard.kind === 'flare') {
      damage += RULES.flareBonus;
      lines.push(`The Flare catches — +${RULES.flareBonus} damage.`);
    }
    if (winCard.kind === 'wisp') {
      steal = RULES.wispSteal;
      lines.push(`The Wisp slips away with ${steal} Ember.`);
    }
  } else {
    lines.push('Dead calm — the trick ties, no damage. The next winner takes +2.');
  }

  // Ember cards heal whoever played them, whatever the trick does.
  let healYou = 0;
  let healAi = 0;
  if (yourCard.kind === 'ember') {
    healYou = DECK_SPEC.emberHeal;
    lines.push(`Your Banked Ember warms you for +${healYou}.`);
  }
  if (aiCard.kind === 'ember') {
    healAi = DECK_SPEC.emberHeal;
    lines.push(`The keeper's Banked Ember warms it for +${healAi}.`);
  }
  // A High Lantern costs its player Ember to light.
  let costYou = 0;
  let costAi = 0;
  if (yourCard.kind === 'lantern') costYou = DECK_SPEC.lanternCost;
  if (aiCard.kind === 'lantern') costAi = DECK_SPEC.lanternCost;

  return {
    winner, yourEff, aiEff, damage, steal, blaze, kindling,
    healYou, healAi, costYou, costAi, lines,
  };
}

// Update the running streaks after a trick. Returns a fresh streaks object.
export function updateStreaks(streaks, winner, yourCard, aiCard) {
  const next = {
    you: winner === 'you' ? streaks.you + 1 : 0,
    ai: winner === 'ai' ? streaks.ai + 1 : 0,
    youSuitRun: streaks.youSuitRun,
    aiSuitRun: streaks.aiSuitRun,
    tiePending: winner === 'tie',
  };
  // Only the four wind suits build a kindling run; a Lantern or Ember breaks it.
  const windSuit = (c) => (c.suit in SUITS ? c.suit : null);
  const youSuit = windSuit(yourCard);
  const aiSuit = windSuit(aiCard);
  if (youSuit && youSuit === streaks.youSuitRun.suit) {
    next.youSuitRun = { suit: youSuit, count: streaks.youSuitRun.count + 1 };
  } else {
    next.youSuitRun = { suit: youSuit, count: youSuit ? 1 : 0 };
  }
  if (aiSuit && aiSuit === streaks.aiSuitRun.suit) {
    next.aiSuitRun = { suit: aiSuit, count: streaks.aiSuitRun.count + 1 };
  } else {
    next.aiSuitRun = { suit: aiSuit, count: aiSuit ? 1 : 0 };
  }
  return next;
}

export function freshStreaks() {
  return {
    you: 0, ai: 0,
    youSuitRun: { suit: null, count: 0 },
    aiSuitRun: { suit: null, count: 0 },
    tiePending: false,
  };
}

// A short, readable reason why a card won or lost its trick, for the log.
export function trickSummary(yourCard, aiCard, result) {
  const edge = (c, o) => suitBeats(c.suit, o.suit) ? ` (+${RULES.suitAdvantage} suit edge)` : '';
  const you = `${yourCard.name} (${result.yourEff}${edge(yourCard, aiCard)})`;
  const ai = `${aiCard.name} (${result.aiEff}${edge(aiCard, yourCard)})`;
  if (result.winner === 'you') return `You take the trick: ${you} beats ${ai} — ${result.damage} damage.`;
  if (result.winner === 'ai') return `The keeper takes the trick: ${ai} beats ${you} — ${result.damage} damage.`;
  return `Tie: ${you} meets ${ai}.`;
}
