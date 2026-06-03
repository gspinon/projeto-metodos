import { GameState, Grid, SlotSymbol, WinLine, Effect } from '../../shared/types';
import { randomSymbol } from '../game/SlotMachine';
import { detectWins, calculateEffects } from '../game/WinDetector';

const SYMBOL_EMOJI: Record<SlotSymbol, string> = {
  espada:    '⚔️',
  vida:      '❤️',
  carta:     '🃏',
  retrigger: '🔄',
  jackpot:   '💰',
};

// How many random symbols scroll past before the target appears
const REEL_RANDOM_COUNT = 22;

// Column stop times in ms (left stops first)
const COL_STOP_MS = [900, 1200, 1500];

export class Renderer {
  private playerPanels: Map<number, HTMLElement> = new Map();
  private phaseMsg: HTMLElement;
  private effectsLog: HTMLElement;
  private spinBtn: HTMLElement;

  constructor() {
    this.phaseMsg   = document.getElementById('phase-message')!;
    this.effectsLog = document.getElementById('effects-log')!;
    this.spinBtn    = document.getElementById('spin-btn')!;
  }

  initPlayerPanels(players: GameState['players']): void {
    const activeIds = new Set(players.map(p => p.id));
    for (let i = 0; i < 4; i++) {
      const panel = document.getElementById(`player-${i}`);
      if (!panel) continue;
      if (activeIds.has(i)) {
        panel.classList.remove('hidden');
        this.playerPanels.set(i, panel);
        const nameEl = panel.querySelector('.player-name');
        if (nameEl) nameEl.textContent = players.find(p => p.id === i)!.name;
      } else {
        panel.classList.add('hidden');
      }
    }
  }

  updatePlayerPanels(state: GameState): void {
    for (const p of state.players) {
      const panel = this.playerPanels.get(p.id);
      if (!panel) continue;
      panel.classList.toggle('active-player', p.id === state.players[state.activePlayerIndex].id);
    }
  }

  setPhaseMessage(msg: string): void {
    this.phaseMsg.innerHTML = msg;
  }

  showSpinButton(onSpin: () => void, onBet: () => void, onSkip: () => void): void {
    this.spinBtn.onclick = () => {
      this.spinBtn.setAttribute('disabled', 'true');
      onSpin();
    };
    this.spinBtn.removeAttribute('disabled');

    const betBtn = document.getElementById('bet-btn') as HTMLButtonElement;
    betBtn.onclick = () => {
      betBtn.setAttribute('disabled', 'true');
      onBet();
    };
    betBtn.removeAttribute('disabled');

    const skipBtn = document.getElementById('skip-btn') as HTMLButtonElement;
    skipBtn.onclick = () => {
      skipBtn.setAttribute('disabled', 'true');
      onSkip();
    };
    skipBtn.removeAttribute('disabled');

    document.getElementById('spin-controls')!.classList.remove('hidden');
  }

  hideSpinButton(): void {
    document.getElementById('spin-controls')!.classList.add('hidden');
  }

  /** Static grid display (used for preview and between spins). */
  showGrid(grid: Grid, winLines: WinLine[] = []): void {
    this.clearWinHighlights();
    for (let c = 0; c < 3; c++) {
      const strip = document.getElementById(`strip-${c}`)!;
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      strip.innerHTML = grid.map(row => row[c])
        .map(s => `<div class="reel-cell">${SYMBOL_EMOJI[s]}</div>`)
        .join('');
    }
    if (winLines.length > 0) this.highlightWins(winLines);
  }

