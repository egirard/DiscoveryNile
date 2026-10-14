<script lang="ts">
  // The dicecam on the table (PROMPTS.md, prompts 18 and 19): the camera's feed on a canvas with the engine's last
  // reading drawn over it, the way WebCamTool's /yahtzee shows its tray. The table owns the camera (so the permission
  // is the table's own) and the display; the analysis is WebCamTool's engine, loaded as a worker from that project's
  // hosted build (docs/dicecam.md) and fed one frame at a time: the next frame goes only after the engine's tick for
  // the last, so frames never queue up behind an analysis. Kept mounted for the whole game so the engine stays
  // calibrated; the page moves it with CSS.
  import { onMount } from 'svelte';
  import { startEngine } from './engine';
  import { drawOverlay, fitFrame } from './overlay';
  import { cameraFailure, dockNote, isEngineMessage, type DicecamStatus, type EngineMessage, type MotionStatus, type Roi, type SeenDie } from './dicecam';

  interface Props {
    url: string;
    onmessage: (message: EngineMessage) => void;
    onstatus: (status: DicecamStatus) => void;
  }
  let { url, onmessage, onstatus }: Props = $props();
  let canvas: HTMLCanvasElement | undefined = $state();
  let status = $state<DicecamStatus>('starting');
  let motion = $state<MotionStatus | null>(null);
  /** Frames the engine has taken and readings it has sent, for the tests and the badge. */
  let frames = $state(0);
  let readings = $state(0);
  $effect(() => onstatus(status));

  /** How long the engine may take to say it is up before the table gives up on it. */
  const ENGINE_TIMEOUT_MS = 30_000;
  const RECONNECT_ATTEMPTS = 3;

  onMount(() => {
    const c2d = canvas!.getContext('2d');
    if (!c2d) return;
    let disposed = false;
    let stream: MediaStream | null = null;
    let cameraUp = false;
    let cameraFailed: DicecamStatus | null = null;
    let engineUp = false;
    let engineFailed = false;
    const settle = () => {
      status = cameraFailed ?? (engineFailed ? 'no-engine' : !cameraUp ? 'starting' : !engineUp ? 'loading' : 'active');
    };

    // The feed: an off-screen video the camera streams into, drawn on the canvas frame by frame.
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;

    // The engine.
    const engine = startEngine(url);
    let inFlight = false;
    let last: SeenDie[] | null = null;
    let roi: Roi | null = null;
    const readyTimer = setTimeout(() => {
      if (!engineUp) {
        engineFailed = true;
        settle();
      }
    }, ENGINE_TIMEOUT_MS);
    engine.onerror = (e) => {
      console.warn('dicecam engine:', e.message);
      engineFailed = true;
      settle();
    };
    engine.onmessage = (e: MessageEvent) => {
      if (disposed || !isEngineMessage(e.data)) return;
      const m = e.data;
      if (m.type === 'ready') {
        engineUp = true;
        clearTimeout(readyTimer);
        settle();
      } else if (m.type === 'tick') {
        inFlight = false;
        motion = m.motion.status;
        frames++;
      } else if (m.type === 'roi') roi = m.roi;
      else if (m.type === 'settled') {
        last = m.dice;
        readings++;
      } else if (m.type === 'rolling') last = null;
      else if (m.type === 'error') console.warn('dicecam engine:', m.message);
      onmessage(m);
    };

    function draw() {
      const el = canvas!;
      const dpr = window.devicePixelRatio || 1;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr);
        el.height = Math.round(h * dpr);
      }
      c2d!.setTransform(dpr, 0, 0, dpr, 0, 0);
      c2d!.fillStyle = '#0a0a0a';
      c2d!.fillRect(0, 0, w, h);
      const fw = video.videoWidth;
      const fh = video.videoHeight;
      if (!fw || !fh) return;
      const fit = fitFrame(fw, fh, w, h);
      c2d!.drawImage(video, fit.x, fit.y, fw * fit.scale, fh * fit.scale);
      // The overlay is drawn in the frame's own pixels, placed and scaled as the frame is (and the canvas's density).
      drawOverlay(c2d!, last, roi, { x: dpr * fit.x, y: dpr * fit.y, scale: dpr * fit.scale });
    }

    // One frame to the engine at a time, at the camera's own cadence.
    type WithFrameCallback = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number) => void) => number;
      cancelVideoFrameCallback?: (id: number) => void;
    };
    const v = video as WithFrameCallback;
    let frameCallback: number | null = null;
    const schedule = (tick: (now: number) => void) => {
      frameCallback = v.requestVideoFrameCallback ? v.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
    };
    const unschedule = () => {
      if (frameCallback === null) return;
      if (v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(frameCallback);
      else cancelAnimationFrame(frameCallback);
      frameCallback = null;
    };
    function pump() {
      const tick = (now: number) => {
        if (disposed || !cameraUp) return;
        draw();
        if (engineUp && !inFlight && video.videoWidth > 0) {
          inFlight = true;
          createImageBitmap(video)
            .then((bitmap) => {
              if (disposed) {
                bitmap.close();
                return;
              }
              engine.postMessage({ type: 'frame', bitmap, timestamp: now }, [bitmap]);
            })
            .catch(() => {
              inFlight = false;
            });
        }
        schedule(tick);
      };
      schedule(tick);
    }

    let attempts = 0;
    async function openCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        cameraFailed = 'unsupported';
        settle();
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: false
        });
        if (disposed) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        video.srcObject = s;
        await video.play();
        cameraUp = true;
        cameraFailed = null;
        attempts = 0;
        settle();
        const track = s.getVideoTracks()[0];
        track.onended = () => {
          cameraUp = false;
          unschedule();
          if (!disposed) void reconnect();
        };
        pump();
      } catch (err) {
        cameraFailed = cameraFailure(err);
        settle();
      }
    }
    async function reconnect() {
      if (attempts++ >= RECONNECT_ATTEMPTS) {
        cameraFailed = 'error';
        settle();
        return;
      }
      cameraFailed = 'reconnecting';
      settle();
      await new Promise((r) => setTimeout(r, 1000));
      if (disposed) return;
      cameraFailed = null;
      last = null;
      roi = null;
      engine.postMessage({ type: 'reset' });
      await openCamera();
    }
    void openCamera();

    return () => {
      disposed = true;
      clearTimeout(readyTimer);
      unschedule();
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
      engine.terminate();
    };
  });
