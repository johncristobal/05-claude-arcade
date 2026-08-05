import type { Metadata, Viewport } from "next";
import {
  Press_Start_2P,
  JetBrains_Mono,
  Courier_Prime,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Nav } from "@/components/Nav";

const pixelFont = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description:
    "Online arcade platform, play games and compete for high scores.",
};

// El width/initialScale por defecto de Next 16 ya alcanza (ver
// node_modules/next/dist/lib/metadata/default-metadata.js:
// createDefaultViewport() emite width:"device-width", initialScale:1 sin
// necesidad de export explícito). Lo que sí falta y sí es real: el sitio es
// permanentemente oscuro (--bg/--bg-2 en app/globals.css, sin modo claro),
// así que declaramos colorScheme/themeColor para que el navegador móvil
// pinte su propia UI (barra de estado, scrollbars, controles de formulario)
// en línea con el tema en vez de asumir claro por defecto.
export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${pixelFont.variable} ${jetbrainsMono.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="av-bg" />
        <div className="av-noise" />
        <AuthProvider>
          <div id="root" className="flex flex-col flex-1">
            <Nav />
            <main className="av-main">{children}</main>
            <footer
              style={{
                borderTop: "1px solid var(--line)",
                padding: "20px 32px",
                textAlign: "center",
                color: "var(--ink-faint)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.16em",
              }}
            >
              © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
