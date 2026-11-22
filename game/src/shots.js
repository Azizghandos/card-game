// The screenshot scenes behind ?shot=title|play|win|loss. Each one plays the real rules
// forward from a fresh world, steered by the same planTurn autopilot the Warden uses,
// so the frame is what a real duel looks like and the same seed always gives the same
// frame. The win and loss scenes stage a near-end board deterministically, then play
// the finishing move through the real rules, so the frame is genuinely what the game
// produces when the duel ends.

import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** Play `turns` whole turns of autopilot duelling (both sides). */
function autoplay(world, turns) {
  for (let i = 0; i < turns && !world.state.over; i += 1) {
    const side = world.state.active;
    for (const action of world.planTurn(side)) {
      world.applyAction(side, action);
      if (world.state.over) break;
    }
  }
}

/**
 * Set `world` to the named scene (title, play, win or loss; any other name is title)
 * and return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.startMatch();
  if (name !== 'play' && name !== 'win' && name !== 'loss') {
    autoplay(world, 6);
    return { screen: SCREEN_TITLE };
  }
  if (name === 'play') {
    autoplay(world, 8);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    autoplay(world, 6);
    if (world.state.over) world.startMatch();
    const boardDefs = world.state.player.board.map((card) => card.defId);
    boardDefs.push('ash-drake');
    world.stageScene({ aiLife: 2, playerBoard: boardDefs });
    const drake = world.state.player.board.findIndex((card) => card.defId === 'ash-drake');
    if (world.state.active !== 'player') world.endTurn('ai');
    world.attack('player', drake, 'face');
    return { screen: world.state.over ? SCREEN_WIN : SCREEN_PLAY };
  }
  // loss
  autoplay(world, 6);
  if (world.state.over) world.startMatch();
  const boardDefs = world.state.ai.board.map((card) => card.defId);
  boardDefs.push('ash-drake');
  world.stageScene({ playerLife: 2, aiBoard: boardDefs });
  if (world.state.active !== 'ai') world.endTurn('player');
  const drake = world.state.ai.board.findIndex((card) => card.defId === 'ash-drake');
  world.attack('ai', drake, 'face');
  return { screen: world.state.over ? SCREEN_LOSS : SCREEN_PLAY };
}
