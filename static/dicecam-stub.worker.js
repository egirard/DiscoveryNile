// Stands in for the dicecam engine in E2E builds (docs/dicecam.md): it takes the table's frames and makes nothing of
// them, answering each with a settled tick so the feed keeps flowing, and repeats to the table whatever the scenario
// posts on the 'dicecam-stub' broadcast channel, so the scenario speaks for the engine.
const channel = new BroadcastChannel('dicecam-stub');
channel.onmessage = (e) => self.postMessage(e.data);
self.onmessage = (e) => {
  const m = e.data;
  if (m && m.type === 'frame') {
    const frame = { width: m.bitmap.width, height: m.bitmap.height };
    m.bitmap.close();
    self.postMessage({ type: 'tick', motion: { status: 'settled' }, frame });
  }
};
self.postMessage({ type: 'ready', protocol: 2, version: 'stub' });
