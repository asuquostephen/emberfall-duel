// render.js — everything the eye sees: cards, hands, Ember bars, banners,
// floating damage numbers, ember particles. DOM + CSS only, no canvas game.
// The stage is a fixed 1280x720 court that scales to fit the window.

import { SUITS, GLYPHS, MAX_EMBER, DIFFICULTIES, GAME_NAME, GAME_SUBTITLE } from './config.js';
import { scoreBreakdown } from './state.js';

export function svgGlyph(suit, size = 24) {
  const path = GLYPHS[suit] || GLYPHS.ember;
  const color = SUITS[suit] ? SUITS[suit].color : (suit === 'lantern' ? '#ffd76a' : '#ff9a5c');
  // stroke inherits to the line-drawn glyphs (gale swirl, lantern frame, ember rays).
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" stroke="${color}" aria-hidden="true">${path}</svg>`;
}

function el(tag, cls, html = '') {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html) node.innerHTML = html;
  return node;
}

// One card face. `mini` renders the compact table version.
export function cardElement(card, { mini = false, faceDown = false } = {}) {
  const suit = SUITS[card.suit];
  const node = el('div', `card ${faceDown ? 'back' : ''} ${mini ? 'mini' : ''}`);
  if (faceDown) {
    node.innerHTML = `<div class="card-back-glyph">${svgGlyph('lantern', 44)}</div><div class="card-back-name">LANTERN COURT</div>`;
    node.setAttribute('aria-label', 'Face-down card');
    return node;
  }
  const color = suit ? suit.color : (card.suit === 'lantern' ? '#ffd76a' : '#ff9a5c');
  const suitName = suit ? suit.name : (card.suit === 'lantern' ? 'Lantern' : 'Ember');
  node.style.setProperty('--suit', color);
  node.dataset.cardId = card.id;
  node.innerHTML = `
    <div class="corner top"><span class="corner-val">${card.value}</span>${svgGlyph(card.suit, 18)}</div>
    <div class="card-center">${svgGlyph(card.suit, 46)}<span class="center-val">${card.value}</span></div>
    <div class="card-name">${card.name}</div>
    <div class="corner bottom"><span class="corner-val">${card.value}</span>${svgGlyph(card.suit, 18)}</div>`;
  node.title = `${card.name} — ${card.text}`;
  node.setAttribute('aria-label', `${card.name}, value ${card.value}`);
  return node;
}

function emberBar(ember, max, who) {
  const pct = Math.max(0, Math.min(100, (ember / max) * 100));
  const low = pct <= 25 ? ' low' : '';
  return `<div class="ember-wrap"><div class="ember-bar${low}" style="width:${pct}%"></div>
    <span class="ember-num">${ember} / ${max} Ember</span></div>`;
}

// ---- Title screen ----
export function renderTitle(root, records, onStart) {
  root.innerHTML = '';
  const screen = el('div', 'screen title-screen');
  screen.innerHTML = `
    <div class="lantern-row" aria-hidden="true">
      <span class="paper-lantern l1"></span><span class="paper-lantern l2"></span>
      <span class="paper-lantern l3"></span><span class="paper-lantern l4"></span>
    </div>
    <h1 class="game-title">${GAME_NAME}</h1>
    <p class="game-subtitle">${GAME_SUBTITLE}</p>
    <p class="game-pitch">A 60-card duel of the four winds. Outplay the keeper across
      <b>7 nights</b> — suit beats suit, combos catch fire, and the last Ember wins.</p>
    <div class="suit-cycle" aria-label="Suit cycle: Flame beats Thorn, Thorn beats Gale, Gale beats Tide, Tide beats Flame">
      <span class="cycle-chip flame">${svgGlyph('flame', 20)} Flame &gt; Thorn</span>
      <span class="cycle-chip thorn">${svgGlyph('thorn', 20)} Thorn &gt; Gale</span>
      <span class="cycle-chip gale">${svgGlyph('gale', 20)} Gale &gt; Tide</span>
      <span class="cycle-chip tide">${svgGlyph('tide', 20)} Tide &gt; Flame</span>
    </div>
    <div class="difficulty-row" role="group" aria-label="Choose your keeper"></div>
    <div class="title-records">
      <span>Duels won <b>${records.wins}</b> · lost <b>${records.losses}</b></span>
      <span>Best streak <b>${records.bestStreak}</b></span>
      <span>Best score <b>${records.bestScore}</b></span>
    </div>
    <details class="howto"><summary>How to play</summary>
      <p>Each night you and the keeper play <b>5 tricks</b>. Play one card each; the
      higher <b>effective value</b> takes the trick and burns the loser's Ember.</p>
      <p>A suit that beats the other gains <b>+3</b>; a beaten suit loses <b>−3</b>.
      Flame &gt; Thorn &gt; Gale &gt; Tide &gt; Flame.</p>
      <p><b>High Lantern</b> (12) beats anything but costs 2 Ember to light.
      <b>Banked Ember</b> (0) heals 4. <b>Flare</b> (11) hits +2 when it wins.
      <b>Wisp</b> (1) steals 3 Ember when it wins.</p>
      <p>Win <b>3 tricks in a row</b> to light a <b>BLAZE</b> — your next trick deals
      double damage. Play the same suit <b>3 times running</b> for <b>KINDLING</b> (+4).
      First to 0 Ember loses; after 7 nights the fuller lantern wins.</p>
      <p>Click a card or press <b>1–5</b> to play it. <b>M</b> mutes, <b>H</b> shows this help.</p>
    </details>`;
  const row = screen.querySelector('.difficulty-row');
  for (const diff of Object.values(DIFFICULTIES)) {
    const btn = el('button', 'diff-btn', `
      <span class="diff-name">${diff.name}</span>
      <span class="diff-keeper">${diff.keeper}</span>
      <span class="diff-blurb">${diff.blurb}</span>`);
    btn.addEventListener('click', () => onStart(diff.id));
    row.appendChild(btn);
  }
  root.appendChild(screen);
}

