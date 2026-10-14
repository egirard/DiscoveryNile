// The dicecam engine (PROMPTS.md, prompt 19) is WebCamTool's analysis packaged as a module worker and hosted with
// that project (docs/dicecam.md). A worker script must be same-origin with the page that creates it, so the table
// starts the engine through a blob module that imports the hosted file; the host serves it with
// `Access-Control-Allow-Origin: *`, which is all that import needs. The engine's own chunks, the detector worker it
// starts and the digit model resolve beside it, from its real URL.

/** Start the engine at `url` (absolute, or relative to the page) as a module worker. */
export function startEngine(url: string): Worker {
  const href = new URL(url, location.href).href;
  const boot = new Blob([`import ${JSON.stringify(href)};\n`], { type: 'text/javascript' });
  const bootUrl = URL.createObjectURL(boot);
  const worker = new Worker(bootUrl, { type: 'module' });
  // The boot module has been fetched by the time the engine says anything; let the blob go then.
  worker.addEventListener('message', () => URL.revokeObjectURL(bootUrl), { once: true });
  return worker;
}
