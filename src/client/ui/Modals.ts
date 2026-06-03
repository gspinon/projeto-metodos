import { Player, Effect } from '../../shared/types';

const overlay = document.getElementById('modal-overlay') as HTMLElement;
const modalBox = document.getElementById('modal-box') as HTMLElement;

function showModal(html: string): void {
  modalBox.innerHTML = html;
  overlay.classList.remove('hidden');
}

function hideModal(): void {
  overlay.classList.add('hidden');
  modalBox.innerHTML = '';
}

export function askTarget(players: Player[], excludeId: number, reason: string): Promise<number> {
  return new Promise(resolve => {
    const targets = players.filter(p => p.id !== excludeId);
    const buttons = targets.map(p =>
      `<button class="modal-btn target-btn" data-id="${p.id}">${p.name}</button>`
    ).join('');

    showModal(`
      <h2 class="modal-title">🎯 Escolha o alvo</h2>
      <p class="modal-desc">${reason}</p>
      <div class="modal-buttons">${buttons}</div>
    `);

    modalBox.querySelectorAll('.target-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        hideModal();
        resolve(Number((btn as HTMLElement).dataset.id));
      });
    });
  });
}

export function askJackpot(value: number): Promise<'heal' | 'damage'> {
  return new Promise(resolve => {
    showModal(`
      <h2 class="modal-title">💰 JACKPOT!</h2>
      <p class="modal-desc">Escolha seu prêmio:</p>
      <div class="modal-buttons">
        <button class="modal-btn heal-btn">❤️ Curar ${value} HP</button>
        <button class="modal-btn damage-btn">💀 ${value} dano imbloqueável</button>
      </div>
    `);

    modalBox.querySelector('.heal-btn')!.addEventListener('click', () => { hideModal(); resolve('heal'); });
    modalBox.querySelector('.damage-btn')!.addEventListener('click', () => { hideModal(); resolve('damage'); });
  });
}

export function askRetrigger(effects: Effect[], retriggersLeft: number): Promise<'accept' | 'respin'> {
  return new Promise(resolve => {
    const effectDesc = effects.length === 0
      ? 'Nenhuma conexão'
      : effects.map(describeEffect).join(', ');

    const respinDisabled = retriggersLeft <= 0 ? 'disabled' : '';

    showModal(`
      <h2 class="modal-title">🔄 Retrigger</h2>
      <p class="modal-desc">Resultado atual: <strong>${effectDesc}</strong></p>
      <p class="modal-desc">Giros restantes: <strong>${retriggersLeft}</strong></p>
      <div class="modal-buttons">
        <button class="modal-btn accept-btn">✅ Aceitar resultado</button>
        <button class="modal-btn respin-btn" ${respinDisabled}>🎰 Girar novamente</button>
      </div>
    `);

    modalBox.querySelector('.accept-btn')!.addEventListener('click', () => { hideModal(); resolve('accept'); });
    if (!respinDisabled) {
      modalBox.querySelector('.respin-btn')!.addEventListener('click', () => { hideModal(); resolve('respin'); });
    }
  });
}

export function askBetAmount(playerName: string): Promise<number> {
  return new Promise(resolve => {
    showModal(`
      <h2 class="modal-title">🎲 Apostar Vida</h2>
      <p class="modal-desc"><strong>${playerName}</strong>, quantas fichas quer apostar?</p>
      <p class="modal-desc">Cada ficha equivale a 1 giro na roleta.</p>
      <div class="bet-input-wrapper">
        <input type="number" id="bet-input" class="bet-input" min="1" max="20" value="1" />
      </div>
      <div class="modal-buttons">
        <button class="modal-btn confirm-bet-btn">✅ Confirmar Aposta</button>
      </div>
    `);

    const input = modalBox.querySelector<HTMLInputElement>('#bet-input')!;
    modalBox.querySelector('.confirm-bet-btn')!.addEventListener('click', () => {
      const val = Math.max(1, Math.min(20, parseInt(input.value) || 1));
      hideModal();
      resolve(val);
    });
  });
}

export function askBetSpin(effects: Effect[], spinsLeft: number): Promise<'accept' | 'respin'> {
  return new Promise(resolve => {
    const effectDesc = effects.length === 0
      ? 'Nenhuma conexão'
      : effects.map(describeEffect).join(', ');

    const respinDisabled = spinsLeft <= 0 ? 'disabled' : '';
    const plural = spinsLeft !== 1 ? 's' : '';

    showModal(`
      <h2 class="modal-title">🎲 Aposta de Vidas</h2>
      <p class="modal-desc">Resultado atual: <strong>${effectDesc}</strong></p>
      <p class="modal-desc">Fichas restantes: <strong>${spinsLeft}</strong></p>
      <div class="modal-buttons">
        <button class="modal-btn accept-btn">✅ Aceitar resultado</button>
        <button class="modal-btn respin-btn" ${respinDisabled}>🎰 Usar ficha (${spinsLeft} restante${plural})</button>
      </div>
    `);

    modalBox.querySelector('.accept-btn')!.addEventListener('click', () => { hideModal(); resolve('accept'); });
    if (!respinDisabled) {
      modalBox.querySelector('.respin-btn')!.addEventListener('click', () => { hideModal(); resolve('respin'); });
    }
  });
}

export function showCarta(count: number): Promise<void> {
  return new Promise(resolve => {
    const cards = Array.from({ length: count }, () => `<div class="card-back">?</div>`).join('');
    const plural = count > 1;
    showModal(`
      <h2 class="modal-title">🃏 ${plural ? `${count} Cartas Sacadas!` : 'Carta Sacada!'}</h2>
      <p class="modal-desc">Saque <strong>${count}</strong> carta${plural ? 's' : ''} do seu baralho.</p>
      <div class="card-placeholder cards-row">${cards}</div>
      <div class="modal-buttons">
        <button class="modal-btn ok-btn">OK</button>
      </div>
    `);
    modalBox.querySelector('.ok-btn')!.addEventListener('click', () => { hideModal(); resolve(); });
  });
}

function describeEffect(e: Effect): string {
  switch (e.type) {
    case 'damage':    return `⚔️ ${e.value} de dano`;
    case 'heal':      return `❤️ ${e.value} de cura`;
    case 'carta':     return '🃏 Saque uma carta';
    case 'retrigger': return '🔄 Retrigger';
    case 'jackpot':   return `💰 Jackpot (${e.value})`;
    default:          return '';
  }
}
