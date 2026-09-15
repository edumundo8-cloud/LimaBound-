/**
 * Cliente del API de salas 1v1 (`/api/room`).
 *
 * Aisla el acceso a la red y al almacenamiento local para que la interfaz solo
 * describa que quiere hacer y no como se transporta. Ver
 * `tests/room-api.test.mjs`, que lo prueba con `fetch` simulado.
 */

import type { State } from "./rules";

const TOKEN_KEY = "oddbound-token";

/** Mensaje por defecto cuando el API falla sin explicacion. */
export const ROOM_FALLBACK_ERROR = "La conexión decidió tomar un descanso.";

/** Intervalo de sondeo de la sala compartida. */
export const POLL_MS = 900;

/** Respuesta del API de salas. */
export type RoomResponse = {
  code?: string;
  role?: 0 | 1;
  waiting?: boolean;
  state: State;
  revision?: number;
  error?: string;
};

/** Token estable del dispositivo; sobrevive a recargas. */
export const getToken = () => {
  let t = localStorage.getItem(TOKEN_KEY);
  if (!t) {
    t = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
};

/** Codigo de sala de seis caracteres. */
export const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

/**
 * Envia una accion a la sala. Siempre anade el codigo y el token del
 * dispositivo, igual que hacia la version anterior.
 */
export const postRoom = async (
  payload: Record<string, unknown>,
  code: string,
  errorFallback?: string,
): Promise<RoomResponse> => {
  const r = await fetch("/api/room", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, code, token: getToken() }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || errorFallback);
  return j;
};

/**
 * Lee el estado de la sala para el sondeo periodico.
 * Devuelve la respuesta sin interpretar: quien llama decide si el error importa.
 */
export const fetchRoom = (code: string): Promise<Response> =>
  fetch(`/api/room?code=${code}`, { cache: "no-store" });
