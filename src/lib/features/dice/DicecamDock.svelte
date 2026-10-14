<script lang="ts">
  // The dicecam on the table (PROMPTS.md, prompt 18): the WebCamTool page in a frame, kept on for the whole
  // game so its camera stays calibrated, in a corner of the board where every seat can watch the tray being
  // read. Its reports arrive by `postMessage` and go to the page, which is waiting for a throw or not.
  import { isDicecamMessage, type DicecamMessage, type DicecamStatus } from './dicecam';

  interface Props {
    url: string;
    status: DicecamStatus;
    onmessage: (message: DicecamMessage) => void;
  }
  let { url, status, onmessage }: Props = $props();
  let frame: HTMLIFrameElement | undefined = $state();
  const origin = $derived(new URL(url, location.href).origin);

  $effect(() => {
    const listener = (e: MessageEvent) => {
      if (!frame || e.source !== frame.contentWindow || e.origin !== origin || !isDicecamMessage(e.data)) return;
      onmessage(e.data);
    };
    addEventListener('message', listener);
    return () => removeEventListener('message', listener);
  });
</script>

<div class="dock" data-testid="dicecam-dock" data-status={status} data-e2e-fit>
  <iframe bind:this={frame} data-testid="dicecam-frame" src={url} title="The dicecam: the dice tray as the camera sees it" allow="camera"></iframe>
  <span class="label" aria-hidden="true">dicecam</span>
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
  }
  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
  }
  .label {
    position: absolute;
    left: 0;
    bottom: 0;
    padding: 1px 6px;
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-size: calc(var(--target) * 0.22);
    background: rgba(28, 42, 46, 0.8);
    color: var(--paper);
    border-top-right-radius: 6px;
    pointer-events: none;
  }
</style>
