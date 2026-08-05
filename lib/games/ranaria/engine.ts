// Motor de Frogger diseñado desde cero (sin código fuente de referencia) —
// ver specs/game-jam/frogger/01-frogger-core.md para la mecánica original;
// adaptado al canvas estándar 800x600 de la plataforma (spec pedía 640x560)
// y sin sprites (todo primitivas canvas).

import { DEFAULT_SKIN, SkinId } from "../skins";

export type EngineState = "playing" | "dead" | "gameover";

// ── Paletas por skin ─────────────────────────────────────────────────────────
// `clasico` reproduce el look actual (zonas oscuras casi monocromáticas,
// vehículos/río en colores planos). `retro` referencia el arcade original
// de Frogger (1981): río azul saturado, negro puro, primarios planos sin
// glow. `neon` usa la paleta del sitio con shadowBlur en frog/goal.
export interface RanariaPalette {
  zoneDefault: string;
  zoneGoal: string;
  zoneRiver: string;
  zoneSafe: string;
  zoneRoad: string;
  zoneStart: string;
  goalBox: string;
  goalBorder: string;
  goalFilled: string;
  car: string;
  carAccent: string;
  truck: string;
  truckAccent: string;
  log: string;
  logAccent: string;
  turtle: string;
  turtleSubmerged: string;
  frog: string;
  frogAccent: string;
  hud: string;
  timerGood: string;
  timerWarn: string;
  timerBad: string;
  glow: boolean;
}

export const RANARIA_PALETTES: Record<SkinId, RanariaPalette> = {
  clasico: {
    zoneDefault: "#0a0a0a",
    zoneGoal: "#0a3d1f",
    zoneRiver: "#031a2e",
    zoneSafe: "#0a2e12",
    zoneRoad: "#141414",
    zoneStart: "#0a2e12",
    goalBox: "#12622f",
    goalBorder: "#d4af37",
    goalFilled: "#39ff14",
    car: "#e53935",
    carAccent: "#222",
    truck: "#9e9e9e",
    truckAccent: "#616161",
    log: "#6d4c26",
    logAccent: "rgba(0,0,0,0.3)",
    turtle: "#39a845",
    turtleSubmerged: "rgba(57,255,20,0.25)",
    frog: "#39ff14",
    frogAccent: "#fff",
    hud: "#fff",
    timerGood: "#39ff14",
    timerWarn: "#ffd54f",
    timerBad: "#e53935",
    glow: false,
  },
  neon: {
    zoneDefault: "#050014",
    zoneGoal: "#1a0033",
    zoneRiver: "#00121f",
    zoneSafe: "#0d0026",
    zoneRoad: "#0d0018",
    zoneStart: "#0d0026",
    goalBox: "#2a0050",
    goalBorder: "#f5ff00",
    goalFilled: "#00f5ff",
    car: "#ff2bd6",
    carAccent: "#1a002a",
    truck: "#b026ff",
    truckAccent: "#ff006e",
    log: "#00ff88",
    logAccent: "rgba(0,0,0,0.35)",
    turtle: "#f5ff00",
    turtleSubmerged: "rgba(245,255,0,0.25)",
    frog: "#00f5ff",
    frogAccent: "#fff",
    hud: "#fff",
    timerGood: "#00f5ff",
    timerWarn: "#f5ff00",
    timerBad: "#ff006e",
    glow: true,
  },
  retro: {
    // Frogger arcade 1981: río azul saturado, negro puro, primarios planos.
    zoneDefault: "#000",
    zoneGoal: "#003300",
    zoneRiver: "#0000aa",
    zoneSafe: "#000",
    zoneRoad: "#000",
    zoneStart: "#000",
    goalBox: "#00aa00",
    goalBorder: "#ffff00",
    goalFilled: "#ffff00",
    car: "#ff0000",
    carAccent: "#000",
    truck: "#ffa500",
    truckAccent: "#000",
    log: "#a05a2c",
    logAccent: "rgba(0,0,0,0.4)",
    turtle: "#00aa00",
    turtleSubmerged: "rgba(0,170,0,0.3)",
    frog: "#00ff00",
    frogAccent: "#fff",
    hud: "#fff",
    timerGood: "#00ff00",
    timerWarn: "#ffff00",
    timerBad: "#ff0000",
    glow: false,
  },
};

export interface EngineSnapshot {
  score: number;
  lives: number;
  level: number;
  state: EngineState;
}

