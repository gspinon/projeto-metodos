export type SlotSymbol = 'espada' | 'vida' | 'carta' | 'retrigger' | 'jackpot';

export type Grid = SlotSymbol[][];

export interface WinLine {
  symbol: SlotSymbol;
  cells: [number, number][];
}

export type EffectType = 'damage' | 'heal' | 'carta' | 'retrigger' | 'jackpot';

export interface Effect {
  type: EffectType;
  value: number;
  connections: number;
}

export interface Player {
  id: number;
  name: string;
}

export interface GameState {
  players: Player[];
  activePlayerIndex: number;
}
