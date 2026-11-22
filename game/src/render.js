// Drawing only: the duel's state and the current screen in, pixels out. The 960x640
// table is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Flat colours, canvas text for the HUD and the panels, and every card icon
// (flame, spark, shield) drawn in code — no images, no fonts, no network.

import { CARD, FIELD, FONT, LAYOUT, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

const CARD_GAP = 8;
const BOARD_RIGHT = 780;

/** The rectangles the pointer can hit, from the same math the painter uses. */
export function computeLayout(state) {
  const layout = { hand: [], playerBoard: [], aiBoard: [], endTurn: LAYOUT.endTurn, aiFace: null, playerFace: null };
  const placeRow = (count, y) => {
    const total = count * CARD.width + Math.max(0, count - 1) * CARD_GAP;
    const startX = 8 + (BOARD_RIGHT - 8 - total) / 2;
    const rects = [];
    for (let i = 0; i < count; i += 1) {
      rects.push({ x: startX + i * (CARD.width + CARD_GAP), y, width: CARD.width, height: CARD.height, index: i });
    }
    return rects;
  };
  layout.hand = placeRow(state.player.hand.length, LAYOUT.hand.y);
  layout.playerBoard = placeRow(state.player.board.length, LAYOUT.playerBoard.y);
  layout.aiBoard = placeRow(state.ai.board.length, LAYOUT.aiBoard.y);
  layout.aiFace = { x: 16, y: 12, width: 40, height: 40 };
  layout.playerFace = { x: 16, y: 384, width: 40, height: 40 };
  return layout;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function wrapText(context, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line === '' ? word : `${line} ${word}`;
    if (context.measureText(test).width > maxWidth && line !== '') {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line !== '') lines.push(line);
  return lines;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  /** Window (CSS) pixels to table coordinates. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x / (window.devicePixelRatio || 1)) / (view.scale / (window.devicePixelRatio || 1)),
      y: (clientY - rect.top - view.y / (window.devicePixelRatio || 1)) / (view.scale / (window.devicePixelRatio || 1)),
    };
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, bold) {
    const key = `${size}${bold ? 'b' : ''}`;
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawFlame(cx, cy, radius, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(cx, cy - radius);
    context.bezierCurveTo(cx + radius * 0.9, cy - radius * 0.2, cx + radius * 0.7, cy + radius * 0.6, cx, cy + radius * 0.8);
    context.bezierCurveTo(cx - radius * 0.7, cy + radius * 0.6, cx - radius * 0.9, cy - radius * 0.2, cx, cy - radius);
    context.fill();
    context.fillStyle = '#ffd23e';
    context.beginPath();
    context.moveTo(cx, cy - radius * 0.35);
    context.bezierCurveTo(cx + radius * 0.45, cy + radius * 0.1, cx + radius * 0.35, cy + radius * 0.55, cx, cy + radius * 0.6);
    context.bezierCurveTo(cx - radius * 0.35, cy + radius * 0.55, cx - radius * 0.45, cy + radius * 0.1, cx, cy - radius * 0.35);
    context.fill();
  }

  function drawSpark(cx, cy, radius, color) {
    context.fillStyle = color;
    context.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = (i * Math.PI) / 4 - Math.PI / 2;
      const r = i % 2 === 0 ? radius : radius * 0.38;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
  }

  function drawShield(cx, cy, radius, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(cx, cy - radius);
    context.lineTo(cx + radius * 0.85, cy - radius * 0.55);
    context.lineTo(cx + radius * 0.85, cy + radius * 0.1);
    context.quadraticCurveTo(cx + radius * 0.85, cy + radius * 0.75, cx, cy + radius);
    context.quadraticCurveTo(cx - radius * 0.85, cy + radius * 0.75, cx - radius * 0.85, cy + radius * 0.1);
    context.lineTo(cx - radius * 0.85, cy - radius * 0.55);
    context.closePath();
    context.fill();
  }

  function drawManaCrystals(x, y, maxMana, mana) {
    for (let i = 0; i < maxMana; i += 1) {
      const cx = x + i * 18;
      context.save();
      context.translate(cx, y);
      context.rotate(Math.PI / 4);
      context.fillStyle = i < mana ? PALETTE.mana : '#3a2f28';
      context.strokeStyle = '#7a6a58';
      context.lineWidth = 1;
      context.fillRect(-5, -5, 10, 10);
      context.strokeRect(-5, -5, 10, 10);
      context.restore();
    }
  }

  function drawLifeBar(x, y, width, life, maxLife) {
    context.fillStyle = '#1c120c';
    roundRect(context, x, y, width, 22, 6);
    context.fill();
    const ratio = Math.max(0, life / maxLife);
    context.fillStyle = ratio > 0.5 ? '#c94f3d' : ratio > 0.25 ? '#d97b2f' : '#e5534b';
    if (ratio > 0) {
      roundRect(context, x + 2, y + 2, (width - 4) * ratio, 18, 5);
      context.fill();
    }
    text(`${Math.max(0, life)} / ${maxLife}`, x + width / 2, y + 16, 13, PALETTE.text, 'center', true);
  }

  function drawCardBack(x, y, width, height) {
    context.fillStyle = PALETTE.cardBack;
    roundRect(context, x, y, width, height, 8);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.stroke();
    context.save();
    context.translate(x + width / 2, y + height / 2);
    context.rotate(Math.PI / 4);
    context.fillStyle = PALETTE.ember;
    context.fillRect(-12, -12, 24, 24);
    context.restore();
    drawFlame(x + width / 2, y + height / 2, 9, '#ffd23e');
  }

  function drawCard(card, x, y, width, height, options = {}) {
    const spell = card.kind === 'spell';
    context.fillStyle = spell ? PALETTE.spellFace : PALETTE.cardFace;
    roundRect(context, x, y, width, height, 8);
    context.fill();
    context.lineWidth = options.selected ? 4 : 2;
    context.strokeStyle = options.selected ? PALETTE.gold : options.playable ? '#7ec850' : '#5a4028';
    context.stroke();
    if (options.targetable) {
      context.lineWidth = 3;
      context.strokeStyle = PALETTE.gold;
      context.stroke();
    }
    // Cost gem.
    context.fillStyle = PALETTE.mana;
    context.beginPath();
    context.arc(x + 14, y + 14, 11, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = `700 13px ${FONT}`;
    context.textAlign = 'center';
    context.fillText(String(card.cost), x + 14, y + 18);
    // Name.
    context.fillStyle = '#2b1a10';
    context.font = `700 11px ${FONT}`;
    context.textAlign = 'center';
    const nameLines = wrapText(context, card.name, width - 30);
    nameLines.slice(0, 2).forEach((line, i) => context.fillText(line, x + width / 2 + 6, y + 18 + i * 12));
    // Art.
    const artY = y + 52;
    if (spell) drawSpark(x + width / 2, artY, 20, '#7a5fd0');
    else drawFlame(x + width / 2, artY, 20, PALETTE.flame);
    if (card.guard) drawShield(x + width - 16, y + 44, 11, '#3d7ab8');
    // Rules text.
    context.fillStyle = '#4a3220';
    context.font = `10px ${FONT}`;
    context.textAlign = 'center';
    const textLines = wrapText(context, card.text, width - 12);
    textLines.slice(0, 2).forEach((line, i) => context.fillText(line, x + width / 2, y + height - 26 + i * 11));
    // Attack / health pips for creatures.
    if (!spell) {
      context.fillStyle = PALETTE.attack;
      context.beginPath();
      context.arc(x + 14, y + height - 14, 11, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffffff';
      context.font = `700 13px ${FONT}`;
      context.fillText(String(card.attack), x + 14, y + height - 10);
      context.fillStyle = PALETTE.health;
      context.beginPath();
      context.arc(x + width - 14, y + height - 14, 11, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffffff';
      context.fillText(String(card.health), x + width - 14, y + height - 10);
    }
    if (card.justPlayed) {
      context.fillStyle = 'rgba(242, 201, 76, 0.25)';
      roundRect(context, x, y, width, height, 8);
      context.fill();
    }
  }

  function drawSideRow(state, name, y, faceRect, isAi) {
    const side = name === 'player' ? state.player : state.ai;
    const label = isAi ? 'The Ashen Warden' : 'You — Ember Duelist';
    // Portrait.
    context.fillStyle = isAi ? '#5a2a1a' : '#7a4a1a';
    context.beginPath();
    context.arc(faceRect.x + 20, faceRect.y + 20, 19, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.stroke();
    if (isAi) drawFlame(faceRect.x + 20, faceRect.y + 20, 11, '#ffb3a0');
    else drawFlame(faceRect.x + 20, faceRect.y + 20, 11, '#ffd23e');
    text(label, 66, y + 18, 16, isAi ? PALETTE.aiText : PALETTE.playerText, 'left', true);
    text(`Deck ${side.deck.length}  •  Hand ${side.hand.length}`, 66, y + 38, 12, PALETTE.muted, 'left');
    drawLifeBar(300, y + 8, 200, side.life, 30);
    text('Life', 292, y + 24, 11, PALETTE.muted, 'right');
    drawManaCrystals(530, y + 20, Math.max(1, side.maxMana), side.mana);
    text(`${side.mana}/${Math.max(1, side.maxMana)} mana`, 530, y + 38, 11, PALETTE.muted, 'left');
    // Opponent's hand, face down.
    if (isAi) {
      const shown = Math.min(5, side.hand.length);
      for (let i = 0; i < shown; i += 1) drawCardBack(700 + i * 16, y + 2, 34, 44);
      if (side.hand.length > shown) text(`+${side.hand.length - shown}`, 700 + shown * 16 + 6, y + 30, 12, PALETTE.muted, 'left');
    }
  }

  function drawTable(state, layout, ui) {
    context.fillStyle = PALETTE.felt;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Felt rings.
    context.strokeStyle = PALETTE.feltLine;
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(394, 320, 380, 300, 0, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.ellipse(394, 320, 300, 230, 0, 0, Math.PI * 2);
    context.stroke();
    // Ember emblem beside the banner.
    drawFlame(736, 218, 16, PALETTE.ember);

    drawSideRow(state, 'ai', LAYOUT.aiRow.y, layout.aiFace, true);
    drawSideRow(state, 'player', LAYOUT.playerRow.y, layout.playerFace, false);

    // Boards.
    for (const rect of layout.aiBoard) {
      const card = state.ai.board[rect.index];
      drawCard(card, rect.x, rect.y, rect.width, rect.height, { targetable: ui.canHitAi });
    }
    for (const rect of layout.playerBoard) {
      const card = state.player.board[rect.index];
      const selected = ui.attacker === rect.index;
      drawCard(card, rect.x, rect.y, rect.width, rect.height, { selected, playable: card.canAttack && state.active === 'player' && !state.over });
    }

    // Banner.
    const bannerText = state.over
      ? (state.winner === 'player' ? 'Victory!' : 'Defeat.')
      : state.active === 'player'
        ? `YOUR TURN  •  Turn ${state.turn}  —  play a card, then attack`
        : 'The Ashen Warden is thinking…';
    text(bannerText, 394, LAYOUT.banner.y + 28, 17, state.active === 'player' && !state.over ? PALETTE.gold : PALETTE.muted, 'center', true);

    // Player hand.
    for (const rect of layout.hand) {
      const card = state.player.hand[rect.index];
      const raised = ui.hoverHand === rect.index || ui.selectedHand === rect.index;
      const y = raised ? rect.y - 14 : rect.y;
      drawCard(card, rect.x, y, rect.width, rect.height, {
        selected: ui.selectedHand === rect.index,
        playable: card.cost <= state.player.mana && state.active === 'player' && !state.over,
      });
    }

    // Battle log.
    const logBox = LAYOUT.log;
    context.fillStyle = PALETTE.panel;
    roundRect(context, logBox.x, logBox.y, logBox.width, logBox.height, 8);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.stroke();
    text('BATTLE LOG', logBox.x + 12, logBox.y + 22, 13, PALETTE.gold, 'left', true);
    context.font = `11px ${FONT}`;
    const lines = [];
    for (const entry of state.log.slice(-9)) {
      lines.push(...wrapText(context, entry, logBox.width - 24));
    }
    const shown = lines.slice(-20);
    shown.forEach((line, i) => {
      context.fillStyle = i >= shown.length - 3 ? PALETTE.text : PALETTE.muted;
      context.textAlign = 'left';
      context.fillText(line, logBox.x + 12, logBox.y + 44 + i * 15);
    });

    // End Turn button.
    const button = LAYOUT.endTurn;
    const enabled = state.active === 'player' && !state.over;
    context.fillStyle = enabled ? (ui.hoverEnd ? '#b85c1e' : PALETTE.ember) : '#4a352a';
    roundRect(context, button.x, button.y, button.width, button.height, 8);
    context.fill();
    text('END TURN  (E)', button.x + button.width / 2, button.y + 33, 17, enabled ? '#ffffff' : PALETTE.muted, 'center', true);

    // Hint bar.
    text('Click a card to play it  •  Click your creature, then an enemy to attack  •  Spark Burst needs a target', 394, LAYOUT.hint.y + 30, 12, PALETTE.muted, 'center');
  }

  function drawPanel(title, lines, prompt, titleColor) {
    const width = 620;
    const height = 150 + lines.length * 30;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(10, 6, 4, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, width, height, 12);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.stroke();
    text(title, FIELD.width / 2, y + 72, 52, titleColor, 'center', true);
    lines.forEach((line, i) => text(line, FIELD.width / 2, y + 116 + i * 30, 17, PALETTE.text, 'center'));
    text(prompt, FIELD.width / 2, y + height - 34, 18, PALETTE.gold, 'center', true);
  }

  /** Paint one frame: the table, then the panel for the screen the game is on. */
  function draw(state, screen, ui) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const layout = computeLayout(state);
    drawTable(state, layout, ui);
    if (screen === SCREEN_TITLE) {
      drawPanel('EMBER COURT', [
        'A duel of cinders and flame against the Ashen Warden.',
        'Play creatures, guard your life, spend your mana — first to 0 life loses.',
        'Mana grows one crystal a turn. Guards must be struck first.',
        ui.wins > 0 ? `Duels won here: ${ui.wins}` : 'No duels won yet. The court awaits.',
      ], 'Click or press Enter to play', PALETTE.gold);
    } else if (screen === SCREEN_WIN) {
      drawPanel('VICTORY', [
        'The Ashen Warden’s flame is spent. The court is yours.',
        `Won in ${state.turn} turn${state.turn === 1 ? '' : 's'}  •  ${state.cardsPlayed} cards played.`,
      ], 'Press Enter to play again', '#ffd23e');
    } else if (screen === SCREEN_LOSS) {
      drawPanel('DEFEAT', [
        'Your flame gutters out. The court goes dark.',
        `The Warden endured ${state.turn} turn${state.turn === 1 ? '' : 's'}  •  ${state.cardsPlayed} cards played.`,
      ], 'Press Enter to try again', '#e5534b');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