const COLS = 20;
const ROWS = 15;
const CELL = 40; // 20*40=800, 15*40=600 — calza con el <canvas> 800x600

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 13;
const ROW_START = 14;

const JUMP_MS = 120;
const ROUND_TIME_BASE_MS = 15000;
const ROUND_TIME_MIN_MS = 6000;
const ROUND_TIME_STEP_MS = 1000;
const TURTLE_VISIBLE_MS = 3000;
const TURTLE_SUBMERGED_MS = 1500;

// 5 bocas destino de 2 columnas cada una, repartidas en las 20 columnas.
const GOAL_COLS = [1, 5, 9, 13, 17];
const GOAL_WIDTH = 2;

type Direction = "up" | "down" | "left" | "right";

interface Entity {
  x: number; // px, puede ser fraccional
  width: number; // en celdas
  type: "car" | "truck" | "log" | "turtle";
}

interface Lane {
  row: number;
  speedPxMs: number;
  dir: 1 | -1;
  kind: "road" | "river";
  entityType: "car" | "truck" | "log" | "turtle";
  entities: Entity[];
  submergeT: number; // solo carriles de tortugas
  submerged: boolean;
}

interface Frog {
  col: number;
  row: number;
  pxOffset: number; // desplazamiento horizontal fraccional al ir sobre tronco/tortuga
  animating: boolean;
  animT: number;
  fromCol: number;
  targetCol: number;
  targetRow: number;
}

function laneY(row: number): number {
  return row * CELL;
}

function buildRoadLane(row: number, speedPxMs: number, dir: 1 | -1): Lane {
  const type: "car" | "truck" = Math.random() < 0.3 ? "truck" : "car";
  const widthCells = type === "truck" ? 2 + Math.floor(Math.random() * 2) : 1;
  const entities: Entity[] = [];
  const gap = 4 + Math.floor(Math.random() * 3);
  for (let c = 0; c < COLS; c += widthCells + gap) {
    entities.push({ x: c * CELL, width: widthCells, type });
  }
  return {
    row,
    speedPxMs,
    dir,
    kind: "road",
    entityType: type,
    entities,
    submergeT: 0,
    submerged: false,
  };
}

function buildRiverLane(row: number, speedPxMs: number, dir: 1 | -1): Lane {
  const isTurtleLane = Math.random() < 0.4;
  const type: "log" | "turtle" = isTurtleLane ? "turtle" : "log";
  const widthCells = isTurtleLane ? 2 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3);
  const entities: Entity[] = [];
  const gap = 3 + Math.floor(Math.random() * 3);
  for (let c = 0; c < COLS; c += widthCells + gap) {
    entities.push({ x: c * CELL, width: widthCells, type });
  }
  return {
    row,
    speedPxMs,
    dir,
    kind: "river",
    entityType: type,
    entities,
    submergeT: Math.random() * (TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS),
    submerged: false,
  };
}

function buildLanes(level: number): Lane[] {
  const scale = 1 + (level - 1) * 0.15;
  const lanes: Lane[] = [];
  for (let row = ROW_ROAD_TOP; row <= ROW_ROAD_BOT; row++) {
    const dir: 1 | -1 = row % 2 === 0 ? 1 : -1;
    const speed = (0.06 + Math.random() * 0.09) * scale; // px/ms
    lanes.push(buildRoadLane(row, speed, dir));
  }
  for (let row = ROW_RIVER_TOP; row <= ROW_RIVER_BOT; row++) {
    const dir: 1 | -1 = row % 2 === 0 ? -1 : 1;
    const speed = (0.04 + Math.random() * 0.07) * scale; // px/ms
    lanes.push(buildRiverLane(row, speed, dir));
  }
  return lanes;
}

function makeFrog(): Frog {
  const col = Math.floor(COLS / 2);
  return {
    col,
    row: ROW_START,
    pxOffset: 0,
    animating: false,
    animT: 0,
    fromCol: col,
    targetCol: col,
    targetRow: ROW_START,
  };
}

export class RanariaEngine {
  private ctx: CanvasRenderingContext2D;

  private lanes: Lane[] = [];
  private frog: Frog = makeFrog();
  private pendingDir: Direction | null = null;

  private score = 0;
  private lives = 3;
  private level = 1;
  private state: EngineState = "playing";

