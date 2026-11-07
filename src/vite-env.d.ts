/// <reference types="vite/client" />
declare module '*.css';

interface ImportMetaEnv {
  /** URL del servidor de partidas si está en otro dominio, p. ej. wss://rescate-contexto.fly.dev/ws */
  readonly VITE_WS_URL?: string;
}