// ---- Table ----
export function renderTable(root, match, ui) {
  const diff = DIFFICULTIES[match.difficultyId];
  root.innerHTML = '';
  const screen = el('div', 'screen table-screen');
  screen.innerHTML = `
    <div class="court-glow" aria-hidden="true"></div>
    <header class="hud">
      <div class="hud-left"><span class="hud-night">Night ${match.night} / 7</span>
        <span class="hud-trick">Trick ${Math.min(match.trickInNight + 1, 5)} / 5</span></div>
      <div class="hud-mid"><span class="hud-deck">Deck ${match.deck.length}</span>
        <span class="hud-score">Score ${match.score}</span>
        <span class="hud-streak">Streak ${ui.streak}</span></div>
      <div class="hud-right">
        <button class="hud-btn" id="btn-help" title="Help (H)">?</button>
        <button class="hud-btn" id="btn-mute" title="Mute (M)">♪</button>
        <button class="hud-btn" id="btn-quit" title="Leave the duel">✕</button>
      </div>
    </header>
    <section class="ai-area">
      <div class="keeper-info"><span class="keeper-name">${diff.keeper}</span>
        <span class="keeper-diff">${diff.name} keeper</span></div>
      <div class="ember-side ai">${emberBar(match.aiEmber, MAX_EMBER, 'ai')}</div>
      <div class="ai-hand" aria-label="Keeper's hand, face down"></div>
    </section>
    <section class="center">
      <div class="table-slots">
        <div class="slot ai-slot"><span class="slot-label">Keeper</span></div>
        <div class="slot vs">⚔</div>
        <div class="slot you-slot"><span class="slot-label">You</span></div>
      </div>
      <div class="banner" id="banner"></div>
      <div class="log" id="log" aria-live="polite"></div>
    </section>
    <section class="player-area">
      <div class="ember-side you">${emberBar(match.yourEmber, MAX_EMBER, 'you')}</div>
      <div class="combo-pills" id="combo-pills"></div>
      <div class="your-hand" aria-label="Your hand"></div>
      <p class="hint-line">Click a card or press 1–5 to play it · M mute · H help</p>
    </section>
    <div class="fx" id="fx"></div>`;
  root.appendChild(screen);

  // AI hand: face-down fan.
  const aiHand = screen.querySelector('.ai-hand');
  match.aiHand.forEach((c, i) => {
    const back = cardElement(c, { mini: true, faceDown: true });
    back.style.setProperty('--tilt', `${(i - (match.aiHand.length - 1) / 2) * 4}deg`);
    aiHand.appendChild(back);
  });
  // Your hand: playable cards.
  const yourHand = screen.querySelector('.your-hand');
  match.yourHand.forEach((c, i) => {
    const node = cardElement(c);
    node.style.setProperty('--tilt', `${(i - (match.yourHand.length - 1) / 2) * 3}deg`);
    node.addEventListener('click', () => ui.onPlayCard(c.id));
    yourHand.appendChild(node);
  });
  // Combo pills: Blaze armed / Kindling run / tie pending.
  const pills = screen.querySelector('#combo-pills');
  if (match.streaks.you >= 2) pills.appendChild(el('span', 'pill blaze', `🔥 BLAZE in ${3 - match.streaks.you} — win once more`));
  if (match.streaks.ai >= 2) pills.appendChild(el('span', 'pill danger', `Keeper ${match.streaks.ai} from BLAZE`));
  if (match.streaks.youSuitRun.count >= 2) pills.appendChild(el('span', 'pill kindling', `KINDLING ${match.streaks.youSuitRun.count}/3 ${SUITS[match.streaks.youSuitRun.suit].name}`));
  if (match.streaks.tiePending) pills.appendChild(el('span', 'pill tie', 'Dead calm — next winner +2'));
  // Log (last 4 lines).
  const log = screen.querySelector('#log');
  for (const line of match.log.slice(-4)) log.appendChild(el('div', 'log-line', line));
  return screen;
}

