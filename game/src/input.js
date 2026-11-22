// input.js — keyboard and mouse input for the duel.
// Keys 1-5 play the matching card in your hand, M mutes, H toggles help,
// Esc leaves the table. Clicks are wired by the renderer onto the cards.

export function bindInput(handlers) {
  function onKeydown(e) {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    if (key >= '1' && key <= '5') {
      const idx = Number(key) - 1;
      handlers.onPlayIndex(idx);
    } else if (key === 'm') {
      handlers.onMute();
    } else if (key === 'h') {
      handlers.onHelp();
    } else if (key === 'escape') {
      handlers.onEscape();
    } else if (key === 'enter') {
      handlers.onEnter();
    }
  }
  window.addEventListener('keydown', onKeydown);
  return () => window.removeEventListener('keydown', onKeydown);
}

// Fit the fixed 1280x720 stage into the window, keeping its aspect.
export function fitStage(stage) {
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
