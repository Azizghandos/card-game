// Boot and the one loop: clicks and keys are read every frame, the Warden's turn runs
// one planned action at a time so the player can watch it, and the renderer paints what
// is there. The game moves between four screens: title, play, win and loss.
//
// ?seed=N fixes the shuffle. ?shot=title|play|win|loss (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { WINS_KEY } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_ATTACK, EVENT_LOSS, EVENT_PLAY, EVENT_SPELL, EVENT_WIN } from './world.js';
import { ACTION_CANCEL, ACTION_CONFIRM, ACTION_END_TURN, createInput } from './input.js';
import { computeLayout, createRenderer, SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readWins() {
  try {
    return Number.parseInt(window.localStorage.getItem(WINS_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveWins(value) {
  try {
    window.localStorage.setItem(WINS_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the win count then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  const ui = { attacker: null, selectedHand: null, hoverHand: null, hoverEnd: false, canHitAi: false, wins: readWins() };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, ui);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toField(x, y));
  let screen = SCREEN_TITLE;
  let wins = readWins();
  let aiBusy = false;
  let selectedHand = null;
  let pendingSpell = null;
  let attacker = null;

  const ui = {
    attacker: null,
    selectedHand: null,
    hoverHand: null,
    hoverEnd: false,
    canHitAi: false,
    wins,
  };

  function announce(message) {
    status.textContent = message;
  }

  function playSound(events) {
    if (events & EVENT_WIN) audio.win();
    else if (events & EVENT_LOSS) audio.lose();
    else if (events & EVENT_SPELL) audio.spell();
    else if (events & EVENT_ATTACK) audio.hit();
    else if (events & EVENT_PLAY) audio.playCard();
  }

  function refreshEnd() {
    if (world.state.over) {
      screen = world.state.winner === 'player' ? SCREEN_WIN : SCREEN_LOSS;
      if (world.state.winner === 'player') {
        wins += 1;
        saveWins(wins);
        ui.wins = wins;
      }
      announce(world.state.winner === 'player' ? 'Victory! The Ashen Warden falls.' : 'Defeat. The court goes dark.');
    }
  }

  function startMatch() {
    world.startMatch();
    screen = SCREEN_PLAY;
    aiBusy = false;
    selectedHand = null;
    pendingSpell = null;
    attacker = null;
    announce(`Your turn. ${world.state.player.life} life, ${world.state.player.mana} mana.`);
  }

  /** Run the Warden's planned turn one action at a time, then hand the table back. */
  function runAiTurn() {
    aiBusy = true;
    const actions = world.planTurn('ai');
    let index = 0;
    function nextAction() {
      if (index >= actions.length || world.state.over) {
        aiBusy = false;
        refreshEnd();
        if (!world.state.over) announce(`Your turn. ${world.state.player.life} life, ${world.state.player.mana} mana.`);
        return;
      }
      const events = world.applyAction('ai', actions[index]);
      index += 1;
      playSound(events);
      refreshEnd();
      if (!world.state.over) window.setTimeout(nextAction, 520);
      else aiBusy = false;
    }
    window.setTimeout(nextAction, 520);
  }

  function endPlayerTurn() {
    if (world.state.active !== 'player' || world.state.over || aiBusy) return;
    selectedHand = null;
    pendingSpell = null;
    attacker = null;
    const events = world.endTurn('player');
    playSound(events);
    announce('The Ashen Warden takes the turn.');
    runAiTurn();
  }

  function pointIn(point, rect) {
    return point && point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  function handleClick(point) {
    audio.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS) {
      startMatch();
      return;
    }
    if (world.state.over || aiBusy || world.state.active !== 'player') return;
    const layout = computeLayout(world.state);

    // The End Turn button.
    if (pointIn(point, layout.endTurn)) {
      audio.click();
      endPlayerTurn();
      return;
    }

    // A spell that needs a target: the enemy face or one of its creatures.
    if (pendingSpell !== null) {
      for (const rect of layout.aiBoard) {
        if (pointIn(point, rect)) {
          const events = world.playCard('player', pendingSpell, { kind: 'creature', index: rect.index });
          if (events) playSound(events);
          pendingSpell = null;
          selectedHand = null;
          refreshEnd();
          return;
        }
      }
      if (pointIn(point, layout.aiFace)) {
        const events = world.playCard('player', pendingSpell, { kind: 'face' });
        if (events) playSound(events);
        pendingSpell = null;
        selectedHand = null;
        refreshEnd();
        return;
      }
      pendingSpell = null;
      selectedHand = null;
      return;
    }

    // An attacker chosen: the enemy face or one of its creatures.
    if (attacker !== null) {
      for (const rect of layout.aiBoard) {
        if (pointIn(point, rect)) {
          const events = world.attack('player', attacker, rect.index);
          if (events) playSound(events);
          attacker = null;
          refreshEnd();
          return;
        }
      }
      if (pointIn(point, layout.aiFace)) {
        const events = world.attack('player', attacker, 'face');
        if (events) playSound(events);
        attacker = null;
        refreshEnd();
        return;
      }
      // Picking another of your own creatures switches the attacker.
      for (const rect of layout.playerBoard) {
        if (pointIn(point, rect) && world.state.player.board[rect.index].canAttack) {
          attacker = rect.index;
          audio.click();
          return;
        }
      }
      attacker = null;
      return;
    }

    // Your hand: play the card, or arm a spell that needs a target.
    for (const rect of layout.hand) {
      if (pointIn(point, rect)) {
        const card = world.state.player.hand[rect.index];
        if (card.cost > world.state.player.mana) return;
        if (card.kind === 'spell' && card.defId === 'spark-burst') {
          pendingSpell = rect.index;
          selectedHand = rect.index;
          audio.click();
          announce('Spark Burst: choose a target — a creature or the Warden.');
          return;
        }
        const events = world.playCard('player', rect.index);
        if (events) playSound(events);
        refreshEnd();
        return;
      }
    }

    // Your board: choose a ready creature to attack with.
    for (const rect of layout.playerBoard) {
      if (pointIn(point, rect) && world.state.player.board[rect.index].canAttack) {
        attacker = rect.index;
        audio.click();
        announce(`${world.state.player.board[rect.index].name} is ready — choose a target.`);
        return;
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CANCEL) {
      pendingSpell = null;
      selectedHand = null;
      attacker = null;
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSS) startMatch();
    }
    if (actions & ACTION_END_TURN && screen === SCREEN_PLAY) endPlayerTurn();
  }

  function frame() {
    requestAnimationFrame(frame);
    handleActions();
    for (const click of input.takeClicks()) handleClick(click);

    // Hover state for the painter.
    const pointer = input.pointer();
    const layout = computeLayout(world.state);
    ui.hoverHand = null;
    ui.hoverEnd = false;
    if (pointer && screen === SCREEN_PLAY) {
      for (const rect of layout.hand) {
        if (pointIn(pointer, rect)) ui.hoverHand = rect.index;
      }
      ui.hoverEnd = pointIn(pointer, layout.endTurn);
    }
    ui.attacker = attacker;
    ui.selectedHand = selectedHand;
    ui.canHitAi = attacker !== null || pendingSpell !== null;
    renderer.draw(world.state, screen, ui);
  }

  // Leaving the tab clears a half-made selection rather than leaving it armed.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pendingSpell = null;
      selectedHand = null;
      attacker = null;
    }
  });

  announce('Ember Court. Press Enter or click to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
