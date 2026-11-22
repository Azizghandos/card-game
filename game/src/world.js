// EMBER COURT — the duel's rules and state, with no drawing and no browser in it.
// Two sides, 30 life each, mana that grows one crystal a turn up to 10, a 30-card deck,
// creatures that guard, spells that burn, mend or draw. step-free: the caller drives
// turns with playCard / attack / endTurn and reads back what happened as bit flags.

import { CARD_DEFS, DECK_RECIPE, HAND_LIMIT, MAX_BOARD, MAX_LIFE, MAX_MANA, START_HAND } from './config.js';

export const EVENT_PLAY = 1;
export const EVENT_ATTACK = 2;
export const EVENT_SPELL = 4;
export const EVENT_WIN = 8;
export const EVENT_LOSS = 16;
export const EVENT_DRAW = 32;

const DEFS = new Map(CARD_DEFS.map((def) => [def.id, def]));

function defOf(id) {
  return DEFS.get(id);
}

/** A fresh card instance from a definition id. */
function makeCard(defId, uid) {
  const def = defOf(defId);
  return {
    uid,
    defId: def.id,
    name: def.name,
    kind: def.kind,
    cost: def.cost,
    attack: def.attack ?? 0,
    health: def.health ?? 0,
    maxHealth: def.health ?? 0,
    guard: Boolean(def.guard),
    text: def.text,
    canAttack: false,
    justPlayed: false,
  };
}

function newSide() {
  return { life: MAX_LIFE, mana: 0, maxMana: 0, deck: [], hand: [], board: [], fatigue: 0 };
}

