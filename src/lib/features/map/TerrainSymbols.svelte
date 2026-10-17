<svelte:options namespace="svg" />

<script lang="ts">
  // The terrain symbols, in units of the hex radius and centred on the origin: original iconography, shared by the
  // table's board and the map editor (PROMPTS.md, prompt 52) so both draw the same hex. Veldt is a V with a stem up
  // through it from the vertex; veldt and swamp are drawn a little smaller than the mountain and the jungle's hex.
  import { hexPoints } from './hex';
</script>

<defs>
  <g id="sym-mountain" class="sym mountain"><path d="M-0.5 0.36 L0 -0.42 L0.5 0.36" /></g>
  <g id="sym-veldt" class="sym veldt"><path d="M-0.42 -0.27 L0 0.31 L0.42 -0.27 M0 0.31 V-0.35" /></g>
  <g id="sym-swamp" class="sym swamp"><path d="M-0.36 0.32 H0.36 M0 0.32 V-0.36 M-0.2 0.32 L-0.26 -0.19 M0.2 0.32 L0.26 -0.19" /></g>
  <g id="sym-jungle" class="sym jungle"><polygon points={hexPoints(0, 0, 0.74)} /></g>
</defs>

<style>
  .sym {
    fill: none;
    stroke-width: 0.14;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .sym.mountain {
    stroke: #6b3a2c;
  }
  .sym.veldt,
  .sym.swamp {
    stroke: #3f8a3f;
  }
  .sym.jungle {
    stroke: #3f8a3f;
    stroke-width: 0.12;
  }
</style>
