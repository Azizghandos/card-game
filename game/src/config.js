// EMBER COURT — every tuning number, colour and card definition in one place.
// The table is a fixed 960x640 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 960, height: 640 };

export const MAX_LIFE = 30;
export const MAX_MANA = 10;
export const MAX_BOARD = 7;
export const HAND_LIMIT = 8;
export const START_HAND = 3;
export const DECK_SIZE = 30;

/** A card's drawn size on the table. */
export const CARD = { width: 92, height: 124 };

/** The original card pool. Two copies of a creature or spell make a deck of 30. */
export const CARD_DEFS = [
  { id: 'ember-imp', name: 'Ember Imp', kind: 'creature', cost: 1, attack: 2, health: 1, text: 'A spark with teeth.' },
  { id: 'spark-sprite', name: 'Spark Sprite', kind: 'creature', cost: 1, attack: 1, health: 2, text: 'It hums as it burns.' },
  { id: 'cinder-wolf', name: 'Cinder Wolf', kind: 'creature', cost: 2, attack: 3, health: 2, text: 'It hunts through smoke.' },
  { id: 'coal-hound', name: 'Coal Hound', kind: 'creature', cost: 2, attack: 2, health: 3, text: 'Loyal, hot, hungry.' },
  { id: 'flame-guard', name: 'Flame Guard', kind: 'creature', cost: 3, attack: 2, health: 5, guard: true, text: 'Guard: foes must strike it first.' },
  { id: 'ember-mage', name: 'Ember Mage', kind: 'creature', cost: 3, attack: 3, health: 3, text: 'Her sparks bite back.' },
  { id: 'pyre-knight', name: 'Pyre Knight', kind: 'creature', cost: 4, attack: 4, health: 4, guard: true, text: 'Guard: a wall of fire.' },
  { id: 'molten-golem', name: 'Molten Golem', kind: 'creature', cost: 5, attack: 5, health: 5, text: 'Slow. Unstoppable. Hot.' },
  { id: 'ash-drake', name: 'Ash Drake', kind: 'creature', cost: 6, attack: 6, health: 6, text: 'The court bows to wings.' },
  { id: 'spark-burst', name: 'Spark Burst', kind: 'spell', cost: 2, damage: 3, target: 'any', text: 'Deal 3 damage to any target.' },
  { id: 'mend', name: 'Mend', kind: 'spell', cost: 2, heal: 5, text: 'Restore 5 life to yourself.' },
  { id: 'kindling', name: 'Kindling', kind: 'spell', cost: 1, draw: 2, text: 'Draw 2 cards.' },
  { id: 'cinder-rain', name: 'Cinder Rain', kind: 'spell', cost: 4, damageAll: 2, text: 'Deal 2 damage to all enemy creatures.' },
];

/** How many copies of each definition go into a 30-card deck. */
export const DECK_RECIPE = [
  ['ember-imp', 3], ['spark-sprite', 2], ['cinder-wolf', 3], ['coal-hound', 3],
  ['flame-guard', 3], ['ember-mage', 2], ['pyre-knight', 2], ['molten-golem', 2],
  ['ash-drake', 2], ['spark-burst', 3], ['mend', 2], ['kindling', 2], ['cinder-rain', 1],
];

export const PALETTE = {
  backdrop: '#17100c',
  felt: '#2e1f16',
  feltDark: '#241710',
  feltLine: '#4a2f1d',
  gold: '#f2c94c',
  ember: '#ff7a2f',
  flame: '#ff5a1f',
  coal: '#3a2a22',
  panel: '#241a13',
  panelEdge: '#6b4a2f',
  text: '#f5ead9',
  muted: '#c9a886',
  cardFace: '#f7ead2',
  cardFaceDark: '#e8d3ae',
  cardBack: '#4a2418',
  spellFace: '#e9e2f7',
  health: '#e5534b',
  mana: '#4fa8e8',
  attack: '#ff8c2f',
  aiText: '#ffb3a0',
  playerText: '#ffe9b0',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the win count is kept between visits (this browser only). */
export const WINS_KEY = 'ember-court.wins';

/** The table's zones, in field coordinates. */
export const LAYOUT = {
  log: { x: 788, y: 8, width: 164, height: 556 },
  endTurn: { x: 788, y: 576, width: 164, height: 52 },
  aiRow: { y: 10, height: 44 },
  aiBoard: { y: 62, height: 126 },
  banner: { y: 196, height: 44 },
  playerBoard: { y: 248, height: 126 },
  playerRow: { y: 382, height: 44 },
  hand: { y: 434, height: 128 },
  hint: { y: 576, height: 52 },
};