  private goalsFilled: boolean[] = GOAL_COLS.map(() => false);
  private minRowReached = ROW_START;
  private roundTimeMs = ROUND_TIME_BASE_MS;
  private timeLeftMs = ROUND_TIME_BASE_MS;

  private skin: SkinId;
  private palette: RanariaPalette;

  constructor(canvas: HTMLCanvasElement, skin: SkinId = DEFAULT_SKIN) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");
    this.ctx = ctx;
    this.skin = skin;
    this.palette = RANARIA_PALETTES[skin];
    this.initGame();
  }

  // Solo reasigna la paleta activa — nunca reinicia la ronda en curso
  // (mismo contrato que RocasEngine.setSkin()/CaidaEngine.setSkin()).
  setSkin(skin: SkinId): void {
    this.skin = skin;
    this.palette = RANARIA_PALETTES[skin];
  }

  private initGame() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.state = "playing";
    this.lanes = buildLanes(this.level);
    this.frog = makeFrog();
    this.pendingDir = null;
    this.goalsFilled = GOAL_COLS.map(() => false);
    this.minRowReached = ROW_START;
    this.roundTimeMs = ROUND_TIME_BASE_MS;
    this.timeLeftMs = this.roundTimeMs;
  }

  // ── Input público (el hook engancha keydown en window) ─────────────────
  handleKeyDown(code: string): void {
    if (this.state !== "playing") return;
    switch (code) {
      case "ArrowUp":
        this.pendingDir = "up";
        break;
      case "ArrowDown":
        this.pendingDir = "down";
        break;
      case "ArrowLeft":
        this.pendingDir = "left";
        break;
      case "ArrowRight":
        this.pendingDir = "right";
        break;
    }
  }

  private goalIndexForCol(col: number): number {
    return GOAL_COLS.findIndex((gc) => col >= gc && col < gc + GOAL_WIDTH);
  }

  private checkRoadCollision(): boolean {
    for (const lane of this.lanes) {
      if (lane.kind !== "road" || lane.row !== this.frog.row) continue;
      const frogLeft = this.frog.col * CELL + this.frog.pxOffset;
      const frogRight = frogLeft + CELL;
      for (const e of lane.entities) {
        const left = e.x;
        const right = e.x + e.width * CELL;
        if (frogRight > left && frogLeft < right) return true;
      }
    }
    return false;
  }

  private getSupport(): { lane: Lane; entity: Entity } | null {
    for (const lane of this.lanes) {
      if (lane.kind !== "river" || lane.row !== this.frog.row) continue;
      const frogCenter = this.frog.col * CELL + this.frog.pxOffset + CELL / 2;
      for (const e of lane.entities) {
        if (lane.entityType === "turtle" && lane.submerged) continue;
        const left = e.x;
        const right = e.x + e.width * CELL;
        if (frogCenter >= left && frogCenter < right) return { lane, entity: e };
      }
    }
    return null;
  }

  private killFrog() {
    this.lives--;
    if (this.lives <= 0) {
      this.lives = 0;
      this.state = "gameover";
      return;
    }
    this.frog = makeFrog();
    this.pendingDir = null;
    this.timeLeftMs = this.roundTimeMs;
  }

  private completeRound() {
    this.score += 200;
    this.level++;
    this.lanes = buildLanes(this.level);
    this.frog = makeFrog();
    this.pendingDir = null;
    this.goalsFilled = GOAL_COLS.map(() => false);
    this.minRowReached = ROW_START;
    this.roundTimeMs = Math.max(
      ROUND_TIME_MIN_MS,
      ROUND_TIME_BASE_MS - (this.level - 1) * ROUND_TIME_STEP_MS,
    );
    this.timeLeftMs = this.roundTimeMs;
  }

  private resolveLanding() {
    const { row, col } = this.frog;

    if (row === ROW_GOALS) {
      const idx = this.goalIndexForCol(col);
      if (idx === -1 || this.goalsFilled[idx]) {
        this.killFrog();
        return;
      }
      this.goalsFilled[idx] = true;
      this.score += 50 + Math.floor(this.timeLeftMs / 100) * 10;
      if (this.goalsFilled.every(Boolean)) {
        this.completeRound();
      }
      return;
    }

    if (row < this.minRowReached) {
      this.score += 10;
      this.minRowReached = row;
    }
  }

  update(dt: number): void {
    if (this.state !== "playing") return;

    for (const lane of this.lanes) {
      for (const e of lane.entities) {
        e.x += lane.speedPxMs * lane.dir * dt;
        if (lane.dir === 1 && e.x > COLS * CELL) e.x = -e.width * CELL;
        if (lane.dir === -1 && e.x + e.width * CELL < 0) e.x = COLS * CELL;
      }
      if (lane.entityType === "turtle") {
        lane.submergeT += dt;
        const cycle = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
        lane.submergeT %= cycle;
        lane.submerged = lane.submergeT >= TURTLE_VISIBLE_MS;
      }
    }

    if (!this.frog.animating && this.pendingDir) {
      const dir = this.pendingDir;
      this.pendingDir = null;
      let targetCol = this.frog.col;
      let targetRow = this.frog.row;
      if (dir === "up") targetRow -= 1;
      if (dir === "down") targetRow += 1;
      if (dir === "left") targetCol -= 1;
      if (dir === "right") targetCol += 1;
      targetCol = Math.max(0, Math.min(COLS - 1, targetCol));
      targetRow = Math.max(ROW_GOALS, Math.min(ROW_START, targetRow));
      if (targetCol !== this.frog.col || targetRow !== this.frog.row) {
        this.frog.animating = true;
        this.frog.animT = 0;
        this.frog.fromCol = this.frog.col + this.frog.pxOffset / CELL;
        this.frog.targetCol = targetCol;
        this.frog.targetRow = targetRow;
        this.frog.pxOffset = 0;
      }
    } else if (this.frog.animating) {
      this.frog.animT += dt;
      if (this.frog.animT >= JUMP_MS) {
        this.frog.animating = false;
        this.frog.col = this.frog.targetCol;
        this.frog.row = this.frog.targetRow;
        this.frog.pxOffset = 0;
        this.resolveLanding();
      }
    } else if (this.frog.row >= ROW_RIVER_TOP && this.frog.row <= ROW_RIVER_BOT) {
      const support = this.getSupport();
      if (!support) {
        this.killFrog();
      } else {
        this.frog.pxOffset += support.lane.speedPxMs * support.lane.dir * dt;
        const absX = this.frog.col * CELL + this.frog.pxOffset;
        if (absX < 0 || absX + CELL > COLS * CELL) {
          this.killFrog();
        }
      }
    }

    if (this.state === "playing" && !this.frog.animating) {
      if (
        this.frog.row >= ROW_ROAD_TOP &&
        this.frog.row <= ROW_ROAD_BOT &&
        this.checkRoadCollision()
      ) {
        this.killFrog();
      }
    }

    if (this.state === "playing") {
      this.timeLeftMs -= dt;
      if (this.timeLeftMs <= 0) {
        this.timeLeftMs = 0;
        this.killFrog();
      }
    }
  }

  private drawBackground() {
    const ctx = this.ctx;
    const p = this.palette;
    for (let row = 0; row < ROWS; row++) {
      let color = p.zoneDefault;
      if (row === ROW_GOALS) color = p.zoneGoal;
      else if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) color = p.zoneRiver;
      else if (row === ROW_SAFE_MID) color = p.zoneSafe;
      else if (row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT) color = p.zoneRoad;
      else if (row === ROW_START) color = p.zoneStart;
      ctx.fillStyle = color;
      ctx.fillRect(0, laneY(row), COLS * CELL, CELL);
    }

    ctx.save();
    if (p.glow) {
      ctx.shadowColor = p.goalFilled;
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = p.goalBox;
    ctx.strokeStyle = p.goalBorder;
    ctx.lineWidth = 2;
    for (let i = 0; i < GOAL_COLS.length; i++) {
      const x = GOAL_COLS[i] * CELL;
      ctx.fillRect(x, laneY(ROW_GOALS), GOAL_WIDTH * CELL, CELL);
      ctx.strokeRect(x + 1, laneY(ROW_GOALS) + 1, GOAL_WIDTH * CELL - 2, CELL - 2);
      if (this.goalsFilled[i]) {
        ctx.fillStyle = p.goalFilled;
        ctx.beginPath();
        ctx.ellipse(
          x + (GOAL_WIDTH * CELL) / 2,
          laneY(ROW_GOALS) + CELL / 2,
          12,
          10,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.fillStyle = p.goalBox;
      }
    }
    ctx.restore();
  }

  private drawEntities() {
    const ctx = this.ctx;
    const p = this.palette;
    ctx.save();
    if (p.glow) ctx.shadowBlur = 6;
    for (const lane of this.lanes) {
      for (const e of lane.entities) {
        const y = laneY(lane.row);
        const w = e.width * CELL;
        if (e.type === "car") {
          if (p.glow) ctx.shadowColor = p.car;
          ctx.fillStyle = p.car;
          ctx.fillRect(e.x + 3, y + 8, w - 6, CELL - 16);
          ctx.fillStyle = p.carAccent;
          ctx.beginPath();
          ctx.arc(e.x + 8, y + CELL - 8, 4, 0, Math.PI * 2);
          ctx.arc(e.x + w - 8, y + CELL - 8, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (e.type === "truck") {
          if (p.glow) ctx.shadowColor = p.truck;
          ctx.fillStyle = p.truck;
          ctx.fillRect(e.x + 2, y + 6, w - 4, CELL - 12);
          ctx.fillStyle = p.truckAccent;
          ctx.fillRect(e.x + 2, y + 6, CELL * 0.6, CELL - 12);
        } else if (e.type === "log") {
          if (p.glow) ctx.shadowColor = p.log;
          ctx.fillStyle = p.log;
          ctx.fillRect(e.x + 2, y + 10, w - 4, CELL - 20);
          ctx.strokeStyle = p.logAccent;
          ctx.beginPath();
          ctx.moveTo(e.x + 2, y + CELL / 2);
          ctx.lineTo(e.x + w - 2, y + CELL / 2);
          ctx.stroke();
        } else {
          const turtleColor = lane.submerged ? p.turtleSubmerged : p.turtle;
          if (p.glow) ctx.shadowColor = turtleColor;
          ctx.fillStyle = turtleColor;
          const cellCount = Math.round(e.width);
          for (let i = 0; i < cellCount; i++) {
            ctx.beginPath();
            ctx.arc(e.x + i * CELL + CELL / 2, y + CELL / 2, CELL / 2 - 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();
  }

  private drawFrog() {
    const ctx = this.ctx;
    const p = this.palette;
    let x: number;
    let y: number;
    if (this.frog.animating) {
      const t = Math.min(1, this.frog.animT / JUMP_MS);
      const col = this.frog.fromCol + (this.frog.targetCol - this.frog.fromCol) * t;
      const row = this.frog.row + (this.frog.targetRow - this.frog.row) * t;
      x = col * CELL + CELL / 2;
      y = row * CELL + CELL / 2 - Math.sin(t * Math.PI) * 8;
    } else {
      x = this.frog.col * CELL + this.frog.pxOffset + CELL / 2;
      y = this.frog.row * CELL + CELL / 2;
    }
    ctx.save();
    if (p.glow) {
      ctx.shadowColor = p.frog;
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = p.frog;
    ctx.beginPath();
    ctx.ellipse(x, y, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = p.frogAccent;
    ctx.beginPath();
    ctx.arc(x - 5, y - 6, 3, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x - 5, y - 6, 1.4, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 6, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHud() {
    // Franja del HUD interno dentro de la fila segura intermedia (siempre
    // libre de tráfico/río) para no solaparse con la rana en su fila de
    // inicio ni con las bocas destino.
    const ctx = this.ctx;
    const p = this.palette;
    const baseline = laneY(ROW_SAFE_MID) + CELL / 2 + 5;

    ctx.font = "bold 16px monospace";
    ctx.fillStyle = p.hud;
    ctx.textAlign = "left";
    ctx.fillText(`${this.score}`, 8, baseline);

    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${this.level}`, (COLS * CELL) / 2, baseline);

    ctx.textAlign = "right";
    for (let i = 0; i < this.lives; i++) {
      ctx.fillStyle = p.frog;
      ctx.beginPath();
      ctx.ellipse(
        COLS * CELL - 14 - i * 20,
        laneY(ROW_SAFE_MID) + CELL / 2,
        6,
        5,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    const pct = Math.max(0, this.timeLeftMs / this.roundTimeMs);
    ctx.fillStyle = pct > 0.5 ? p.timerGood : pct > 0.2 ? p.timerWarn : p.timerBad;
    ctx.fillRect(0, 0, COLS * CELL * pct, 4);
  }

  draw(): void {
    this.drawBackground();
    this.drawEntities();
    this.drawFrog();
    this.drawHud();
  }

  getSnapshot(): EngineSnapshot {
    return {
      score: this.score,
      lives: this.lives,
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
    // Sin listeners propios (el hook engancha keydown en window).
  }
}
