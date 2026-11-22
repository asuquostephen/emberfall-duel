// config.js — tuning, suits, deck spec, difficulties and scoring for EMBERFALL.
// One job: every number the rest of the game agrees on lives here.

export const GAME_NAME = 'EMBERFALL';
export const GAME_SUBTITLE = 'Duel at the Lantern Court';
export const MAX_EMBER = 30;
export const HAND_SIZE = 5;
export const TRICKS_PER_NIGHT = 5;
export const MAX_NIGHTS = 7;
export const DECK_SIZE = 60;

// The four winds of the Lantern Court. Each suit beats one and loses to one:
//   Flame beats Thorn, Thorn beats Gale, Gale beats Tide, Tide beats Flame.
// Suits are told apart by colour AND shape (an SVG glyph), never by text alone.
export const SUITS = {
  flame: { name: 'Flame', color: '#ff5a3c', dark: '#c22e12', glow: 'rgba(255,90,60,.55)', beats: 'thorn', losesTo: 'tide', glyph: 'flame' },
  tide: { name: 'Tide', color: '#3fa9ff', dark: '#1466b8', glow: 'rgba(63,169,255,.55)', beats: 'flame', losesTo: 'gale', glyph: 'tide' },
  thorn: { name: 'Thorn', color: '#58c96b', dark: '#1f7a33', glow: 'rgba(88,201,107,.55)', beats: 'gale', losesTo: 'flame', glyph: 'thorn' },
  gale: { name: 'Gale', color: '#e8d24a', dark: '#a8891a', glow: 'rgba(232,210,74,.55)', beats: 'tide', losesTo: 'thorn', glyph: 'gale' },
};

// SVG glyph paths (viewBox 0 0 24 24), one unmistakable shape per suit.
export const GLYPHS = {
  flame: '<path d="M12 2c1 3-4 5-4 9a5 5 0 0 0 10 0c0-2-1-3.5-2-5-.5 1.5-1.5 2-2.5 2C14.5 6 13.5 4 12 2z"/>',
  tide: '<path d="M12 2c3.5 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.5-6.5 6-11z"/>',
  thorn: '<path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16z"/><path d="M4 20C8 14 12 10 18 6" stroke="#fff" stroke-width="1.4" fill="none"/>',
  lantern: '<path d="M9 2h6M10 2v3h4V2M7 5h10l-1 14H8L7 5zM12 9v6M9.5 12h5" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  ember: '<circle cx="12" cy="12" r="5"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke-width="1.8" stroke-linecap="round"/>',
};

// Deck composition: 4 suits x 11 (values 2-10, a Flare 11, a Wisp 1)
// + 8 Lanterns (value 12, wild, costs 2 Ember to play)
// + 8 Embers (value 0, heals 4 Ember when played). Total 60.
export const DECK_SPEC = {
  suits: ['flame', 'tide', 'thorn', 'gale'],
  numberValues: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  flareValue: 11,
  wispValue: 1,
  lanternCount: 8,
  lanternValue: 12,
  lanternCost: 2,
  emberCount: 8,
  emberHeal: 4,
};

// Trick and combo tuning.
export const RULES = {
  suitAdvantage: 3,      // effective value swing for a suit that beats the other
  baseDamage: 2,         // damage on top of the effective-value difference
  minDamage: 1,          // a won trick always hurts at least this much
  flareBonus: 2,         // extra damage when a Flare wins its trick
  wispSteal: 3,          // Ember a winning Wisp steals from the loser
  blazeStreak: 3,        // tricks in a row to light BLAZE: next trick damage x2
  blazeMultiplier: 2,
  kindlingStreak: 3,     // same suit played 3 tricks running: +damage
  kindlingBonus: 4,
  tieBonus: 2,           // next trick's winner takes +2 after a tied trick
  nightWinHeal: 3,       // Ember the night's winner recovers
};

// The three AI keepers. Each one is a different brain, not just a stat bump.
export const DIFFICULTIES = {
  candle: {
    id: 'candle', name: 'Candle', keeper: 'Pip, the Candle Keeper',
    blurb: 'A nervous young keeper. Plays by feel, sometimes by luck.',
    ai: 'random', emberPlayAt: 8, lanternSaveUntil: 99,
  },
  lantern: {
    id: 'lantern', name: 'Lantern', keeper: 'Sable, the Lantern Keeper',
    blurb: 'Reads the table. Saves the big lanterns for when it matters.',
    ai: 'greedy', emberPlayAt: 12, lanternSaveUntil: 4,
  },
  bonfire: {
    id: 'bonfire', name: 'Bonfire', keeper: 'Ember Mother Vey',
    blurb: 'Counts every card you have played. Counters your suits. No mercy.',
    ai: 'counting', emberPlayAt: 10, lanternSaveUntil: 5,
  },
};

// Scoring: the tally the win screen breaks down.
export const SCORING = {
  perDamageDealt: 1,
  perTrickWon: 10,
  perNightWon: 50,
  emberRemainingBonus: 5,   // per Ember left when you win the duel
  blazeBonus: 15,           // per Blaze lit
  winBonus: 100,
};

export const STORAGE_KEY = 'emberfall.records.v1';
