import { GameState, Effect } from '../shared/types';
import { spin } from './game/SlotMachine';
import { calculateEffects } from './game/WinDetector';
import { createGame, getActivePlayer, advanceTurn } from './game/GameState';
import { Renderer } from './ui/Renderer';
import * as Modals from './ui/Modals';

let state: GameState;
const renderer = new Renderer();

function init(): void {
  const countBtns = document.querySelectorAll<HTMLButtonElement>('.count-btn');
  const form = document.getElementById('setup-form') as HTMLFormElement;

  countBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const count = parseInt(btn.dataset.count!);
      countBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      document.querySelector('.player-field-3')!.classList.toggle('hidden', count < 3);
      document.querySelector('.player-field-4')!.classList.toggle('hidden', count < 4);

      form.classList.remove('hidden');
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const visibleFields = Array.from(document.querySelectorAll<HTMLElement>('.setup-field')).filter(f => !f.classList.contains('hidden'));
    const inputs = visibleFields.map(f => f.querySelector<HTMLInputElement>('.name-input')!);
    const names = inputs.map((el, i) => el.value.trim() || `Jogador ${i + 1}`);

    document.getElementById('setup-screen')!.classList.add('hidden');
    document.getElementById('game')!.classList.remove('hidden');

    state = createGame(names);
    renderer.initPlayerPanels(state.players);
    renderer.updatePlayerPanels(state);
    renderer.showGrid([
      ['espada', 'vida', 'carta'],
      ['retrigger', 'jackpot', 'espada'],
      ['vida', 'carta', 'retrigger'],
    ]);
    startTurn();
  });
}

function startTurn(): void {
  renderer.clearEffectsLog();
  renderer.updatePlayerPanels(state);
  renderer.setPhaseMessage(`🎰 Vez de <strong>${getActivePlayer(state).name}</strong>`);

  renderer.showSpinButton(
    async () => {
      renderer.hideSpinButton();
      await runSpin();
    },
    async () => {
      renderer.hideSpinButton();
      await runBetSpins();
    }
  );
}

async function runSpin(): Promise<void> {
  renderer.setPhaseMessage(`🎰 Girando...`);

  const finalGrid = spin();
  const { winLines, effects } = await renderer.animateSpin(finalGrid);

  await delay(winLines.length > 0 ? 800 : 400);

  const hasRetrigger = effects.some(e => e.type === 'retrigger');
  const nonRetriggerEffects = effects.filter(e => e.type !== 'retrigger');

  const finalEffects = hasRetrigger
    ? await handleRetrigger(nonRetriggerEffects)
    : nonRetriggerEffects;

  await resolveEffects(finalEffects);
}

async function handleRetrigger(initialEffects: Effect[]): Promise<Effect[]> {
  let currentEffects = initialEffects;
  let retriggersLeft = 3;

  while (true) {
    const choice = await Modals.askRetrigger(currentEffects, retriggersLeft);
    if (choice === 'accept' || retriggersLeft <= 0) break;

    retriggersLeft--;
    renderer.setPhaseMessage(`🔄 Retrigger — re-girando...`);
    const newGrid = spin();
    const { winLines, effects } = await renderer.animateSpin(newGrid);
    await delay(winLines.length > 0 ? 800 : 400);
    currentEffects = effects.filter(e => e.type !== 'retrigger');
  }

  return currentEffects;
}

async function runBetSpins(): Promise<void> {
  const activePlayer = getActivePlayer(state);
  const betAmount = await Modals.askBetAmount(activePlayer.name);

  let spinsLeft = betAmount;

  renderer.setPhaseMessage(`🎲 Aposta: ${spinsLeft} giro(s) — girando...`);
  const firstGrid = spin();
  const { winLines: firstLines, effects: firstEffects } = await renderer.animateSpin(firstGrid);
  await delay(firstLines.length > 0 ? 800 : 400);
  spinsLeft--;
  let currentEffects = firstEffects.filter(e => e.type !== 'retrigger');

  while (spinsLeft > 0) {
    const choice = await Modals.askBetSpin(currentEffects, spinsLeft);
    if (choice === 'accept') break;

    renderer.setPhaseMessage(`🎲 Aposta: ${spinsLeft} giro(s) restante(s) — girando...`);
    const newGrid = spin();
    const { winLines, effects } = await renderer.animateSpin(newGrid);
    await delay(winLines.length > 0 ? 800 : 400);
    spinsLeft--;
    currentEffects = effects.filter(e => e.type !== 'retrigger');
  }

  await resolveEffects(currentEffects);
}

async function resolveEffects(effects: Effect[]): Promise<void> {
  const activePlayer = getActivePlayer(state);
  const logMessages: string[] = [];

  const cartaEffect = effects.find(e => e.type === 'carta');
  if (cartaEffect) {
    await Modals.showCarta(cartaEffect.connections);
    logMessages.push(`🃏 ${cartaEffect.connections} carta${cartaEffect.connections > 1 ? 's' : ''} sacada${cartaEffect.connections > 1 ? 's' : ''}!`);
  }

  const jackpotEffect = effects.find(e => e.type === 'jackpot');
  if (jackpotEffect) {
    const choice = await Modals.askJackpot(jackpotEffect.value);
    if (choice === 'heal') {
      logMessages.push(`💰 Jackpot: ${activePlayer.name} cura ${jackpotEffect.value} HP!`);
    } else {
      const targetId = await Modals.askTarget(state.players, activePlayer.id, `💰 Jackpot: ${jackpotEffect.value} dano imbloqueável para quem?`);
      const target = state.players.find(p => p.id === targetId)!;
      logMessages.push(`💰 Jackpot: ${jackpotEffect.value} dano imbloqueável em ${target.name}!`);
    }
  }

  const healEffect = effects.find(e => e.type === 'heal');
  if (healEffect) {
    logMessages.push(`❤️ ${activePlayer.name} cura ${healEffect.value} HP!`);
  }

  const damageEffect = effects.find(e => e.type === 'damage');
  if (damageEffect) {
    const targetId = await Modals.askTarget(state.players, activePlayer.id, `⚔️ ${damageEffect.value} de dano — escolha o alvo:`);
    const target = state.players.find(p => p.id === targetId)!;
    logMessages.push(`⚔️ ${damageEffect.value} de dano em ${target.name}!`);
  }

  renderer.showEffectsLog(logMessages);

  await delay(1400);
  state = advanceTurn(state);
  startTurn();
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

window.addEventListener('DOMContentLoaded', init);