  /** Reel animation: columns spin and stop sequentially left → right. */
  async animateSpin(finalGrid: Grid): Promise<{ winLines: WinLine[]; effects: Effect[] }> {
    const stride = this.getStride();
    const total = REEL_RANDOM_COUNT + 3; // random symbols + 3 target

    this.clearWinHighlights();

    // Build strips and enable blur on all columns before starting
    for (let c = 0; c < 3; c++) {
      const targetSymbols = finalGrid.map(row => row[c]);
      const symbols: SlotSymbol[] = Array.from({ length: REEL_RANDOM_COUNT }, () => randomSymbol());
      symbols.push(...targetSymbols);

      const strip = document.getElementById(`strip-${c}`)!;
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      strip.innerHTML = symbols
        .map(s => `<div class="reel-cell">${SYMBOL_EMOJI[s]}</div>`)
        .join('');

      void strip.offsetHeight; // force reflow before animating
      document.getElementById(`reel-window-${c}`)!.classList.add('spinning');
    }

    // All columns start simultaneously; each stops at its own time
    await Promise.all(
      [0, 1, 2].map(c => this.animateColumn(c, total, stride, COL_STOP_MS[c]))
    );

    const winLines = detectWins(finalGrid);
    const effects = calculateEffects(winLines);
    this.highlightWins(winLines);
    return { winLines, effects };
  }

  showEffectsLog(messages: string[]): void {
    this.effectsLog.innerHTML = messages.length === 0
      ? '<p class="no-effect">Nenhuma conexão!</p>'
      : messages.map(m => `<p class="effect-line">${m}</p>`).join('');
    this.effectsLog.classList.remove('hidden');
  }

  clearEffectsLog(): void {
    this.effectsLog.innerHTML = '';
    this.effectsLog.classList.add('hidden');
  }

  // ─── private helpers ────────────────────────────────────────────────────

  private async animateColumn(
    col: number,
    totalSymbols: number,
    stride: number,
    duration: number
  ): Promise<void> {
    const strip = document.getElementById(`strip-${col}`)!;
    const reelWindow = document.getElementById(`reel-window-${col}`)!;

    // Target Y: scroll up until the last 3 symbols are visible
    const targetY = -((totalSymbols - 3) * stride);

    // Phase 1 — fast linear (covers 78 % of distance in 72 % of time)
    const p1Time = Math.round(duration * 0.72);
    const p1Y    = targetY * 0.78;

    strip.style.transition = `transform ${p1Time}ms linear`;
    strip.style.transform   = `translateY(${p1Y}px)`;

    await delay(p1Time);

    // Phase 2 — ease-out deceleration (remaining 28 % of time)
    const p2Time = duration - p1Time;

    reelWindow.classList.remove('spinning'); // remove blur as reel slows
    strip.style.transition = `transform ${p2Time}ms cubic-bezier(0.18, 0.8, 0.22, 1)`;
    strip.style.transform   = `translateY(${targetY}px)`;

    await delay(p2Time);

    // Brief bounce to simulate mechanical stop
    reelWindow.classList.add('bounce');
    reelWindow.addEventListener('animationend', () => reelWindow.classList.remove('bounce'), { once: true });
  }

  private clearWinHighlights(): void {
    document.querySelectorAll('.reel-cell.winning-cell')
      .forEach(el => el.classList.remove('winning-cell'));
  }

  private highlightWins(winLines: WinLine[]): void {
    const winCells = new Set<string>();
    for (const line of winLines) {
      for (const [r, c] of line.cells) winCells.add(`${r},${c}`);
    }
    winCells.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      const strip = document.getElementById(`strip-${c}`)!;
      const cells = strip.querySelectorAll('.reel-cell');
      // After animation the last 3 cells are the visible ones
      const cell = cells[cells.length - 3 + r] as HTMLElement | undefined;
      cell?.classList.add('winning-cell');
    });
  }

  /** Read cell size from CSS variable so it stays in sync with breakpoints. */
  private getStride(): number {
    const root     = getComputedStyle(document.documentElement);
    const cellSize = parseInt(root.getPropertyValue('--cell-size').trim()) || 82;
    const gap      = parseInt(root.getPropertyValue('--reel-gap').trim())  || 5;
    return cellSize + gap;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
