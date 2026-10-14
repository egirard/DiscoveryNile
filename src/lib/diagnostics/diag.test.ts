import { afterEach, describe, expect, it } from 'vitest';
import {
  configureDiagnostics,
  flushDiagnostics,
  isDiagnosticsActive,
  log,
  put,
  resetDiagnostics,
  safeName,
  serverUrlFrom,
  snapshot, commandFrom } from './diag';

interface Sent {
  url: string;
  method: string | undefined;
  body: string | undefined;
}

function fakeFetch(sent: Sent[], fail = false): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), method: init?.method, body: typeof init?.body === 'string' ? init.body : undefined });
    if (fail) throw new Error('no server');
    return new Response('ok');
  }) as typeof fetch;
}

afterEach(() => resetDiagnostics());

describe('serverUrlFrom', () => {
  it('prefers the query string over the environment and strips a trailing slash', () => {
    expect(serverUrlFrom('?diag-server=http://dev:3002/', { VITE_DIAG_URL: 'http://env:3002' })).toBe('http://dev:3002');
    expect(serverUrlFrom('', { VITE_DIAG_URL: 'http://env:3002' })).toBe('http://env:3002');
    expect(serverUrlFrom('', {})).toBeNull();
  });
});

describe('safeName', () => {
  it('mirrors the server rule', () => {
    expect(safeName('events-1.json')).toBe(true);
    expect(safeName('../etc')).toBe(false);
    expect(safeName('.hidden')).toBe(false);
    expect(safeName('a/b')).toBe(false);
  });
});

describe('configureDiagnostics', () => {
  it('is inactive without a server URL, when disabled, or with a bad session', () => {
    expect(configureDiagnostics({ session: 'ABCDE', url: null, enabled: true })).toBe(false);
    expect(configureDiagnostics({ session: 'ABCDE', url: 'http://dev:3002', enabled: false })).toBe(false);
    expect(configureDiagnostics({ session: 'a/b', url: 'http://dev:3002', enabled: true })).toBe(false);
    expect(isDiagnosticsActive()).toBe(false);
  });

  it('sends nothing while inactive', async () => {
    const sent: Sent[] = [];
    configureDiagnostics({ session: 'ABCDE', url: null, enabled: true, fetchImpl: fakeFetch(sent) });
    log('x');
    snapshot('y', {});
    await flushDiagnostics();
    expect(sent).toEqual([]);
  });

  it('files captures under the session, in order', async () => {
    const sent: Sent[] = [];
    expect(configureDiagnostics({ session: 'ABCDE', url: 'http://dev:3002/', enabled: true, fetchImpl: fakeFetch(sent) })).toBe(true);
    log('events/changed', { count: 2 });
    snapshot('events-1', [{ type: 'game/created' }]);
    put('geometry.json', '{}', 'application/json');
    put('../escape', 'nope');
    await flushDiagnostics();
    expect(sent.map((s) => [s.method, s.url])).toEqual([
      ['POST', 'http://dev:3002/diag/ABCDE/log'],
      ['PUT', 'http://dev:3002/diag/ABCDE/events-1.json'],
      ['PUT', 'http://dev:3002/diag/ABCDE/geometry.json']
    ]);
    expect(JSON.parse(sent[0].body!)).toEqual({ kind: 'events/changed', data: { count: 2 } });
    expect(JSON.parse(sent[1].body!)).toEqual([{ type: 'game/created' }]);
  });

  it('swallows server failures and keeps going', async () => {
    const sent: Sent[] = [];
    configureDiagnostics({ session: 'ABCDE', url: 'http://dev:3002', enabled: true, fetchImpl: fakeFetch(sent, true) });
    log('a');
    log('b');
    await expect(flushDiagnostics()).resolves.toBeUndefined();
    expect(sent).toHaveLength(2);
  });
  it('reads a reload command off the server\'s stream and nothing else', () => {
    expect(commandFrom('{"type":"reload"}')).toBe('reload');
    expect(commandFrom('{"type":"restart"}')).toBeNull();
    expect(commandFrom('not json')).toBeNull();
  });
});