export function createWorld(random) {
  let uidCounter = 1;
  const state = {
    turn: 0,
    active: 'player',
    over: false,
    winner: null,
    player: newSide(),
    ai: newSide(),
    log: [],
    cardsPlayed: 0,
    started: false,
  };

  function logLine(text) {
    state.log.push(text);
    if (state.log.length > 40) state.log.shift();
  }

  function buildDeck() {
    const deck = [];
    for (const [defId, count] of DECK_RECIPE) {
      for (let i = 0; i < count; i += 1) deck.push(makeCard(defId, uidCounter++));
    }
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function sideOf(name) {
    return name === 'player' ? state.player : state.ai;
  }

  function otherOf(name) {
    return name === 'player' ? state.ai : state.player;
  }

  function sideName(name) {
    return name === 'player' ? 'You' : 'The Ashen Warden';
  }

  function checkEnd() {
    if (state.over) return 0;
    if (state.ai.life <= 0) {
      state.over = true;
      state.winner = 'player';
      logLine('The Ashen Warden falls. Victory is yours!');
      return EVENT_WIN;
    }
    if (state.player.life <= 0) {
      state.over = true;
      state.winner = 'ai';
      logLine('Your flame gutters out. The court goes dark.');
      return EVENT_LOSS;
    }
    return 0;
  }

  /** Draw one card for `name`; an empty deck burns life instead (fatigue). */
  function drawCard(name) {
    const side = sideOf(name);
    if (side.deck.length === 0) {
      side.fatigue += 1;
      side.life -= side.fatigue;
      logLine(`${sideName(name)} draw${name === 'player' ? '' : 's'} from an empty deck and take${name === 'player' ? '' : 's'} ${side.fatigue} fatigue.`);
      return checkEnd();
    }
    const card = side.deck.pop();
    if (side.hand.length >= HAND_LIMIT) {
      logLine(`${sideName(name)} burn${name === 'player' ? '' : 's'} ${card.name} (hand full).`);
      return 0;
    }
    side.hand.push(card);
    return EVENT_DRAW;
  }

  /** Open a side's turn: one more mana crystal (up to 10), refill, ready creatures, draw. */
  function beginTurn(name) {
    const side = sideOf(name);
    side.maxMana = Math.min(MAX_MANA, side.maxMana + 1);
    side.mana = side.maxMana;
    for (const creature of side.board) creature.canAttack = true;
    return drawCard(name);
  }

  function startMatch() {
    state.turn = 1;
    state.active = 'player';
    state.over = false;
    state.winner = null;
    state.log = [];
    state.cardsPlayed = 0;
    state.started = true;
    state.player = newSide();
    state.ai = newSide();
    state.player.deck = buildDeck();
    state.ai.deck = buildDeck();
    state.player.maxMana = 1;
    state.player.mana = 1;
    state.ai.maxMana = 0;
    state.ai.mana = 0;
    for (let i = 0; i < START_HAND; i += 1) {
      state.player.hand.push(state.player.deck.pop());
      state.ai.hand.push(state.ai.deck.pop());
    }
    logLine('The duel begins. You hold the first turn.');
    logLine('Ember Court: reduce the Warden to 0 life to win.');
  }

  function hasGuard(side) {
    return side.board.some((creature) => creature.guard);
  }

  function removeDead(side) {
    for (let i = side.board.length - 1; i >= 0; i -= 1) {
      if (side.board[i].health <= 0) {
        logLine(`${side.board[i].name} crumbles to ash.`);
        side.board.splice(i, 1);
      }
    }
  }

  function damageCreature(side, index, amount) {
    const creature = side.board[index];
    if (!creature) return 0;
    creature.health -= amount;
    logLine(`${creature.name} takes ${amount} damage.`);
    removeDead(side);
    return checkEnd();
  }

  function damageFace(name, amount) {
    const side = sideOf(name);
    side.life -= amount;
    logLine(`${sideName(name)} take${name === 'player' ? '' : 's'} ${amount} damage.`);
    return checkEnd();
  }

  /**
   * Play the card at `handIndex` from `name`'s hand. Spells that need a target take
   * `target`: { kind: 'face' } or { kind: 'creature', index } on the enemy board.
   * Returns bit flags, or 0 when the play is not legal.
   */
  function playCard(name, handIndex, target) {
    if (state.over || state.active !== name) return 0;
    const side = sideOf(name);
    const foe = otherOf(name);
    const card = side.hand[handIndex];
    if (!card || card.cost > side.mana) return 0;
    const def = defOf(card.defId);
    if (card.kind === 'creature' && side.board.length >= MAX_BOARD) return 0;
    if (def.target === 'any' && !target) return 0;

    side.hand.splice(handIndex, 1);
    side.mana -= card.cost;
    state.cardsPlayed += 1;
    let events = EVENT_PLAY;

    if (card.kind === 'creature') {
      card.canAttack = false;
      card.justPlayed = true;
      side.board.push(card);
      logLine(`${sideName(name)} summon${name === 'player' ? '' : 's'} ${card.name} (${card.attack}/${card.health}).`);
      return events;
    }

    logLine(`${sideName(name)} cast${name === 'player' ? '' : 's'} ${card.name}.`);
    events |= EVENT_SPELL;
    if (def.damage) {
      if (target.kind === 'face') events |= damageFace(name === 'player' ? 'ai' : 'player', def.damage);
      else events |= damageCreature(foe, target.index, def.damage);
    }
    if (def.damageAll) {
      for (let i = foe.board.length - 1; i >= 0; i -= 1) {
        foe.board[i].health -= def.damageAll;
        logLine(`${foe.board[i].name} is scorched for ${def.damageAll}.`);
      }
      removeDead(foe);
      events |= checkEnd();
    }
    if (def.heal) {
      side.life = Math.min(MAX_LIFE, side.life + def.heal);
      logLine(`${sideName(name)} mend${name === 'player' ? '' : 's'} ${def.heal} life.`);
    }
    if (def.draw) {
      for (let i = 0; i < def.draw; i += 1) events |= drawCard(name);
    }
    return events;
  }

  /**
   * Attack with the creature at `attackerIndex` on `name`'s board.
   * `target` is 'face' or a board index on the enemy side. Guards must be struck first.
   */
  function attack(name, attackerIndex, target) {
    if (state.over || state.active !== name) return 0;
    const side = sideOf(name);
    const foe = otherOf(name);
    const attacker = side.board[attackerIndex];
    if (!attacker || !attacker.canAttack) return 0;
    if (target !== 'face') {
      const defender = foe.board[target];
      if (!defender) return 0;
      if (hasGuard(foe) && !defender.guard) return 0;
    }
    if (target === 'face' && hasGuard(foe)) return 0;

    attacker.canAttack = false;
    let events = EVENT_ATTACK;
    if (target === 'face') {
      logLine(`${attacker.name} strikes ${name === 'player' ? 'the Warden' : 'you'} for ${attacker.attack}.`);
      events |= damageFace(name === 'player' ? 'ai' : 'player', attacker.attack);
    } else {
      const defender = foe.board[target];
      if (!defender) return 0;
      logLine(`${attacker.name} clashes with ${defender.name}.`);
      defender.health -= attacker.attack;
      attacker.health -= defender.attack;
      removeDead(foe);
      removeDead(side);
      events |= checkEnd();
    }
    return events;
  }

  /** End `name`'s turn and open the other side's. */
  function endTurn(name) {
    if (state.over || state.active !== name) return 0;
    state.active = name === 'player' ? 'ai' : 'player';
    if (state.active === 'player') state.turn += 1;
    logLine(state.active === 'player' ? 'Your turn.' : 'The Ashen Warden takes the turn.');
    return beginTurn(state.active);
  }

  /**
   * The Warden's (and the autopilot's) plan for `name`'s turn: a list of actions to run
   * through playCard / attack in order, ending with { type: 'end' }. Creatures first,
   * spells when they help, attacks at guards then at the face.
   */
  function planTurn(name) {
    const side = sideOf(name);
    const foe = otherOf(name);
    const actions = [];
    const mana = { value: side.mana };
    const hand = side.hand.slice();
    const board = side.board.slice();
    const foeBoard = foe.board.slice();

    // Play cards: biggest affordable creature first, then useful spells.
    let played = true;
    while (played && !state.over) {
      played = false;
      let bestIndex = -1;
      let bestCost = -1;
      for (let i = 0; i < hand.length; i += 1) {
        const card = hand[i];
        if (card.kind === 'creature' && card.cost <= mana.value && board.length < MAX_BOARD && card.cost > bestCost) {
          bestIndex = i;
          bestCost = card.cost;
        }
      }
      if (bestIndex >= 0) {
        actions.push({ type: 'play', uid: hand[bestIndex].uid });
        mana.value -= hand[bestIndex].cost;
        board.push(hand[bestIndex]);
        hand.splice(bestIndex, 1);
        played = true;
        continue;
      }
      for (let i = 0; i < hand.length; i += 1) {
        const card = hand[i];
        const def = defOf(card.defId);
        if (card.cost > mana.value) continue;
        if (def.draw && hand.length <= 5) {
          actions.push({ type: 'play', uid: card.uid });
          mana.value -= card.cost;
          hand.splice(i, 1);
          played = true;
          break;
        }
        if (def.heal && side.life <= 18) {
          actions.push({ type: 'play', uid: card.uid });
          mana.value -= card.cost;
          hand.splice(i, 1);
          played = true;
          break;
        }
        if (def.damageAll && foeBoard.length >= 2) {
          actions.push({ type: 'play', uid: card.uid });
          mana.value -= card.cost;
          for (let k = foeBoard.length - 1; k >= 0; k -= 1) {
            foeBoard[k] = { ...foeBoard[k], health: foeBoard[k].health - def.damageAll };
            if (foeBoard[k].health <= 0) foeBoard.splice(k, 1);
          }
          hand.splice(i, 1);
          played = true;
          break;
        }
        if (def.damage) {
          const lethal = def.damage >= foe.life;
          const big = foeBoard.reduce((best, c, idx) => (c.attack >= 4 && (best < 0 || c.attack > foeBoard[best].attack) ? idx : best), -1);
          if (lethal) {
            actions.push({ type: 'play', uid: card.uid, target: { kind: 'face' } });
            mana.value -= card.cost;
            hand.splice(i, 1);
            played = true;
            break;
          }
          if (big >= 0 && foeBoard[big].health <= def.damage) {
            actions.push({ type: 'play', uid: card.uid, target: { kind: 'creature', uid: foeBoard[big].uid } });
            mana.value -= card.cost;
            foeBoard.splice(big, 1);
            hand.splice(i, 1);
            played = true;
            break;
          }
        }
      }
    }

    // Attacks: guards first, then the face (or a big threat this creature can kill).
    // The plan simulates each clash on copies, so later targets still point at living
    // creatures and the real cards are untouched until the actions run.
    const liveBoard = board.map((c) => ({ ...c }));
    const liveFoe = foeBoard.map((c) => ({ ...c }));
    for (let a = 0; a < liveBoard.length; a += 1) {
      const attacker = liveBoard[a];
      if (!attacker || !attacker.canAttack || attacker.health <= 0) continue;
      const guardIndex = liveFoe.findIndex((c) => c.guard);
      let target;
      if (guardIndex >= 0) target = { kind: 'creature', uid: liveFoe[guardIndex].uid };
      else {
        const prey = liveFoe.findIndex((c) => c.attack >= 5 && c.health <= attacker.attack);
        target = prey >= 0 ? { kind: 'creature', uid: liveFoe[prey].uid } : 'face';
      }
      actions.push({ type: 'attack', uid: attacker.uid, target });
      if (target !== 'face') {
        const defender = liveFoe.find((c) => c.uid === target.uid);
        defender.health -= attacker.attack;
        attacker.health -= defender.attack;
        if (defender.health <= 0) liveFoe.splice(liveFoe.indexOf(defender), 1);
        if (attacker.health <= 0) liveBoard.splice(a, 1);
      }
    }
    actions.push({ type: 'end' });
    return actions;
  }

  /** Run one planned action through the real rules; uids resolve to current positions. */
  function applyAction(name, action) {
    if (action.type === 'play') {
      const handIndex = sideOf(name).hand.findIndex((c) => c.uid === action.uid);
      if (handIndex < 0) return 0;
      let target;
      if (action.target && action.target.kind === 'creature') {
        const index = otherOf(name).board.findIndex((c) => c.uid === action.target.uid);
        if (index < 0) return 0;
        target = { kind: 'creature', index };
      } else if (action.target) target = action.target;
      return playCard(name, handIndex, target);
    }
    if (action.type === 'attack') {
      const attackerIndex = sideOf(name).board.findIndex((c) => c.uid === action.uid);
      if (attackerIndex < 0) return 0;
      if (action.target === 'face') return attack(name, attackerIndex, 'face');
      const targetIndex = otherOf(name).board.findIndex((c) => c.uid === action.target.uid);
      if (targetIndex < 0) return 0;
      return attack(name, attackerIndex, targetIndex);
    }
    if (action.type === 'end') return endTurn(name);
    return 0;
  }

  /**
   * Stage a near-end board for a screenshot: set the lives and put the named creatures
   * on the named side's board, ready to attack. Used only by shots.js.
   */
  function stageScene({ playerLife, aiLife, playerBoard, aiBoard }) {
    if (typeof playerLife === 'number') state.player.life = playerLife;
    if (typeof aiLife === 'number') state.ai.life = aiLife;
    if (playerBoard) {
      state.player.board = playerBoard.map((defId) => {
        const card = makeCard(defId, uidCounter++);
        card.canAttack = true;
        return card;
      });
    }
    if (aiBoard) {
      state.ai.board = aiBoard.map((defId) => {
        const card = makeCard(defId, uidCounter++);
        card.canAttack = true;
        return card;
      });
    }
  }

  startMatch();
  return { state, startMatch, drawCard, beginTurn, playCard, attack, endTurn, planTurn, applyAction, stageScene, logLine };
}
