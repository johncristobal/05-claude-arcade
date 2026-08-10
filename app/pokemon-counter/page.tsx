"use client";

import { useEffect, useState } from "react";

const MIN_ID = 1;
const MAX_ID = 1025;

function spriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

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

  function increment() {
    setCount((c) => (c >= MAX_ID ? MIN_ID : c + 1));
  }

  function decrement() {
    setCount((c) => (c <= MIN_ID ? MAX_ID : c - 1));
  }

  return (
    <main
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: "80px 20px",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--pixel)",
          fontSize: 18,
          letterSpacing: "0.12em",
          color: "var(--cyan)",
        }}
      >
        POKEMON COUNTER
      </h1>

      <div
        className="crt-screen"
        style={{
          width: 260,
          height: 260,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <img
          src={spriteUrl(count)}
          alt={name || `pokemon #${count}`}
          width={220}
          height={220}
          style={{ imageRendering: "pixelated", objectFit: "contain" }}
        />
      </div>

      <div
        style={{
          fontFamily: "var(--mono, monospace)",
          color: "var(--ink-dim)",
        }}
      >
        #{String(count).padStart(4, "0")} — {name || "cargando..."}
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <button className="btn ghost" onClick={decrement}>
          − ANTERIOR
        </button>
        <button className="btn" onClick={increment}>
          SIGUIENTE +
        </button>
      </div>

      <div
        style={{
          fontFamily: "var(--pixel)",
          fontSize: 26,
          color: "var(--yellow)",
        }}
      >
        {count}
      </div>
    </main>
  );
}
