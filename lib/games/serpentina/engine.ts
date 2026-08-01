// Motor de Snake diseñado desde cero (sin código fuente de referencia) —
// mecánica clásica (Nokia/Google Snake), mismo origen que los sprites de
// fruits.png. Ver spec 09 para el detalle de las decisiones.

import { FRUITS_IMAGE_SRC, FRUIT_KEYS, FRUIT_SPRITES } from "./spriteAtlas";
import { DEFAULT_SKIN, SkinId } from "../skins";

export type EngineState = "playing" | "dead" | "gameover";

// ── Paletas por skin ─────────────────────────────────────────────────────────
// `clasico` reproduce el look original (fondo casi negro, cabeza/cuerpo verde
// neón, fruta de respaldo roja mientras el sprite no cargó). El sprite de
// fruta en sí (fruits.png) no cambia por skin — solo el resto del canvas.
export interface SerpentinaPalette {
  background: string;
  grid: string;
  snakeHead: string;
  snakeBody: string;
  fruitFallback: string;
  glow: boolean;
}

export const SERPENTINA_PALETTES: Record<SkinId, SerpentinaPalette> = {
  clasico: {
    background: "#0a0a0a",
    grid: "rgba(255,255,255,0.05)",
    snakeHead: "#39ff14",
    snakeBody: "#1fa825",
    fruitFallback: "#ff2d55",
    glow: false,
  },
  neon: {
    background: "#050014",
    grid: "rgba(0,245,255,0.08)",
    snakeHead: "#f5ff00",
    snakeBody: "#00f5ff",
    fruitFallback: "#ff2bd6",
    glow: true,
  },
  retro: {
    // LCD monocromática estilo Nokia Snake: todo en tonos de verde fósforo.
    background: "#0f1a0a",
    grid: "rgba(140,255,120,0.07)",
    snakeHead: "#c8ffb0",
    snakeBody: "#4a9c3a",
    fruitFallback: "#8fff6b",
    glow: false,
  },
};

export interface EngineSnapshot {
  score: number;
  lives: number; // siempre 1
  level: number; // deriva de frutas comidas
  state: EngineState;
}

export interface Point {
  x: number;
  y: number;
}

type Direction = "up" | "down" | "left" | "right";

const GRID_COLS = 40;
const GRID_ROWS = 30;
const CELL_SIZE = 20; // 40*20=800, 30*20=600 — calza con el <canvas> 800x600

const TICK_MS_BASE = 140;
const TICK_MS_MIN = 60;
const TICK_MS_STEP = 8; // reducción de tick por nivel
const FRUITS_PER_LEVEL = 5;
const POINTS_PER_FRUIT = 10;

