import { GameState, Player } from '../../shared/types';

export function createGame(playerNames: string[]): GameState {
  const players: Player[] = playerNames.map((name, id) => ({ id, name }));
  return { players, activePlayerIndex: 0 };
}

export function getActivePlayer(state: GameState): Player {
  return state.players[state.activePlayerIndex];
}

export function advanceTurn(state: GameState): GameState {
  const next = (state.activePlayerIndex + 1) % state.players.length;
  return { ...state, activePlayerIndex: next };
}