</script>

<div class="dock" data-testid="dicecam-dock" data-status={status} data-motion={motion ?? ''} data-frames={frames} data-readings={readings} data-e2e-fit>
  <canvas bind:this={canvas} data-testid="dicecam-canvas" aria-label="The dicecam: the dice tray as the camera sees it"></canvas>
  {#if dockNote(status)}
    <p class="note" data-testid="dicecam-note">{dockNote(status)}</p>
  {/if}
  <span class="label" aria-hidden="true">dicecam{#if motion}<span class="motion" data-testid="dicecam-motion">{motion}</span>{/if}</span>
</div>

<style>
  .dock {
    position: relative;
    width: 100%;
    height: 100%;
    border: 3px solid var(--paper);
    border-radius: 10px;
    overflow: hidden;
    background: #0a0a0a;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .note {
    position: absolute;
    inset: 0;
    margin: 0;
    display: grid;
    place-items: center;
    font-size: calc(var(--target) * 0.3);
    color: #9a9a9a;
    pointer-events: none;
  }
  .label {
    position: absolute;
    left: 0;
    bottom: 0;
    display: flex;
    gap: 0.6em;
    padding: 1px 6px;
    font-size: calc(var(--target) * 0.22);
    background: rgba(28, 42, 46, 0.8);
    color: var(--paper);
    border-top-right-radius: 6px;
    pointer-events: none;
  }
  .motion {
    opacity: 0.7;
  }
</style>
