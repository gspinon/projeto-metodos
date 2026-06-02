import { Grid, WinLine, Effect, SlotSymbol } from '../../shared/types';

const WIN_LINES: [number, number][][] = [
  [[0,0],[0,1],[0,2]],
  [[1,0],[1,1],[1,2]],
  [[2,0],[2,1],[2,2]],
  [[0,0],[1,1],[2,2]],
  [[0,2],[1,1],[2,0]],
];

const BASE_EFFECTS: Record<Exclude<SlotSymbol, 'blank'>, number> = {
  espada:    3,
  vida:      3,
  carta:     0,
  retrigger: 0,
  jackpot:   4,
};

export function detectWins(grid: Grid): WinLine[] {
  const wins: WinLine[] = [];
  for (const cells of WIN_LINES) {
    const symbols = cells.map(([r, c]) => grid[r][c]);
    const first = symbols[0];
    if (symbols.every(s => s === first)) {
      wins.push({ symbol: first, cells: cells as [number, number][] });
    }
  }
  return wins;
}

export function calculateEffects(winLines: WinLine[]): Effect[] {
  const counts: Partial<Record<SlotSymbol, number>> = {};
  for (const line of winLines) {
    counts[line.symbol] = (counts[line.symbol] ?? 0) + 1;
  }

  const effects: Effect[] = [];
  for (const [symbol, connections] of Object.entries(counts) as [SlotSymbol, number][]) {
    const base = BASE_EFFECTS[symbol as Exclude<SlotSymbol, 'blank'>];
    const value = base + (connections - 1);

    if (symbol === 'espada') {
      effects.push({ type: 'damage', value, connections });
    } else if (symbol === 'vida') {
      effects.push({ type: 'heal', value, connections });
    } else if (symbol === 'carta') {
      effects.push({ type: 'carta', value: 0, connections });
    } else if (symbol === 'retrigger') {
      effects.push({ type: 'retrigger', value: 0, connections });
    } else if (symbol === 'jackpot') {
      effects.push({ type: 'jackpot', value, connections });
    }
  }
  return effects;
}
