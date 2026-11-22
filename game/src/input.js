// Keyboard and pointer input. Clicks are queued as table coordinates and taken once
// by the loop, so a click between two frames is never lost and never counted twice.
// Keys: Enter/Space confirms, E ends the turn, Escape cancels a selection.

export const ACTION_CONFIRM = 1;
export const ACTION_END_TURN = 2;
export const ACTION_CANCEL = 4;

const CONFIRM = new Set(['Space', 'Enter']);
const END_TURN = new Set(['KeyE']);
const CANCEL = new Set(['Escape']);

export function createInput(canvas, toField) {
  let actions = 0;
  const clicks = [];
  let hover = null;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (END_TURN.has(event.code)) {
      if (!event.repeat) actions |= ACTION_END_TURN;
    } else if (CANCEL.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CANCEL;
    } else return;
    event.preventDefault();
  });

  canvas.addEventListener('pointerdown', (event) => {
    clicks.push(toField(event.clientX, event.clientY));
  });
  canvas.addEventListener('pointermove', (event) => {
    hover = toField(event.clientX, event.clientY);
  });
  canvas.addEventListener('pointerleave', () => {
    hover = null;
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Clicks since the last call, in table coordinates. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
    /** The pointer's current table position, or null when it left the canvas. */
    pointer() {
      return hover;
    },
  };
}
