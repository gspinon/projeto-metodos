import { SlotSymbol, Grid } from '../../shared/types';

// Probabilidade de cada símbolo por célula (quando gerado aleatoriamente)
const SYMBOL_WEIGHTS: { symbol: SlotSymbol; weight: number }[] = [
  { symbol: 'espada',    weight: 27 },
  { symbol: 'vida',      weight: 33 },
  { symbol: 'carta',     weight: 20 },
  { symbol: 'retrigger', weight: 13 },
  { symbol: 'jackpot',   weight:  7 },
];

const TOTAL_WEIGHT = SYMBOL_WEIGHTS.reduce((s, e) => s + e.weight, 0);

const WIN_LINES: [number, number][][] = [
  [[0,0],[0,1],[0,2]],
  [[1,0],[1,1],[1,2]],
  [[2,0],[2,1],[2,2]],
  [[0,0],[1,1],[2,2]],
  [[0,2],[1,1],[2,0]],
];

// 70% de chance de garantir pelo menos uma conexão por giro
const GUARANTEED_WIN_CHANCE = 0.70;

export function randomSymbol(): SlotSymbol {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const { symbol, weight } of SYMBOL_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return symbol;
  }
  return 'espada';
}

function randomWinLine(): [number, number][] {
  return WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)];
}

export function spin(): Grid {
  const grid: SlotSymbol[][] = [
    [randomSymbol(), randomSymbol(), randomSymbol()],
    [randomSymbol(), randomSymbol(), randomSymbol()],
    [randomSymbol(), randomSymbol(), randomSymbol()],
  ];

  if (Math.random() < GUARANTEED_WIN_CHANCE) {
    const line = randomWinLine();
    const symbol = randomSymbol();
    for (const [r, c] of line) {
      grid[r][c] = symbol;
    }
  }

  return grid;
}
