// node space-hogs.test.mjs — replays fake batchexecute responses through space-hogs.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('./space-hogs.js', import.meta.url), 'utf8');
const info = (key, file, q) => [key, [null, null, '', file, null, null, 0, 0, 0, 123, ...Array(24).fill(null), q]];
const responses = {
  lcxiM: [
    [[['k1', [], 0, 'd1'], ['k2', [], 0, 'd2']], 'page2', '200'],
    [[['k3', [], 0, 'd3'], ['k4', [], 0, 'd4']], null, '100'],
  ],
  EWgK9e: [[[null, [
    info('k1', 'a.jpg', [1, 5e6, 2]), // counts, original
    info('k2', 'b.jpg', [2, 0, 1]), // free (storage saver / pre-2021)
    info('k3', 'c.mp4', [1, 9e6, 1]), // counts
    ['k4', [null, null, '', 'd.jpg', null, null, 0, 0, 0, 7]], // no quota field
  ]]]],
  EzwWhf: [[0, 0, 0, 0, 0, 0, [0, 0, false, 14e6]]],
  OXvT9d: [[['album1']]],
  E1Cajb: [[[]]],
  XwAOJf: [[[]]],
};

async function run(action) {
  const calls = [];
  globalThis.window = { WIZ_global_data: { eptZe: '/_/PhotosUi/', FdrFJe: 'sid', cfb2h: 'bl', SNlM0e: 'at' } };
  globalThis.location = { origin: 'https://photos.google.com', pathname: '/' };
  globalThis.confirm = () => true;
  globalThis.fetch = async (url, { body }) => {
    const [[[id, data]]] = JSON.parse(body.get('f.req'));
    calls.push([id, JSON.parse(data)]);
    const payload = JSON.stringify(responses[id].length > 1 && id === 'lcxiM' ? responses[id][calls.filter((c) => c[0] === id).length - 1] : responses[id][0]);
    return { ok: true, text: async () => `)]}'\n\n99\n${JSON.stringify([['wrb.fr', id, payload, null, null, null, 'generic']])}\n` };
  };
  const log = console.log, table = console.table;
  console.log = console.table = () => {};
  try { await (0, eval)(src.replace("ACTION = 'album'", `ACTION = '${action}'`)); }
  finally { console.log = log; console.table = table; }
  return calls;
}

// report: pages through library, flags only quota-counting items, biggest first, writes nothing
let calls = await run('report');
assert.deepEqual(calls[1][1].slice(0, 2), ['page2', 199]); // second page uses nextPageId + lastTimestamp-1
assert.deepEqual(window.spaceHogs.map((h) => h.mediaKey), ['k3', 'k1']);
assert.deepEqual(calls.map((c) => c[0]), ['lcxiM', 'lcxiM', 'EWgK9e', 'EzwWhf']);

// album: creates album, adds the flagged mediaKeys
calls = await run('album');
assert.deepEqual(calls.find((c) => c[0] === 'OXvT9d')[1], ['Takes up space', null, 2]);
assert.deepEqual(calls.find((c) => c[0] === 'E1Cajb')[1], [['k3', 'k1'], 'album1']);

// trash: bins by dedupKey, never touches the free or unknown items
calls = await run('trash');
assert.deepEqual(calls.find((c) => c[0] === 'XwAOJf')[1], [null, 1, ['d3', 'd1'], 3]);

console.log('ok');