const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export class SerpentinaEngine {
  private ctx: CanvasRenderingContext2D;

  private snake: Point[] = [];
  private direction: Direction = "right";
  private queuedDirection: Direction = "right";

  private fruit: Point = { x: 0, y: 0 };
  private fruitKey: string = FRUIT_KEYS[0];

  private score = 0;
  private level = 1;
  private fruitsEaten = 0;
  private state: EngineState = "playing";

  private tickAccMs = 0;

  private fruitsImage: HTMLImageElement;
  private fruitsImageLoaded = false;

  private skin: SkinId;
  private palette: SerpentinaPalette;

  constructor(canvas: HTMLCanvasElement, skin: SkinId = DEFAULT_SKIN) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    this.skin = skin;
    this.palette = SERPENTINA_PALETTES[skin];

    this.fruitsImage = new Image();
    this.fruitsImage.onload = () => {
      this.fruitsImageLoaded = true;
    };
    this.fruitsImage.src = FRUITS_IMAGE_SRC;

    this.initGame();
  }

  setSkin(skin: SkinId): void {
    this.skin = skin;
    this.palette = SERPENTINA_PALETTES[skin];
  }

  private initGame() {
    const startX = Math.floor(GRID_COLS / 4);
    const startY = Math.floor(GRID_ROWS / 2);
    this.snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
    this.direction = "right";
    this.queuedDirection = "right";
    this.score = 0;
    this.level = 1;
    this.fruitsEaten = 0;
    this.state = "playing";
    this.tickAccMs = 0;
    this.spawnFruit();
  }

  private currentTickMs(): number {
    return Math.max(TICK_MS_MIN, TICK_MS_BASE - (this.level - 1) * TICK_MS_STEP);
  }

  private occupiesSnake(p: Point): boolean {
    return this.snake.some((s) => s.x === p.x && s.y === p.y);
  }

  private spawnFruit() {
    let p: Point;
    do {
      p = {
        x: Math.floor(Math.random() * GRID_COLS),
        y: Math.floor(Math.random() * GRID_ROWS),
      };
    } while (this.occupiesSnake(p));
    this.fruit = p;
    this.fruitKey = FRUIT_KEYS[Math.floor(Math.random() * FRUIT_KEYS.length)];
  }

  setDirection(dir: Direction): void {
    if (this.state !== "playing") return;
    if (OPPOSITE[dir] === this.queuedDirection) return;
    this.queuedDirection = dir;
  }

  private hitsWall(head: Point): boolean {
    return head.x < 0 || head.x >= GRID_COLS || head.y < 0 || head.y >= GRID_ROWS;
  }

  // `body` excluye la cola actual cuando esta va a moverse este mismo tick
  // (no comió fruta) — mismo criterio que el Snake clásico: pisar la celda
  // que la cola está abandonando no es colisión.
  private hitsBody(head: Point, body: Point[]): boolean {
    return body.some((s) => s.x === head.x && s.y === head.y);
  }

  private growSnake(head: Point) {
    this.snake.unshift(head);
  }

  private step() {
    this.direction = this.queuedDirection;
    const delta = DELTA[this.direction];
    const head: Point = {
      x: this.snake[0].x + delta.x,
      y: this.snake[0].y + delta.y,
    };

    if (this.hitsWall(head)) {
      this.state = "gameover";
      return;
    }

    const ateFruit = head.x === this.fruit.x && head.y === this.fruit.y;
    const bodyToCheck = ateFruit ? this.snake : this.snake.slice(0, -1);
    if (this.hitsBody(head, bodyToCheck)) {
      this.state = "gameover";
      return;
    }

    this.growSnake(head);
    if (ateFruit) {
      this.score += POINTS_PER_FRUIT;
      this.fruitsEaten++;
      this.level = Math.floor(this.fruitsEaten / FRUITS_PER_LEVEL) + 1;
      this.spawnFruit();
    } else {
      this.snake.pop();
    }
  }

  update(dt: number): void {
    if (this.state !== "playing") return;
    this.tickAccMs += dt * 1000;
    const tickMs = this.currentTickMs();
    while (this.tickAccMs >= tickMs && this.state === "playing") {
      this.tickAccMs -= tickMs;
      this.step();
    }
  }

  draw(): void {
    const ctx = this.ctx;
    const palette = this.palette;
    const W = GRID_COLS * CELL_SIZE;
    const H = GRID_ROWS * CELL_SIZE;

    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, W, H);

    // Grilla
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let c = 0; c <= GRID_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL_SIZE, 0);
      ctx.lineTo(c * CELL_SIZE, H);
      ctx.stroke();
    }
    for (let r = 0; r <= GRID_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL_SIZE);
      ctx.lineTo(W, r * CELL_SIZE);
      ctx.stroke();
    }

    // Serpiente
    ctx.save();
    if (palette.glow) {
      ctx.shadowColor = palette.snakeHead;
      ctx.shadowBlur = 6;
    }
    this.snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? palette.snakeHead : palette.snakeBody;
      ctx.fillRect(
        seg.x * CELL_SIZE + 1,
        seg.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2,
      );
    });
    ctx.restore();

    // Fruta
    const fx = this.fruit.x * CELL_SIZE;
    const fy = this.fruit.y * CELL_SIZE;
    if (this.fruitsImageLoaded) {
      const rect = FRUIT_SPRITES[this.fruitKey];
      ctx.drawImage(
        this.fruitsImage,
        rect.x,
        rect.y,
        rect.w,
        rect.h,
        fx,
        fy,
        CELL_SIZE,
        CELL_SIZE,
      );
    } else {
      ctx.fillStyle = palette.fruitFallback;
      ctx.fillRect(fx + 2, fy + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }
  }

  getSnapshot(): EngineSnapshot {
    return {
      score: this.score,
      lives: this.state === "gameover" ? 0 : 1,
      level: this.level,
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
    this.fruitsImage.onload = null;
  }
}
