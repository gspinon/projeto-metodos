# Caça-Níqueis — Documentação

Máquina de caça-níqueis 3×3 para **4 jogadores locais** (mesma tela, turnos alternados), construída em **TypeScript + Node.js**. Os efeitos são informativos — dano, cura e cartas são exibidos para os jogadores rastrearem externamente (ex: em um RPG de mesa).

---

## Sumário

1. [Como rodar](#como-rodar)
2. [Regras do jogo](#regras-do-jogo)
3. [Símbolos e probabilidades](#símbolos-e-probabilidades)
4. [Linhas vencedoras](#linhas-vencedoras)
5. [Efeitos e fórmulas](#efeitos-e-fórmulas)
6. [Arquitetura](#arquitetura)
7. [Estrutura de arquivos](#estrutura-de-arquivos)
8. [Referência dos módulos](#referência-dos-módulos)
9. [Personalização](#personalização)

---

## Como rodar

### Pré-requisitos
- Node.js 18+
- npm

### Desenvolvimento (hot reload)

```bash
npm install
npm run dev
```

Abre em **http://localhost:3000**. Qualquer alteração em `src/client/` é rebundlada automaticamente. Alterações em `src/server/` reiniciam o servidor automaticamente.

### Produção

```bash
npm run build
npm start
```

### Scripts disponíveis

| Script | O que faz |
|--------|-----------|
| `npm run dev` | Copia assets, inicia Express (tsx watch) + esbuild watch |
| `npm run build` | Copia assets, empacota cliente (minificado), compila servidor (tsc) |
| `npm start` | Serve `dist/server/index.js` |
| `npm run prepare-dist` | Copia `index.html` e `style.css` para `dist/client/` |

---

## Regras do jogo

### Início

Na tela de configuração, cada um dos 4 jogadores digita seu nome (ou usa o padrão "Jogador N"). O jogo começa logo após confirmar.

### Fluxo de turno

```
Vez do Jogador → [GIRAR] → Animação das bobinas →
  Detectar conexões → Resolver efeitos → Próximo jogador
```

Cada jogador tem **1 giro por turno**, gratuito. Os turnos se alternam em ordem circular infinita.

### Fim de jogo

Não há condição de vitória automática — os jogadores gerenciam pontuação/HP externamente. Clique em **Jogar Novamente** a qualquer momento para reiniciar.

---

## Símbolos e probabilidades

Cada uma das 9 células é gerada independentemente com os pesos abaixo. **70% dos giros** garantem pelo menos uma conexão: o algoritmo força os 3 símbolos de uma linha aleatória a serem iguais antes de exibir o grid final.

| Símbolo | Emoji | Peso | Probabilidade |
|---------|-------|------|---------------|
| Espada | ⚔️ | 27 | 27% |
| Vida | ❤️ | 33 | 33% |
| Carta | 🃏 | 20 | 20% |
| Retrigger | 🔄 | 13 | 13% |
| Jackpot | 💰 | 7 | 7% |

> Para ajustar as probabilidades, edite `SYMBOL_WEIGHTS` em `src/client/game/SlotMachine.ts`.  
> Para ajustar a frequência de conexões, edite `GUARANTEED_WIN_CHANCE` no mesmo arquivo.

---

## Linhas vencedoras

O grid 3×3 tem **5 linhas possíveis** — 3 horizontais e 2 diagonais. Não há linhas verticais.

```
Linha 0 →  [ ■ ■ ■ ]        Diagonal 1 →  [ ■ · · ]
           [ · · · ]                       [ · ■ · ]
           [ · · · ]                       [ · · ■ ]

Linha 1 →  [ · · · ]        Diagonal 2 →  [ · · ■ ]
           [ ■ ■ ■ ]                       [ · ■ · ]
           [ · · · ]                       [ ■ · · ]

Linha 2 →  [ · · · ]
           [ · · · ]
           [ ■ ■ ■ ]
```

Uma linha **conecta** quando os 3 símbolos são idênticos.

---

## Efeitos e fórmulas

### Fórmula de múltiplas conexões

Quando o mesmo símbolo conecta em mais de uma linha na mesma rodada, o efeito é acumulado:

```
valor_total = efeito_base + (número_de_conexões − 1)
```

**Exemplo:** Espada conecta em 2 linhas → `3 + (2 − 1) = 4 de dano`

### Tabela de efeitos

| Símbolo | Efeito base | Comportamento |
|---------|-------------|---------------|
| ⚔️ Espada | 3 de dano | Jogador ativo escolhe qual oponente recebe |
| ❤️ Vida | 3 de cura | Cura o jogador ativo |
| 🃏 Carta | — | Exibe quantas cartas sacar do baralho |
| 🔄 Retrigger | — | Concede até 3 re-giros (ver abaixo) |
| 💰 Jackpot | 4 HP | Jogador escolhe: curar a si mesmo ou causar dano a um alvo |

> Todos os efeitos são **informativos** — nenhum HP é rastreado internamente pelo sistema.

### Fluxo do Retrigger

1. Retrigger conecta → entra no modo Retrigger com **3 giros disponíveis**
2. Um novo giro é feito automaticamente
3. Modal exibe o resultado atual e pergunta: **Aceitar** ou **Girar novamente**
4. Se aceitar (ou esgotar os 3 giros), os efeitos do resultado escolhido são resolvidos normalmente
5. Efeitos de Retrigger dentro de um re-giro são ignorados (sem Retrigger encadeado)

### Fluxo do Jackpot

1. Modal pergunta: **Curar 4 HP** ou **4 dano imbloqueável**
2. Se dano: modal adicional para escolher o alvo entre os outros jogadores

---

## Arquitetura

```
Navegador (TypeScript)          Servidor (Node.js / Express)
┌─────────────────────────┐     ┌──────────────────────────┐
│  main.ts                │     │  src/server/index.ts     │
│  ┌───────────────────┐  │     │                          │
│  │ game/             │  │     │  Serve arquivos estáticos│
│  │  SlotMachine.ts   │  │     │  de dist/client/         │
│  │  WinDetector.ts   │  │◄────│                          │
│  │  GameState.ts     │  │     │  Porta: 3000             │
│  └───────────────────┘  │     └──────────────────────────┘
│  ┌───────────────────┐  │
│  │ ui/               │  │
│  │  Renderer.ts      │  │
│  │  Modals.ts        │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

Toda a lógica do jogo roda **no cliente** (TypeScript compilado pelo esbuild). O servidor Express existe somente para servir os arquivos estáticos em produção e desenvolvimento.

### Build pipeline

```
src/client/main.ts
  └─ esbuild (bundle + transpile) ──► dist/client/main.js

src/client/index.html  ──► dist/client/index.html  (cópia)
src/client/style.css   ──► dist/client/style.css   (cópia)

src/server/index.ts
  └─ tsc ──────────────────────────► dist/server/index.js
```

---

## Estrutura de arquivos

```
projeto-metodosclaudio/
├── package.json
├── tsconfig.json               # Compila somente src/server/ via tsc
│
├── src/
│   ├── shared/
│   │   └── types.ts            # Tipos compartilhados (SlotSymbol, Effect, Player, GameState)
│   │
│   ├── server/
│   │   └── index.ts            # Express servindo dist/client/
│   │
│   └── client/
│       ├── index.html          # Estrutura HTML (tela de setup + tela de jogo)
│       ├── style.css           # Tema casino clássico, mobile-first
│       ├── main.ts             # Orquestrador: loop de turno, retrigger, resolução de efeitos
│       │
│       ├── game/
│       │   ├── SlotMachine.ts  # Geração do grid e probabilidades
│       │   ├── WinDetector.ts  # Detecção de linhas + cálculo de efeitos
│       │   └── GameState.ts    # Estado dos jogadores e rotação de turnos
│       │
│       └── ui/
│           ├── Renderer.ts     # DOM, animação de bobinas, painéis de jogadores
│           └── Modals.ts       # Modais: alvo, jackpot, retrigger, carta
│
└── dist/                       # Gerado pelo build (não versionar)
    ├── client/
    │   ├── index.html
    │   ├── style.css
    │   └── main.js
    └── server/
        └── index.js
```

---

## Referência dos módulos

### `src/shared/types.ts`

Define todos os tipos TypeScript usados pelo cliente.

| Tipo | Descrição |
|------|-----------|
| `SlotSymbol` | `'espada' \| 'vida' \| 'carta' \| 'retrigger' \| 'jackpot'` |
| `Grid` | `SlotSymbol[][]` — matriz 3×3 |
| `WinLine` | `{ symbol, cells: [row, col][] }` — uma linha vencedora |
| `EffectType` | `'damage' \| 'heal' \| 'carta' \| 'retrigger' \| 'jackpot'` |
| `Effect` | `{ type, value, connections }` |
| `Player` | `{ id: number, name: string }` |
| `GameState` | `{ players: Player[], activePlayerIndex: number }` |

---

### `src/client/game/SlotMachine.ts`

| Exportação | Descrição |
|------------|-----------|
| `randomSymbol()` | Retorna um `SlotSymbol` aleatório respeitando os pesos |
| `spin()` | Gera um `Grid` 3×3. Com 70% de chance, força uma linha aleatória a conectar |

**Constantes configuráveis:**

```typescript
const GUARANTEED_WIN_CHANCE = 0.70; // probabilidade de giro com conexão garantida
const SYMBOL_WEIGHTS = [...]         // pesos de cada símbolo
```

---

### `src/client/game/WinDetector.ts`

| Exportação | Descrição |
|------------|-----------|
| `detectWins(grid)` | Verifica as 5 linhas e retorna `WinLine[]` |
| `calculateEffects(winLines)` | Agrupa conexões por símbolo e aplica a fórmula `base + (conexões − 1)` |

**Efeitos base por símbolo:**

```typescript
espada: 3, vida: 3, carta: 0, retrigger: 0, jackpot: 4
```

---

### `src/client/game/GameState.ts`

| Exportação | Descrição |
|------------|-----------|
| `createGame(names)` | Cria um `GameState` com 4 jogadores |
| `getActivePlayer(state)` | Retorna o `Player` do turno atual |
| `advanceTurn(state)` | Avança para o próximo jogador em ordem circular |

---

### `src/client/ui/Renderer.ts`

Gerencia todas as interações com o DOM.

| Método | Descrição |
|--------|-----------|
| `initPlayerPanels(players)` | Injeta nomes nos painéis laterais |
| `updatePlayerPanels(state)` | Destaca o jogador ativo |
| `setPhaseMessage(msg)` | Atualiza a mensagem central de fase |
| `showGrid(grid, winLines?)` | Exibe o grid estático; destaca células vencedoras |
| `animateSpin(finalGrid)` | Executa a animação de bobinas e retorna `{ winLines, effects }` |
| `showSpinButton(onSpin)` | Exibe o botão GIRAR e registra o callback |
| `hideSpinButton()` | Oculta o botão GIRAR |
| `showEffectsLog(messages)` | Exibe o log de resultados |
| `clearEffectsLog()` | Oculta o log |

**Animação das bobinas (`animateSpin`):**

As 3 colunas giram simultaneamente, mas param em sequência (esquerda → direita):

| Coluna | Para em |
|--------|---------|
| 0 (esquerda) | 900 ms |
| 1 (centro) | 1200 ms |
| 2 (direita) | 1500 ms |

Cada coluna usa animação em **2 fases**:
- **Fase 1** (72% do tempo): translação linear rápida cobrindo 78% da distância
- **Fase 2** (28% do tempo): `cubic-bezier(0.18, 0.8, 0.22, 1)` para desaceleração suave

Ao parar, um micro-bounce via `@keyframes reel-stop-bounce` simula o impacto mecânico. O blur CSS (`.reel-window.spinning`) é removido no início da fase 2.

---

### `src/client/ui/Modals.ts`

Todos os modais retornam `Promise` e bloqueiam o fluxo até o jogador interagir.

| Função | Retorna | Descrição |
|--------|---------|-----------|
| `askTarget(players, excludeId, reason)` | `Promise<number>` | Seletor de alvo para dano |
| `askJackpot(value)` | `Promise<'heal' \| 'damage'>` | Escolha do jackpot |
| `askRetrigger(effects, retriggersLeft)` | `Promise<'accept' \| 'respin'>` | Decisão do retrigger |
| `showCarta(count)` | `Promise<void>` | Exibe quantas cartas sacar |

---

### `src/client/main.ts`

Orquestrador principal. Fluxo de execução:

```
DOMContentLoaded → init()
  └─ submit do formulário → createGame() → startTurn()
       └─ showSpinButton → [clique] → runSpin()
            ├─ spin() + animateSpin()
            ├─ [se retrigger] → handleRetrigger()  (loop de até 3 re-giros)
            └─ resolveEffects()
                 ├─ showCarta() se carta
                 ├─ askJackpot() se jackpot
                 ├─ heal: log automático
                 ├─ askTarget() se dano
                 └─ advanceTurn() → startTurn()
```

---

### `src/server/index.ts`

Servidor Express minimalista. Serve os arquivos de `dist/client/` e redireciona qualquer rota desconhecida para `index.html`.

```typescript
const clientDir = path.join(process.cwd(), 'dist', 'client');
app.use(express.static(clientDir));
app.get('*', (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));
app.listen(3000);
```

---

## Personalização

### Ajustar probabilidades dos símbolos

```typescript
// src/client/game/SlotMachine.ts
const SYMBOL_WEIGHTS = [
  { symbol: 'espada',    weight: 27 },  // aumentar = mais frequente
  { symbol: 'vida',      weight: 33 },
  { symbol: 'carta',     weight: 20 },
  { symbol: 'retrigger', weight: 13 },
  { symbol: 'jackpot',   weight:  7 },
];
```

### Ajustar frequência de conexões

```typescript
// src/client/game/SlotMachine.ts
const GUARANTEED_WIN_CHANCE = 0.70; // 0.0 = nunca garantido, 1.0 = sempre garante
```

### Ajustar efeitos base dos símbolos

```typescript
// src/client/game/WinDetector.ts
const BASE_EFFECTS = {
  espada: 3,    // dano base
  vida:   3,    // cura base
  jackpot: 4,   // valor do jackpot
  carta: 0,     // sem valor numérico
  retrigger: 0, // sem valor numérico
};
```

### Ajustar timing da animação

```typescript
// src/client/ui/Renderer.ts
const COL_STOP_MS = [900, 1200, 1500]; // ms para cada coluna parar
const REEL_RANDOM_COUNT = 22;           // símbolos que rolam antes do resultado
```

### Ajustar delay pós-conexão (antes dos modais)

```typescript
// src/client/main.ts
await delay(winLines.length > 0 ? 800 : 400); // ms de pausa após o giro
```

### Ajustar tamanho das células (CSS)

```css
/* src/client/style.css */
:root {
  --cell-size: 82px;  /* mobile */
  --reel-gap: 5px;
}

@media (min-width: 700px) {
  :root { --cell-size: 100px; } /* desktop */
}
```
