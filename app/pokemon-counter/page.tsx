"use client";

import { useEffect, useState } from "react";

const MIN_ID = 1;
const MAX_ID = 1025;
const RANGE = MAX_ID - MIN_ID + 1;

function spriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function wrapId(id: number, delta: number) {
  return MIN_ID + ((((id - MIN_ID + delta) % RANGE) + RANGE) % RANGE);
}

const styles = {
  main: {
    minHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    padding: "80px 20px",
    textAlign: "center",
  },
  title: {
    fontFamily: "var(--pixel)",
    fontSize: 18,
    letterSpacing: "0.12em",
    color: "var(--cyan)",
  },
  screen: {
    width: 260,
    height: 260,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sprite: { imageRendering: "pixelated", objectFit: "contain" },
  name: { fontFamily: "var(--mono, monospace)", color: "var(--ink-dim)" },
  controls: { display: "flex", gap: 16 },
  count: { fontFamily: "var(--pixel)", fontSize: 26, color: "var(--yellow)" },
} as const;

export default function PokemonCounterPage() {
  const [count, setCount] = useState(MIN_ID);
  const [name, setName] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`https://pokeapi.co/api/v2/pokemon/${count}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (!cancelled) setName(data.name);
      })
      .catch(() => {
        if (!cancelled) setName("???");
      });
    return () => {
      cancelled = true;
    };
  }, [count]);

  return (
    <main style={styles.main}>
      <h1 style={styles.title}>POKEMON COUNTER</h1>

      <div className="crt-screen" style={styles.screen}>
        <img
          src={spriteUrl(count)}
          alt={name || `pokemon #${count}`}
          width={220}
          height={220}
          style={styles.sprite}
        />
      </div>

      <div style={styles.name}>
        #{String(count).padStart(4, "0")} — {name || "cargando..."}
      </div>

      <div style={styles.controls}>
        <button
          className="btn ghost"
          onClick={() => setCount((c) => wrapId(c, -1))}
        >
          − ANTERIOR
        </button>
        <button className="btn" onClick={() => setCount((c) => wrapId(c, 1))}>
          SIGUIENTE +
        </button>
      </div>

      <div style={styles.count}>{count}</div>
    </main>
  );
}
