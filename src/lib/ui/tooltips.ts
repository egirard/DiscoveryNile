// Tooltips for a mouse: every control and marker already carries an aria-label naming what it is
// and what a tap does; this mirrors that label into a `title`, so hovering explains the icons.
// A table has no hover, so this is for understanding the design on a desktop; touch feedback is a
// later stage (PROMPTS.md, prompt 10).
export function attachTooltips(root: ParentNode & Node): () => void {
  const apply = (el: Element) => {
    const label = el.getAttribute('aria-label');
    if (label) {
      if (el.getAttribute('title') !== label) el.setAttribute('title', label);
    } else if (el.hasAttribute('title')) {
      el.removeAttribute('title'); // a label emptied (a seat whose turn is over) takes its tooltip with it
    }
  };
  const sweep = (node: ParentNode) => {
    for (const el of node.querySelectorAll('[aria-label]')) apply(el);
  };
  sweep(root);
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes' && r.target instanceof Element) apply(r.target);
      for (const n of r.addedNodes) {
        if (n instanceof Element) {
          apply(n);
          sweep(n);
        }
      }
    }
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label'] });
  return () => observer.disconnect();
}
