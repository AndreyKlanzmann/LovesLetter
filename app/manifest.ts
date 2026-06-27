import type { MetadataRoute } from "next";

// Web App Manifest — torna o jogo "instalável" como app (no PC pelo Chrome/Edge:
// botão "Instalar"; abre em janela própria, sem barra do navegador).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Love Letter",
    short_name: "Love Letter",
    description: "Love Letter multiplayer — jogue com os amigos.",
    start_url: "/",
    display: "standalone",
    background_color: "#160e0b",
    theme_color: "#160e0b",
    orientation: "any",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
