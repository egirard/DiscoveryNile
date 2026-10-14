// Fire-and-forget client for the diagnostics capture server (scripts/diag-server.ts, docs/diagnostics.md).
// Inactive unless a server URL is configured AND the build is a dev or E2E build; production never sends.
//
// This module was documented by TabletopTemplate but never committed there (its `.gitignore` pattern
// `diagnostics/` also matched `src/lib/diagnostics/`). DiscoveryNile supplies it per the documentation.

export interface DiagnosticsOptions {
  /** Session (room code) the captures are filed under. */
  session: string;
  /** Query string to read `?diag-server=` from; defaults to the page's. */
  search?: string;
  /** Server URL; overrides the query string and `VITE_DIAG_URL`. */
  url?: string | null;
  /** Force the enabled state (tests). Defaults to "dev or E2E build". */
  enabled?: boolean;
  /** `fetch` implementation (tests). */
  fetchImpl?: typeof fetch;
}

interface Configured {
  base: string; // `${url}/diag/${session}`
  fetchImpl: typeof fetch;
}

let configured: Configured | null = null;
let queue: Promise<unknown> = Promise.resolve();
let listening = false;
let commands: { close(): void } | null = null;

/** A command from the capture server's stream (PROMPTS.md, prompt 26): `reload` reloads the page, so the game replays on the code as it now is. */
export function commandFrom(data: string): 'reload' | null {
  try {
    const parsed = JSON.parse(data) as { type?: unknown };
    return parsed.type === 'reload' ? 'reload' : null;
  } catch {
    return null;
  }
}

/** Only simple names, mirroring the server's rule. */
export function safeName(name: string): boolean {
  return /^[A-Za-z0-9._-]{1,120}$/.test(name) && !name.startsWith('.');
}

export function serverUrlFrom(search: string, env: Record<string, string | undefined> = import.meta.env): string | null {
  const fromQuery = new URLSearchParams(search).get('diag-server');
  const url = fromQuery ?? env.VITE_DIAG_URL ?? null;
  return url ? url.replace(/\/+$/, '') : null;
}

function isDevOrE2e(env: Record<string, unknown> = import.meta.env): boolean {
  return Boolean(env.DEV) || env.VITE_E2E === 'true';
}

export function configureDiagnostics(options: DiagnosticsOptions): boolean {
  const search = options.search ?? (typeof location === 'undefined' ? '' : location.search);
  const url = (options.url === undefined ? serverUrlFrom(search) : options.url)?.replace(/\/+$/, '') ?? null;
  const enabled = options.enabled ?? isDevOrE2e();
  if (!url || !enabled || !safeName(options.session)) {
    configured = null;
    commands?.close();
    commands = null;
    return false;
  }
  configured = { base: `${url}/diag/${options.session}`, fetchImpl: options.fetchImpl ?? fetch };
  commands?.close();
  commands = null;
  if (typeof EventSource !== 'undefined' && typeof location !== 'undefined') {
    const source = new EventSource(`${configured.base}/events`);
    source.onmessage = (e) => {
      if (commandFrom(String(e.data)) === 'reload') location.reload();
    };
    commands = source;
  }
  if (!listening && typeof window !== 'undefined') {
    listening = true;
    window.addEventListener('error', (e) => log('window/error', { message: e.message, source: e.filename, line: e.lineno }));
    window.addEventListener('unhandledrejection', (e) => log('window/unhandledrejection', { reason: String(e.reason) }));
  }
  return true;
}

export function isDiagnosticsActive(): boolean {
  return configured !== null;
}

/** Serialize sends so files and log lines arrive in the order they were produced. */
function send(path: string, init: RequestInit): void {
  const target = configured;
  if (!target) return;
  queue = queue
    .then(() => target.fetchImpl(`${target.base}/${path}`, init))
    .catch(() => undefined); // a missing server never affects the game
}

/** Wait for everything queued so far (tests, and page unload if a project wants it). */
export function flushDiagnostics(): Promise<void> {
  return queue.then(() => undefined);
}

/** One timestamped JSON line in `log.ndjson`. */
export function log(kind: string, data?: unknown): void {
  send('log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, data: data ?? null })
  });
}

/** Write `name` with the given body. */
export function put(name: string, body: string | Blob | ArrayBuffer, contentType = 'application/octet-stream'): void {
  if (!safeName(name)) return;
  send(name, { method: 'PUT', headers: { 'Content-Type': contentType }, body });
}

/** `name.json` holding `data`. */
export function snapshot(name: string, data: unknown): void {
  put(`${name}.json`, JSON.stringify(data, null, 2), 'application/json');
}

/** `name.png` rendered from a canvas. */
export async function canvas(name: string, element: HTMLCanvasElement): Promise<void> {
  if (!configured) return;
  const blob = await new Promise<Blob | null>((resolve) => element.toBlob(resolve, 'image/png'));
  if (blob) put(`${name}.png`, blob, 'image/png');
}

/** Tests only. */
export function resetDiagnostics(): void {
  configured = null;
  commands?.close();
  commands = null;
  queue = Promise.resolve();
}
