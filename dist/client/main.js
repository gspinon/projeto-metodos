"use strict";
(() => {
  // src/client/game/SlotMachine.ts
  var SYMBOL_WEIGHTS = [
    { symbol: "espada", weight: 20 },
    { symbol: "vida", weight: 20 },
    { symbol: "carta", weight: 10 },
    { symbol: "retrigger", weight: 10 },
    { symbol: "jackpot", weight: 5 }
  ];
  var TOTAL_WEIGHT = SYMBOL_WEIGHTS.reduce((s, e) => s + e.weight, 0);
  var WIN_LINES = [
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]]
  ];
  var GUARANTEED_WIN_CHANCE = 0.5;
  function randomSymbol() {
    let roll = Math.random() * TOTAL_WEIGHT;
    for (const { symbol, weight } of SYMBOL_WEIGHTS) {
      roll -= weight;
      if (roll <= 0)
        return symbol;
    }
    return "espada";
  }
  function randomWinLine() {
    return WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)];
  }
  function spin() {
    const grid = [
      [randomSymbol(), randomSymbol(), randomSymbol()],
      [randomSymbol(), randomSymbol(), randomSymbol()],
      [randomSymbol(), randomSymbol(), randomSymbol()]
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

  // src/client/game/GameState.ts
  function createGame(playerNames) {
    const players = playerNames.map((name, id) => ({ id, name }));
    return { players, activePlayerIndex: 0 };
  }
  function getActivePlayer(state2) {
    return state2.players[state2.activePlayerIndex];
  }
  function advanceTurn(state2) {
    const next = (state2.activePlayerIndex + 1) % state2.players.length;
    return { ...state2, activePlayerIndex: next };
  }

  // src/client/game/WinDetector.ts
  var WIN_LINES2 = [
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]]
  ];
  var BASE_EFFECTS = {
    espada: 3,
    vida: 3,
    carta: 0,
    retrigger: 0,
    jackpot: 4
  };
  function detectWins(grid) {
    const wins = [];
    for (const cells of WIN_LINES2) {
      const symbols = cells.map(([r, c]) => grid[r][c]);
      const first = symbols[0];
      if (symbols.every((s) => s === first)) {
        wins.push({ symbol: first, cells });
      }
    }
    return wins;
  }
  function calculateEffects(winLines) {
    const counts = {};
    for (const line of winLines) {
      counts[line.symbol] = (counts[line.symbol] ?? 0) + 1;
    }
    const effects = [];
    for (const [symbol, connections] of Object.entries(counts)) {
      const base = BASE_EFFECTS[symbol];
      const value = base + (connections - 1);
      if (symbol === "espada") {
        effects.push({ type: "damage", value, connections });
      } else if (symbol === "vida") {
        effects.push({ type: "heal", value, connections });
      } else if (symbol === "carta") {
        effects.push({ type: "carta", value: 0, connections });
      } else if (symbol === "retrigger") {
        effects.push({ type: "retrigger", value: 0, connections });
      } else if (symbol === "jackpot") {
        effects.push({ type: "jackpot", value, connections });
      }
    }
    return effects;
  }

  // src/client/ui/Renderer.ts
  var SYMBOL_EMOJI = {
    espada: "\u2694\uFE0F",
    vida: "\u2764\uFE0F",
    carta: "\u{1F0CF}",
    retrigger: "\u{1F504}",
    jackpot: "\u{1F4B0}"
  };
  var REEL_RANDOM_COUNT = 22;
  var COL_STOP_MS = [900, 1200, 1500];
  var Renderer = class {
    constructor() {
      this.playerPanels = /* @__PURE__ */ new Map();
      this.phaseMsg = document.getElementById("phase-message");
      this.effectsLog = document.getElementById("effects-log");
      this.spinBtn = document.getElementById("spin-btn");
    }
    initPlayerPanels(players) {
      const activeIds = new Set(players.map((p) => p.id));
      for (let i = 0; i < 4; i++) {
        const panel = document.getElementById(`player-${i}`);
        if (!panel)
          continue;
        if (activeIds.has(i)) {
          panel.classList.remove("hidden");
          this.playerPanels.set(i, panel);
          const nameEl = panel.querySelector(".player-name");
          if (nameEl)
            nameEl.textContent = players.find((p) => p.id === i).name;
        } else {
          panel.classList.add("hidden");
        }
      }
    }
    updatePlayerPanels(state2) {
      for (const p of state2.players) {
        const panel = this.playerPanels.get(p.id);
        if (!panel)
          continue;
        panel.classList.toggle("active-player", p.id === state2.players[state2.activePlayerIndex].id);
      }
    }
    setPhaseMessage(msg) {
      this.phaseMsg.innerHTML = msg;
    }
    showSpinButton(onSpin, onBet) {
      this.spinBtn.onclick = () => {
        this.spinBtn.setAttribute("disabled", "true");
        onSpin();
      };
      this.spinBtn.removeAttribute("disabled");
      const betBtn = document.getElementById("bet-btn");
      betBtn.onclick = () => {
        betBtn.setAttribute("disabled", "true");
        onBet();
      };
      betBtn.removeAttribute("disabled");
      document.getElementById("spin-controls").classList.remove("hidden");
    }
    hideSpinButton() {
      document.getElementById("spin-controls").classList.add("hidden");
    }
    /** Static grid display (used for preview and between spins). */
    showGrid(grid, winLines = []) {
      this.clearWinHighlights();
      for (let c = 0; c < 3; c++) {
        const strip = document.getElementById(`strip-${c}`);
        strip.style.transition = "none";
        strip.style.transform = "translateY(0)";
        strip.innerHTML = grid.map((row) => row[c]).map((s) => `<div class="reel-cell">${SYMBOL_EMOJI[s]}</div>`).join("");
      }
      if (winLines.length > 0)
        this.highlightWins(winLines);
    }
    /** Reel animation: columns spin and stop sequentially left → right. */
    async animateSpin(finalGrid) {
      const stride = this.getStride();
      const total = REEL_RANDOM_COUNT + 3;
      this.clearWinHighlights();
      for (let c = 0; c < 3; c++) {
        const targetSymbols = finalGrid.map((row) => row[c]);
        const symbols = Array.from({ length: REEL_RANDOM_COUNT }, () => randomSymbol());
        symbols.push(...targetSymbols);
        const strip = document.getElementById(`strip-${c}`);
        strip.style.transition = "none";
        strip.style.transform = "translateY(0)";
        strip.innerHTML = symbols.map((s) => `<div class="reel-cell">${SYMBOL_EMOJI[s]}</div>`).join("");
        void strip.offsetHeight;
        document.getElementById(`reel-window-${c}`).classList.add("spinning");
      }
      await Promise.all(
        [0, 1, 2].map((c) => this.animateColumn(c, total, stride, COL_STOP_MS[c]))
      );
      const winLines = detectWins(finalGrid);
      const effects = calculateEffects(winLines);
      this.highlightWins(winLines);
      return { winLines, effects };
    }
    showEffectsLog(messages) {
      this.effectsLog.innerHTML = messages.length === 0 ? '<p class="no-effect">Nenhuma conex\xE3o!</p>' : messages.map((m) => `<p class="effect-line">${m}</p>`).join("");
      this.effectsLog.classList.remove("hidden");
    }
    clearEffectsLog() {
      this.effectsLog.innerHTML = "";
      this.effectsLog.classList.add("hidden");
    }
    // ─── private helpers ────────────────────────────────────────────────────
    async animateColumn(col, totalSymbols, stride, duration) {
      const strip = document.getElementById(`strip-${col}`);
      const reelWindow = document.getElementById(`reel-window-${col}`);
      const targetY = -((totalSymbols - 3) * stride);
      const p1Time = Math.round(duration * 0.72);
      const p1Y = targetY * 0.78;
      strip.style.transition = `transform ${p1Time}ms linear`;
      strip.style.transform = `translateY(${p1Y}px)`;
      await delay(p1Time);
      const p2Time = duration - p1Time;
      reelWindow.classList.remove("spinning");
      strip.style.transition = `transform ${p2Time}ms cubic-bezier(0.18, 0.8, 0.22, 1)`;
      strip.style.transform = `translateY(${targetY}px)`;
      await delay(p2Time);
      reelWindow.classList.add("bounce");
      reelWindow.addEventListener("animationend", () => reelWindow.classList.remove("bounce"), { once: true });
    }
    clearWinHighlights() {
      document.querySelectorAll(".reel-cell.winning-cell").forEach((el) => el.classList.remove("winning-cell"));
    }
    highlightWins(winLines) {
      const winCells = /* @__PURE__ */ new Set();
      for (const line of winLines) {
        for (const [r, c] of line.cells)
          winCells.add(`${r},${c}`);
      }
      winCells.forEach((key) => {
        const [r, c] = key.split(",").map(Number);
        const strip = document.getElementById(`strip-${c}`);
        const cells = strip.querySelectorAll(".reel-cell");
        const cell = cells[cells.length - 3 + r];
        cell?.classList.add("winning-cell");
      });
    }
    /** Read cell size from CSS variable so it stays in sync with breakpoints. */
    getStride() {
      const root = getComputedStyle(document.documentElement);
      const cellSize = parseInt(root.getPropertyValue("--cell-size").trim()) || 82;
      const gap = parseInt(root.getPropertyValue("--reel-gap").trim()) || 5;
      return cellSize + gap;
    }
  };
  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // src/client/ui/Modals.ts
  var overlay = document.getElementById("modal-overlay");
  var modalBox = document.getElementById("modal-box");
  function showModal(html) {
    modalBox.innerHTML = html;
    overlay.classList.remove("hidden");
  }
  function hideModal() {
    overlay.classList.add("hidden");
    modalBox.innerHTML = "";
  }
  function askTarget(players, excludeId, reason) {
    return new Promise((resolve) => {
      const targets = players.filter((p) => p.id !== excludeId);
      const buttons = targets.map(
        (p) => `<button class="modal-btn target-btn" data-id="${p.id}">${p.name}</button>`
      ).join("");
      showModal(`
      <h2 class="modal-title">\u{1F3AF} Escolha o alvo</h2>
      <p class="modal-desc">${reason}</p>
      <div class="modal-buttons">${buttons}</div>
    `);
      modalBox.querySelectorAll(".target-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          hideModal();
          resolve(Number(btn.dataset.id));
        });
      });
    });
  }
  function askJackpot(value) {
    return new Promise((resolve) => {
      showModal(`
      <h2 class="modal-title">\u{1F4B0} JACKPOT!</h2>
      <p class="modal-desc">Escolha seu pr\xEAmio:</p>
      <div class="modal-buttons">
        <button class="modal-btn heal-btn">\u2764\uFE0F Curar ${value} HP</button>
        <button class="modal-btn damage-btn">\u{1F480} ${value} dano imbloque\xE1vel</button>
      </div>
    `);
      modalBox.querySelector(".heal-btn").addEventListener("click", () => {
        hideModal();
        resolve("heal");
      });
      modalBox.querySelector(".damage-btn").addEventListener("click", () => {
        hideModal();
        resolve("damage");
      });
    });
  }
  function askRetrigger(effects, retriggersLeft) {
    return new Promise((resolve) => {
      const effectDesc = effects.length === 0 ? "Nenhuma conex\xE3o" : effects.map(describeEffect).join(", ");
      const respinDisabled = retriggersLeft <= 0 ? "disabled" : "";
      showModal(`
      <h2 class="modal-title">\u{1F504} Retrigger</h2>
      <p class="modal-desc">Resultado atual: <strong>${effectDesc}</strong></p>
      <p class="modal-desc">Giros restantes: <strong>${retriggersLeft}</strong></p>
      <div class="modal-buttons">
        <button class="modal-btn accept-btn">\u2705 Aceitar resultado</button>
        <button class="modal-btn respin-btn" ${respinDisabled}>\u{1F3B0} Girar novamente</button>
      </div>
    `);
      modalBox.querySelector(".accept-btn").addEventListener("click", () => {
        hideModal();
        resolve("accept");
      });
      if (!respinDisabled) {
        modalBox.querySelector(".respin-btn").addEventListener("click", () => {
          hideModal();
          resolve("respin");
        });
      }
    });
  }
  function askBetAmount(playerName) {
    return new Promise((resolve) => {
      showModal(`
      <h2 class="modal-title">\u{1F3B2} Apostar Vida</h2>
      <p class="modal-desc"><strong>${playerName}</strong>, quantas fichas quer apostar?</p>
      <p class="modal-desc">Cada ficha equivale a 1 giro na roleta.</p>
      <div class="bet-input-wrapper">
        <input type="number" id="bet-input" class="bet-input" min="1" max="20" value="1" />
      </div>
      <div class="modal-buttons">
        <button class="modal-btn confirm-bet-btn">\u2705 Confirmar Aposta</button>
      </div>
    `);
      const input = modalBox.querySelector("#bet-input");
      modalBox.querySelector(".confirm-bet-btn").addEventListener("click", () => {
        const val = Math.max(1, Math.min(20, parseInt(input.value) || 1));
        hideModal();
        resolve(val);
      });
    });
  }
  function askBetSpin(effects, spinsLeft) {
    return new Promise((resolve) => {
      const effectDesc = effects.length === 0 ? "Nenhuma conex\xE3o" : effects.map(describeEffect).join(", ");
      const respinDisabled = spinsLeft <= 0 ? "disabled" : "";
      const plural = spinsLeft !== 1 ? "s" : "";
      showModal(`
      <h2 class="modal-title">\u{1F3B2} Aposta de Vidas</h2>
      <p class="modal-desc">Resultado atual: <strong>${effectDesc}</strong></p>
      <p class="modal-desc">Fichas restantes: <strong>${spinsLeft}</strong></p>
      <div class="modal-buttons">
        <button class="modal-btn accept-btn">\u2705 Aceitar resultado</button>
        <button class="modal-btn respin-btn" ${respinDisabled}>\u{1F3B0} Usar ficha (${spinsLeft} restante${plural})</button>
      </div>
    `);
      modalBox.querySelector(".accept-btn").addEventListener("click", () => {
        hideModal();
        resolve("accept");
      });
      if (!respinDisabled) {
        modalBox.querySelector(".respin-btn").addEventListener("click", () => {
          hideModal();
          resolve("respin");
        });
      }
    });
  }
  function showCarta(count) {
    return new Promise((resolve) => {
      const cards = Array.from({ length: count }, () => `<div class="card-back">?</div>`).join("");
      const plural = count > 1;
      showModal(`
      <h2 class="modal-title">\u{1F0CF} ${plural ? `${count} Cartas Sacadas!` : "Carta Sacada!"}</h2>
      <p class="modal-desc">Saque <strong>${count}</strong> carta${plural ? "s" : ""} do seu baralho.</p>
      <div class="card-placeholder cards-row">${cards}</div>
      <div class="modal-buttons">
        <button class="modal-btn ok-btn">OK</button>
      </div>
    `);
      modalBox.querySelector(".ok-btn").addEventListener("click", () => {
        hideModal();
        resolve();
      });
    });
  }
  function describeEffect(e) {
    switch (e.type) {
      case "damage":
        return `\u2694\uFE0F ${e.value} de dano`;
      case "heal":
        return `\u2764\uFE0F ${e.value} de cura`;
      case "carta":
        return "\u{1F0CF} Saque uma carta";
      case "retrigger":
        return "\u{1F504} Retrigger";
      case "jackpot":
        return `\u{1F4B0} Jackpot (${e.value})`;
      default:
        return "";
    }
  }

  // src/client/main.ts
  var state;
  var renderer = new Renderer();
  function init() {
    const countBtns = document.querySelectorAll(".count-btn");
    const form = document.getElementById("setup-form");
    countBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const count = parseInt(btn.dataset.count);
        countBtns.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        document.querySelector(".player-field-3").classList.toggle("hidden", count < 3);
        document.querySelector(".player-field-4").classList.toggle("hidden", count < 4);
        form.classList.remove("hidden");
      });
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const visibleFields = Array.from(document.querySelectorAll(".setup-field")).filter((f) => !f.classList.contains("hidden"));
      const inputs = visibleFields.map((f) => f.querySelector(".name-input"));
      const names = inputs.map((el, i) => el.value.trim() || `Jogador ${i + 1}`);
      document.getElementById("setup-screen").classList.add("hidden");
      document.getElementById("game").classList.remove("hidden");
      state = createGame(names);
      renderer.initPlayerPanels(state.players);
      renderer.updatePlayerPanels(state);
      renderer.showGrid([
        ["espada", "vida", "carta"],
        ["retrigger", "jackpot", "espada"],
        ["vida", "carta", "retrigger"]
      ]);
      startTurn();
    });
  }
  function startTurn() {
    renderer.clearEffectsLog();
    renderer.updatePlayerPanels(state);
    renderer.setPhaseMessage(`\u{1F3B0} Vez de <strong>${getActivePlayer(state).name}</strong>`);
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
  async function runSpin() {
    renderer.setPhaseMessage(`\u{1F3B0} Girando...`);
    const finalGrid = spin();
    const { winLines, effects } = await renderer.animateSpin(finalGrid);
    await delay2(winLines.length > 0 ? 800 : 400);
    const hasRetrigger = effects.some((e) => e.type === "retrigger");
    const nonRetriggerEffects = effects.filter((e) => e.type !== "retrigger");
    const finalEffects = hasRetrigger ? await handleRetrigger(nonRetriggerEffects) : nonRetriggerEffects;
    await resolveEffects(finalEffects);
  }
  async function handleRetrigger(initialEffects) {
    let currentEffects = initialEffects;
    let retriggersLeft = 3;
    while (true) {
      const choice = await askRetrigger(currentEffects, retriggersLeft);
      if (choice === "accept" || retriggersLeft <= 0)
        break;
      retriggersLeft--;
      renderer.setPhaseMessage(`\u{1F504} Retrigger \u2014 re-girando...`);
      const newGrid = spin();
      const { winLines, effects } = await renderer.animateSpin(newGrid);
      await delay2(winLines.length > 0 ? 800 : 400);
      currentEffects = effects.filter((e) => e.type !== "retrigger");
    }
    return currentEffects;
  }
  async function runBetSpins() {
    const activePlayer = getActivePlayer(state);
    const betAmount = await askBetAmount(activePlayer.name);
    let spinsLeft = betAmount;
    renderer.setPhaseMessage(`\u{1F3B2} Aposta: ${spinsLeft} giro(s) \u2014 girando...`);
    const firstGrid = spin();
    const { winLines: firstLines, effects: firstEffects } = await renderer.animateSpin(firstGrid);
    await delay2(firstLines.length > 0 ? 800 : 400);
    spinsLeft--;
    let currentEffects = firstEffects.filter((e) => e.type !== "retrigger");
    while (spinsLeft > 0) {
      const choice = await askBetSpin(currentEffects, spinsLeft);
      if (choice === "accept")
        break;
      renderer.setPhaseMessage(`\u{1F3B2} Aposta: ${spinsLeft} giro(s) restante(s) \u2014 girando...`);
      const newGrid = spin();
      const { winLines, effects } = await renderer.animateSpin(newGrid);
      await delay2(winLines.length > 0 ? 800 : 400);
      spinsLeft--;
      currentEffects = effects.filter((e) => e.type !== "retrigger");
    }
    await resolveEffects(currentEffects);
  }
  async function resolveEffects(effects) {
    const activePlayer = getActivePlayer(state);
    const logMessages = [];
    const cartaEffect = effects.find((e) => e.type === "carta");
    if (cartaEffect) {
      await showCarta(cartaEffect.connections);
      logMessages.push(`\u{1F0CF} ${cartaEffect.connections} carta${cartaEffect.connections > 1 ? "s" : ""} sacada${cartaEffect.connections > 1 ? "s" : ""}!`);
    }
    const jackpotEffect = effects.find((e) => e.type === "jackpot");
    if (jackpotEffect) {
      const choice = await askJackpot(jackpotEffect.value);
      if (choice === "heal") {
        logMessages.push(`\u{1F4B0} Jackpot: ${activePlayer.name} cura ${jackpotEffect.value} HP!`);
      } else {
        const targetId = await askTarget(state.players, activePlayer.id, `\u{1F4B0} Jackpot: ${jackpotEffect.value} dano imbloque\xE1vel para quem?`);
        const target = state.players.find((p) => p.id === targetId);
        logMessages.push(`\u{1F4B0} Jackpot: ${jackpotEffect.value} dano imbloque\xE1vel em ${target.name}!`);
      }
    }
    const healEffect = effects.find((e) => e.type === "heal");
    if (healEffect) {
      logMessages.push(`\u2764\uFE0F ${activePlayer.name} cura ${healEffect.value} HP!`);
    }
    const damageEffect = effects.find((e) => e.type === "damage");
    if (damageEffect) {
      const targetId = await askTarget(state.players, activePlayer.id, `\u2694\uFE0F ${damageEffect.value} de dano \u2014 escolha o alvo:`);
      const target = state.players.find((p) => p.id === targetId);
      logMessages.push(`\u2694\uFE0F ${damageEffect.value} de dano em ${target.name}!`);
    }
    renderer.showEffectsLog(logMessages);
    await delay2(1400);
    state = advanceTurn(state);
    startTurn();
  }
  function delay2(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  window.addEventListener("DOMContentLoaded", init);
})();
//# sourceMappingURL=main.js.map
