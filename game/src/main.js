// main.js — the duel's conductor: screens, turns, trick timing, records.
// Wires config + deck + rules + ai + state + audio + render + input together.

import { DIFFICULTIES, MAX_EMBER } from './config.js';
import { makeRng } from './random.js';
import { newMatch, drawUp, endNight, checkDuelEnd, computeScore, loadRecords, saveRecords } from './state.js';
import { resolveTrick as resolveTrickRules, updateStreaks, trickSummary } from './rules.js';
import { chooseCard, explainPick } from './ai.js';
import { createAudio } from './audio.js';
import {
  renderTitle, renderTable, renderEnd, showPlayedCards, setBanner,
  floatText, shakeStage, emberBurst, setStatus,
} from './render.js';
import { bindInput, fitStage } from './input.js';
import { getShotParams, stagePlayMatch, stageEndMatch } from './shots.js';

const stage = document.getElementById('stage');
const root = document.getElementById('root');
const helpOverlay = document.getElementById('help-overlay');
const audio = createAudio();
const records = loadRecords();
let streak = records.streak || 0;

let match = null;
let matchSeq = 0;      // guards async trick steps against quitting mid-trick
let muted = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function ui() {
  return {
    streak,
    onPlayCard: (id) => playCardById(id),
  };
}

function showTable() {
  renderTable(root, match, ui());
  bindHud();
}

function bindHud() {
  const help = document.getElementById('btn-help');
  const mute = document.getElementById('btn-mute');
  const quit = document.getElementById('btn-quit');
  if (help) help.addEventListener('click', () => toggleHelp(true));
  if (mute) mute.addEventListener('click', toggleMute);
  if (quit) quit.addEventListener('click', quitToTitle);
  updateMuteButton();
}

function updateMuteButton() {
  const b = document.getElementById('btn-mute');
  if (b) b.textContent = muted ? '✕' : '♪';
}

function toggleMute() {
  muted = !muted;
  audio.setMuted(muted);
  updateMuteButton();
  if (!muted) audio.click();
}

function toggleHelp(force) {
  const open = force === true ? true : helpOverlay.classList.toggle('open');
  helpOverlay.classList.toggle('open', open);
  if (open) audio.click();
}

function quitToTitle() {
  match = null;
  matchSeq++;
  helpOverlay.classList.remove('open');
  renderTitle(root, records, startMatch);
  setStatus('Title screen. Choose a keeper to begin the duel.');
}

function startMatch(difficultyId) {
  match = newMatch(difficultyId, makeRng());
  matchSeq++;
  audio.ensure();
  audio.deal();
  showTable();
  setBanner(document.querySelector('.table-screen'),
    `Night 1 — you face ${DIFFICULTIES[difficultyId].keeper}. Play a card.`);
  setStatus(`Duel started against ${DIFFICULTIES[difficultyId].keeper}. Your turn — play a card.`);
}

