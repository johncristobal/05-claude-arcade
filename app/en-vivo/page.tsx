"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PresenceGuest } from "@/lib/types";

function randomGuestName() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `INVITADO_${digits}`;
}

export default function EnVivoPage() {
  const [guests, setGuests] = useState<PresenceGuest[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("en-vivo");

    const syncGuests = () => {
      const state = channel.presenceState<PresenceGuest>();
      setGuests(Object.values(state).flat());
    };

    channel
      .on("presence", { event: "sync" }, syncGuests)
      .on("presence", { event: "join" }, syncGuests)
      .on("presence", { event: "leave" }, syncGuests);

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }

      const guest: PresenceGuest = {
        name: randomGuestName(),
        online_at: new Date().toISOString(),
      };

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track(guest);
        }
      });
    })();

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="av-live fade-in">
      <div className="hall-head">
        <h1>EN VIVO</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          QUIÉN ESTÁ EN LA SALA AHORA MISMO
        </p>
      </div>

      <div className="live-page-panel">
        <div className="live-page-head">
          <div className="live-led">
            <span></span>CONECTADOS
          </div>
          <div className="live-page-count pixel">{guests.length}</div>
        </div>

        {guests.length === 0 ? (
          <div className="live-page-empty pixel">SOLO ESTÁS TÚ POR AHORA…</div>
        ) : (
          <ul className="live-page-list">
            {guests.map((g, i) => (
              <li key={g.name + g.online_at + i} className="live-page-item">
                <span className="live-page-dot" />
                <span className="pixel">{g.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
