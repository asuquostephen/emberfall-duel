# emberfall-duel

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/asuquostephen/emberfall-duel/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/asuquostephen/emberfall-duel/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**EMBERFALL: a lantern-court card duel on its own engine — 60-card deck,
4 suits in a kindling cycle, 3 AI keepers, 7 nights, blaze combos, wisp and
lantern specials.** A complete, original card game that plays offline in a
desktop browser from static files. No build step, no libraries, no network
requests: open `game/index.html` (or serve the folder with `node serve.ts`)
and play. Built by an AI agent for the make.fun bounty
[best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826)
("Make the best card game"). Every name, suit and line of art is invented
for this game.

## The duel

You are the Ember Warden, duelling a keeper of the Lantern Court across
**7 nights**. Both lanterns hold **30 Ember**. Each night you play **5
tricks**: one card each, the higher effective value takes the trick and
burns the loser's Ember. First to 0 Ember loses; after 7 nights the fuller
lantern wins.

- **The kindling cycle** — Flame beats Thorn, Thorn beats Gale, Gale beats
  Tide, Tide beats Flame. A suit that beats the other gains **+3**; a beaten
  suit loses **−3**. Every suit is told apart by colour *and* shape, so the
  table reads at a glance.
- **Specials change hands** — **High Lantern** (12) beats anything but costs
  2 Ember to light; **Banked Ember** (0) heals 4; **Flare** (11) hits +2 when
  it wins; **Wisp** (1) steals 3 Ember when it wins.
- **Combos catch fire** — win **3 tricks in a row** to light a **BLAZE**
  (next trick deals double damage); play the same suit **3 times running**
  for **KINDLING** (+4). A tied trick leaves a grudge: the next winner
  takes +2.
- **Three keepers, three brains** — **Pip, the Candle Keeper** plays by feel;
  **Sable, the Lantern Keeper** plays greedy and saves the big lanterns;
  **Ember Mother Vey** counts every card you have shown, counters your
  suits, and hunts your Blaze. Their choices are readable — and counterable.
- **A duel that keeps score** — damage, tricks, nights, blazes and Ember
  left all tally into a score; wins, streaks and best scores persist
  between visits, and the win screen breaks the whole tally down.

## Feel

Cards slide, flip and snap onto the table; damage floats up off the
loser's lantern; big hits shake the court; a win ends in a burst of rising
embers. Every sound — flips, thuds, chimes, the victory fanfare — is
synthesised live with Web Audio; there are no audio files. **M** mutes,
**H** opens the help card, **1–5** play a card from your hand.

## Layout

- `main.ts` — the hand-in program (kit starter, unchanged): copies `game/`
  and `screenshots/` to the output and writes `dossier.json`.
- `game/index.html` — the page and all of its styling; everything it loads
  lives under `game/`.
- `game/src/` — one job per file: `config.js` (tuning, suits, deck spec,
  difficulties, scoring), `random.js` (seeded RNG), `deck.js` (the 60-card
  deck, dealing), `rules.js` (suit cycle, trick resolution, combos),
  `ai.js` (the three keepers), `state.js` (match state, nights, score,
  records), `audio.js` (procedural Web Audio, no files), `render.js`
  (cards, hands, Ember bars, banners, particles), `input.js` (keyboard and
  stage fitting), `shots.js` (the deterministic `?shot=start|play|end|loss`
  scenes the screenshots were taken from), `main.js` (screens and the
  trick loop).
- `screenshots/` — real renders of the game in headless Chrome.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

MIT licensed — see `LICENSE`.