// ---- One trick, played out with its animations and sounds ----
async function playCardById(cardId) {
  if (!match || match.phase !== 'play') return;
  const yourCard = match.yourHand.find((c) => c.id === cardId);
  if (!yourCard) return;
  const seq = matchSeq;
  match.phase = 'trick';
  audio.playCard();

  const aiCard = chooseCard(match.difficultyId, match.aiHand, match.rng, {
    ember: match.aiEmber,
    night: match.night,
    trickInNight: match.trickInNight,
    yourLastCard: match.yourLastCard,
    streaks: match.streaks,
    seenCards: match.seenCards,
    yourHandSize: match.yourHand.length,
  });
  match.yourHand = match.yourHand.filter((c) => c.id !== yourCard.id);
  match.aiHand = match.aiHand.filter((c) => c.id !== aiCard.id);

  showTable();
  const screen = document.querySelector('.table-screen');
  showPlayedCards(screen, yourCard, aiCard);
  setBanner(screen, 'The cards are on the table…');
  setStatus(`You played ${yourCard.name}. The keeper played a card.`);
  await wait(650);
  if (seq !== matchSeq || !match) return;

  const result = resolveTrickRules(yourCard, aiCard, match.streaks);
  match.streaks = updateStreaks(match.streaks, result.winner, yourCard, aiCard);
  match.trickInNight++;
  match.yourLastCard = yourCard;
  match.seenCards.push(yourCard);
  match.discard.push(yourCard, aiCard);

  // Ember changes: lantern costs, damage, steal, heals.
  if (result.costYou) match.yourEmber -= result.costYou;
  if (result.costAi) match.aiEmber -= result.costAi;
  if (result.winner === 'you') {
    match.aiEmber -= result.damage;
    match.damageDealt += result.damage;
    match.yourTricksNight++;
    match.yourTricksTotal++;
    if (result.blaze) match.blazesLit++;
    if (result.steal) { match.aiEmber -= result.steal; match.yourEmber = Math.min(MAX_EMBER, match.yourEmber + result.steal); }
  } else if (result.winner === 'ai') {
    match.yourEmber -= result.damage;
    match.damageTaken += result.damage;
    match.aiTricksNight++;
    match.aiTricksTotal++;
    if (result.steal) { match.yourEmber -= result.steal; match.aiEmber = Math.min(MAX_EMBER, match.aiEmber + result.steal); }
  }
  if (result.healYou) match.yourEmber = Math.min(MAX_EMBER, match.yourEmber + result.healYou);
  if (result.healAi) match.aiEmber = Math.min(MAX_EMBER, match.aiEmber + result.healAi);
  match.score = computeScore(match);

  const lines = [trickSummary(yourCard, aiCard, result), ...result.lines, explainPick(aiCard, match.difficultyId, { yourLastCard: yourCard, streaks: match.streaks })];
  match.log.push(...lines);

  // Sound and feel.
  if (result.winner === 'you') audio.winTrick();
  else if (result.winner === 'ai') audio.loseTrick();
  if (result.damage >= 1) audio.damage();
  if (result.healYou || result.healAi) audio.heal();
  if (result.blaze) audio.blaze();

  showTable();
  const screen2 = document.querySelector('.table-screen');
  showPlayedCards(screen2, yourCard, aiCard);
  setBanner(screen2, lines[0]);
  if (result.damage >= 10) shakeStage(stage);
  if (result.damage > 0) {
    floatText(screen2, `−${result.damage} Ember`, result.winner === 'you' ? 'damage-ai' : 'damage-you');
  }
  if (result.healYou) floatText(screen2, `+${result.healYou} Ember`, 'heal-you');
  if (result.blaze) setBanner(screen2, `🔥 BLAZE! ${lines[0]}`);
  setStatus(lines.join(' '));
  await wait(1150);
  if (seq !== matchSeq || !match) return;

  // End of duel? End of night? Or the next trick?
  const duelWinner = checkDuelEnd(match);
  if (duelWinner) { endMatch(duelWinner); return; }
  if (match.trickInNight >= 5) {
    const nightWinner = endNight(match);
    match.night++;
    if (nightWinner) audio.nightWin();
    const nightLine = nightWinner === 'you'
      ? `Night ${match.night - 1} is yours — +3 Ember, and the court leans your way.`
      : nightWinner === 'ai'
        ? `The keeper takes night ${match.night - 1} — +3 Ember to the keeper.`
        : `Night ${match.night - 1} ends even — no one takes the court.`;
    match.log.push(nightLine);
    drawUp(match);
    const end2 = checkDuelEnd(match);
    if (end2) { endMatch(end2); return; }
    match.phase = 'play';
    showTable();
    setBanner(document.querySelector('.table-screen'), nightLine);
    setStatus(nightLine);
    return;
  }
  match.phase = 'play';
  showTable();
}

function endMatch(winner) {
  match.winner = winner;
  match.phase = 'over';
  match.score = computeScore(match);
  records.duels++;
  if (winner === 'you') {
    records.wins++;
    streak++;
    records.bestStreak = Math.max(records.bestStreak, streak);
    records.bestScore = Math.max(records.bestScore, match.score);
    audio.victory();
  } else {
    records.losses++;
    streak = 0;
    audio.defeat();
  }
  records.streak = streak;
  saveRecords(records);
  renderEnd(root, match, records, streak, () => startMatch(match.difficultyId), quitToTitle);
  if (winner === 'you') emberBurst(stage);
  setStatus(winner === 'you'
    ? `You won the duel. Score ${match.score}.`
    : `You lost the duel. Score ${match.score}.`);
}

// ---- Screenshot staging: ?shot=start|play|end|loss&seed=N ----
function stageShot(shot, seed) {
  if (shot === 'start') {
    renderTitle(root, records, startMatch);
  } else if (shot === 'play') {
    match = newMatch('lantern', makeRng(seed));
    const staged = stagePlayMatch(match, seed);
    renderTable(root, match, ui());
    showPlayedCards(document.querySelector('.table-screen'), staged.playedYou, staged.playedAi);
    setBanner(document.querySelector('.table-screen'), 'Night 3 — two tricks in, and your BLAZE is one win away.');
  } else if (shot === 'end' || shot === 'loss') {
    match = newMatch('lantern', makeRng(seed));
    stageEndMatch(match, shot === 'end');
    renderTable(root, match, ui());
    renderEnd(root, match, records, shot === 'end' ? 3 : 0, () => {}, () => {});
    if (shot === 'end') emberBurst(stage);
  }
  window.__shotReady = true;
}

function boot() {
  fitStage(stage);
  window.addEventListener('resize', () => fitStage(stage));
  bindInput({
    onPlayIndex: (i) => {
      if (match && match.phase === 'play' && match.yourHand[i]) playCardById(match.yourHand[i].id);
    },
    onMute: toggleMute,
    onHelp: () => toggleHelp(),
    onEscape: () => {
      if (helpOverlay.classList.contains('open')) toggleHelp(false);
      else if (match) quitToTitle();
    },
    onEnter: () => {
      const again = document.getElementById('btn-again');
      if (again) again.click();
      else if (!match) startMatch('lantern');
    },
  });
  helpOverlay.addEventListener('click', (e) => {
    if (e.target === helpOverlay) toggleHelp(false);
  });
  const { shot, seed } = getShotParams();
  if (shot) {
    stageShot(shot, seed);
  } else {
    renderTitle(root, records, startMatch);
    setStatus('EMBERFALL — Duel at the Lantern Court. Choose a keeper to begin.');
  }
}

boot();
