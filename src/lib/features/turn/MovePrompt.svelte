<script lang="ts">
  // The prompt to move at the seat's edge (PROMPTS.md, prompt 74): "You have 2 MP: pick a hex to move into, or
  // END TURN", the last two words the control that ends the turn. It stands where the dice are asked for and their
  // results are read, so the turn's record always says what the table is waiting for.
  import { movePromptText } from './move-prompt';

  interface Props {
    seat: string;
    left: number | null;
    onend: () => void;
  }
  let { seat, left, onend }: Props = $props();
</script>

<p class="move" data-testid="move-prompt-{seat}" data-left={left ?? ''} role="status">
  <span data-testid="move-prompt-text-{seat}">{movePromptText(left)}</span>
  <button type="button" class="end" data-testid="move-prompt-end-{seat}" aria-label="End the turn" onclick={onend}>END TURN</button>
</p>

<style>
  .move {
    margin: 0;
    display: flex;
    align-items: center;
    gap: var(--gap);
    font-family: 'Nile Sans', 'DejaVu Sans', sans-serif;
    font-size: calc(var(--target) * 0.3);
    font-weight: 700;
    white-space: nowrap;
  }
  .end {
    height: var(--target);
    padding: 0 calc(var(--gap) * 1.2);
    border: 2px solid var(--ink);
    border-radius: 8px;
    background: var(--accent);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
</style>
