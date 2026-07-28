// Puerto 1:1 de references/started-games/04-arkanoid/game.js + levels.js a
// TypeScript. Sin spritesheet/audio/animación de explosión (dibujo
// vectorial simple, ver spec). El overlay de pausa propio con "saltar a
// nivel N" y las teclas P/Escape del original no se portan — la pausa es
// solo del sitio (HUD), ver spec.

export type EngineState = "playing" | "dead" | "gameover";

export interface EngineSnapshot {
  score: number;
  lives: number; // 3 → 0
  level: number; // 1-5
  state: EngineState; // 'win' del original se resuelve como 'gameover'
}

const W = 800;
const H = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_ROWS = 6;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCK_COLORS = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

interface LevelBlockSpec {
  col: number;
  row: number;
  color: string;
}

interface Level {
  speed: number;
  blocks: LevelBlockSpec[];
}

// Puerto 1:1 de levels.js — layouts fijos l1..l5.
const LEVELS: Level[] = (() => {
  const rowColors1 = BLOCK_COLORS;
  const rowColors2 = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
  const rowColors4 = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

  const l1: LevelBlockSpec[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      l1.push({ col, row, color: rowColors1[row] });

  const l2: LevelBlockSpec[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: LevelBlockSpec[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelBlockSpec[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  const l5: LevelBlockSpec[] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Ball extends Rect {
  vx: number;
  vy: number;
}

interface Block extends Rect {
  color: string;
  alive: boolean;
}

function collideAABB(ball: Ball, block: Block): boolean {
  return (
    ball.x < block.x + block.w &&
    ball.x + ball.w > block.x &&
    ball.y < block.y + block.h &&
    ball.y + ball.h > block.y
  );
}

export class BloqueBusterEngine {
  private ctx: CanvasRenderingContext2D;

  private paddle: Rect = { x: 0, y: 560, w: 81, h: 14 };
  private ball: Ball = { x: 0, y: 0, w: 16, h: 16, vx: 200, vy: -300 };
  private blocks: Block[] = [];

  private lives = 3;
  private score = 0;
  private state: EngineState = "playing";
  private currentLevel = 1;

  private keys = { ArrowLeft: false, ArrowRight: false };

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    this.initGame();
  }

  private initGame() {
    this.score = 0;
    this.lives = 3;
    this.state = "playing";
    this.initPaddle();
    this.loadLevel(1);
  }

  private initPaddle() {
    this.paddle.x = (W - this.paddle.w) / 2;
  }

  // Reposiciona la pelota sobre la paleta sin tocar los bloques —
  // usado al perder una vida en medio de un nivel.
  private initBall() {
    const speed = LEVELS[this.currentLevel - 1].speed;
    this.ball.x = this.paddle.x + (this.paddle.w - this.ball.w) / 2;
    this.ball.y = this.paddle.y - this.ball.h;
    this.ball.vx = BASE_BALL_VX * speed;
    this.ball.vy = BASE_BALL_VY * speed;
  }

  private loadLevel(n: number) {
    this.currentLevel = n;
    const level = LEVELS[n - 1];
    this.blocks = level.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    this.initBall();
  }

  // ── Input público (el hook engancha keydown/keyup en window y
  // mousemove en el propio nodo canvas) ──────────────────────────────
  handleKeyDown(code: string): void {
    if (this.state !== "playing") return;
    if (code === "ArrowLeft") this.keys.ArrowLeft = true;
    if (code === "ArrowRight") this.keys.ArrowRight = true;
  }

  handleKeyUp(code: string): void {
    if (code === "ArrowLeft") this.keys.ArrowLeft = false;
    if (code === "ArrowRight") this.keys.ArrowRight = false;
  }

  handleMouseMove(clientX: number, rect: DOMRect): void {
    if (this.state !== "playing") return;
    const scaleX = W / rect.width;
    const mouseX = (clientX - rect.left) * scaleX;
    this.paddle.x = Math.max(
      0,
      Math.min(W - this.paddle.w, mouseX - this.paddle.w / 2),
    );
  }

  update(dt: number): void {
    if (this.state !== "playing") return;

    const { paddle, ball } = this;

    if (this.keys.ArrowLeft)
      paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (this.keys.ArrowRight)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }

    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }

    for (const block of this.blocks) {
      if (!block.alive) continue;
      if (collideAABB(ball, block)) {
        block.alive = false;
        this.score += 10;
        ball.vy = -ball.vy;
        if (this.blocks.every((b) => !b.alive)) {
          if (this.currentLevel < 5) this.loadLevel(this.currentLevel + 1);
          else this.state = "gameover"; // 'win' del original
        }
        break; // un bloque por frame, igual que el original
      }
    }

    if (ball.y > H) {
      this.lives--;
      if (this.lives <= 0) {
        this.lives = 0;
        this.state = "gameover";
      } else {
        this.initBall();
      }
    }
  }

  draw(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    for (const block of this.blocks) {
      if (!block.alive) continue;
      ctx.fillStyle = block.color;
      ctx.fillRect(block.x, block.y, block.w, block.h);
    }

    ctx.fillStyle = "#fff";
    ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);
    ctx.fillRect(this.ball.x, this.ball.y, this.ball.w, this.ball.h);

    // Sin drawHUD ni drawOverlay: HUD real y modal de fin son del sitio.
  }

  getSnapshot(): EngineSnapshot {
    return {
      score: this.score,
      lives: this.lives,
      level: this.currentLevel,
      state: this.state,
    };
  }

  forceGameOver(): void {
    this.state = "gameover";
  }

  restart(): void {
    this.initGame();
  }

  destroy(): void {
    // El motor no registra listeners propios (los engancha el hook en
    // window/canvas), no hay nada que limpiar internamente por ahora.
  }
}
