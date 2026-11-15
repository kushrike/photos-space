// Google Photos: flag every item that counts against your Google storage quota.
//
// Usage: open https://photos.google.com (logged in), open DevTools console
// (Cmd+Opt+J), set ACTION below, paste this whole file, press Enter.
//
// Talks to the same internal RPCs the Photos web app uses (ids/payloads taken
// from Google Photos Toolkit, MIT). Unofficial: breaks if Google changes them.
(async () => {
  const ACTION = 'album'; // 'report' = just list | 'album' = add to new album | 'trash' = move to Bin
  const ALBUM_NAME = 'Takes up space';

  const g = window.WIZ_global_data;
  const rpc = async (id, data) => {
    const url = `${location.origin}${g.eptZe}data/batchexecute?` +
      new URLSearchParams({ rpcids: id, 'source-path': location.pathname, 'f.sid': g.FdrFJe, bl: g.cfb2h, pageId: 'none', rt: 'c' });
    const body = new URLSearchParams({ 'f.req': JSON.stringify([[[id, JSON.stringify(data), null, 'generic']]]), at: g.SNlM0e });
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await fetch(url, { method: 'POST', body, credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const line = (await res.text()).split('\n').find((l) => l.includes('wrb.fr'));
        const payload = line && JSON.parse(line)[0][2];
        if (!payload) throw new Error('empty response');
        return JSON.parse(payload);
      } catch (e) {
        if (attempt === 3) throw new Error(`${id} failed: ${e.message}`);
        console.warn(`${id} failed (${e.message}), retrying…`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  };
  const gb = (b) => (b / 1e9).toFixed(2) + ' GB';

  // 1. List the whole library (main + archive), newest first.
  const dedupKeys = new Map(); // mediaKey -> dedupKey (trash needs the latter)
  let page = null, ts = null;
  do {
    const r = await rpc('lcxiM', [page, ts, 500, null, 1, 3]); // 3 = library + archive
    for (const it of r?.[0] ?? []) dedupKeys.set(it[0], it[3]);
    page = r?.[1];
    ts = r?.[2] ? parseInt(r[2]) - 1 : null;
    console.log(`Listed ${dedupKeys.size} items…`);
  } while (page);

  // 2. Ask for storage info in bulk. Last field of each item = [1 counts / 2 free, bytes counted, 2 = original quality].
  const keys = [...dedupKeys.keys()];
  const hogs = [];
  let checked = 0, unknown = 0;
  for (let i = 0; i < keys.length; i += 5000) {
    const batch = keys.slice(i, i + 5000).map((k) => [k]);
    // prettier-ignore
    const r = await rpc('EWgK9e', [[[batch], [[null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, [], null, null, null, null, null, null, null, null, null, null, []]]]]);
    for (const d of r?.[0]?.[1] ?? []) {
      checked++;
      const q = d?.[1]?.at(-1);
      if (!Array.isArray(q)) unknown++;
      else if (q[0] === 1) hogs.push({ file: d[1][3], bytes: q[1] ?? d[1][9] ?? 0, original: q[2] === 2, mediaKey: d[0], dedupKey: dedupKeys.get(d[0]) });
    }
    console.log(`Checked ${checked}/${keys.length}…`);
  }

  hogs.sort((a, b) => b.bytes - a.bytes);
  window.spaceHogs = hogs; // full list stays inspectable in the console
  const total = hogs.reduce((s, h) => s + h.bytes, 0);
  const used = (await rpc('EzwWhf', []).catch(() => null))?.[6]?.[3];
  console.log(`${hogs.length} of ${keys.length} items count against storage: ${gb(total)}` +
    (used ? ` (Google says Photos uses ${gb(used)})` : '') +
    (unknown || checked < keys.length ? `. ${unknown + keys.length - checked} items returned no storage info, left alone.` : '.'));
  console.table(hogs.slice(0, 25).map(({ file, bytes, original }) => ({ file, MB: +(bytes / 1e6).toFixed(1), original })));
  if (!hogs.length || ACTION === 'report') return;

  if (ACTION === 'album') {
    // ponytail: albums cap at 20k items, so overflow goes to "<name> (2)", "(3)"…
    for (let i = 0; i < hogs.length; i += 20000) {
      const name = i ? `${ALBUM_NAME} (${i / 20000 + 1})` : ALBUM_NAME;
      const album = (await rpc('OXvT9d', [name, null, 2]))?.[0]?.[0];
      if (!album) throw new Error(`could not create album "${name}"`);
      const part = hogs.slice(i, i + 20000);
      for (let j = 0; j < part.length; j += 250) {
        await rpc('E1Cajb', [part.slice(j, j + 250).map((h) => h.mediaKey), album]);
        console.log(`"${name}": added ${Math.min(j + 250, part.length)}/${part.length}`);
      }
    }
  } else if (ACTION === 'trash') {
    if (!confirm(`Move ${hogs.length} items (${gb(total)}) to Bin?\nThey stay restorable from Bin for 60 days.`)) return;
    for (let j = 0; j < hogs.length; j += 250) {
      await rpc('XwAOJf', [null, 1, hogs.slice(j, j + 250).map((h) => h.dedupKey), 3]);
      console.log(`Binned ${Math.min(j + 250, hogs.length)}/${hogs.length}`);
    }
  }
  console.log('Done.');
})();