// Place the two played cards on the table with a flip-in animation.
export function showPlayedCards(screen, yourCard, aiCard) {
  const youSlot = screen.querySelector('.you-slot');
  const aiSlot = screen.querySelector('.ai-slot');
  youSlot.innerHTML = '';
  aiSlot.innerHTML = '';
  const y = cardElement(yourCard, { mini: true });
  const a = cardElement(aiCard, { mini: true });
  y.classList.add('played-in');
  a.classList.add('played-in');
  youSlot.appendChild(y);
  aiSlot.appendChild(a);
}

export function setBanner(screen, html) {
  const b = screen.querySelector('#banner');
  if (b) b.innerHTML = html;
}

export function floatText(screen, text, kind = 'damage') {
  const fx = screen.querySelector('#fx');
  if (!fx) return;
  const node = el('span', `float-text ${kind}`, text);
  node.style.left = `${42 + Math.random() * 16}%`;
  node.style.top = `${38 + Math.random() * 10}%`;
  fx.appendChild(node);
  setTimeout(() => node.remove(), 1400);
}

export function shakeStage(stage) {
  stage.classList.remove('shake');
  void stage.offsetWidth; // restart the animation
  stage.classList.add('shake');
}

// A burst of rising ember particles across the stage (win flourish).
export function emberBurst(stage, n = 42) {
  const fx = stage.querySelector('#fx') || stage;
  for (let i = 0; i < n; i++) {
    const p = el('span', 'ember-particle');
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${55 + Math.random() * 40}%`;
    p.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
    p.style.animationDelay = `${Math.random() * 0.9}s`;
    p.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    fx.appendChild(p);
    setTimeout(() => p.remove(), 4200);
  }
}

// ---- End screens (win and loss share one overlay) ----
export function renderEnd(root, match, records, streak, onAgain, onTitle) {
  const won = match.winner === 'you';
  const diff = DIFFICULTIES[match.difficultyId];
  const rows = scoreBreakdown(match);
  const overlay = el('div', `end-overlay ${won ? 'win' : 'loss'}`);
  overlay.innerHTML = `
    <div class="end-card">
      <div class="end-glyph">${svgGlyph(won ? 'lantern' : 'ember', 56)}</div>
      <h2 class="end-title">${won ? 'THE COURT IS YOURS' : 'THE LANTERN DIMS'}</h2>
      <p class="end-sub">${won
        ? `You outplayed ${diff.keeper} on ${diff.name} — ${match.yourEmber} Ember still burning.`
        : `${diff.keeper} takes the duel — your lantern gutters out at ${match.yourEmber} Ember.`}</p>
      <table class="tally">
        ${rows.map((r) => `<tr><td>${r.label}</td><td>${r.value}</td><td>+${r.points}</td></tr>`).join('')}
        <tr class="tally-total"><td>Score</td><td></td><td>${match.score}</td></tr>
      </table>
      <p class="end-stats">Nights ${match.nightsWonYou}–${match.nightsWonAi} · Tricks ${match.yourTricksTotal}–${match.aiTricksTotal} ·
        Damage ${match.damageDealt}–${match.damageTaken} · Streak ${streak} · Best ${records.bestStreak}</p>
      <div class="end-buttons">
        <button class="btn-primary" id="btn-again">Rematch — same keeper</button>
        <button class="btn-ghost" id="btn-title">Change keeper</button>
      </div>
    </div>`;
  overlay.querySelector('#btn-again').addEventListener('click', onAgain);
  overlay.querySelector('#btn-title').addEventListener('click', onTitle);
  root.appendChild(overlay);
  return overlay;
}

export function setStatus(text) {
  const s = document.getElementById('status');
  if (s) s.textContent = text;
}
