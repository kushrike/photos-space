# photos-space

Find every Google Photos item that counts against your Google storage, then either report them, put them in an album, or move them to the Bin.

`space-hogs.js` is a script with no dependencies that you paste once into the browser console on photos.google.com. It uses your existing login, so there's no extension or OAuth setup.

## Why it uses the internal API

Since March 2025, Google's official Photos Library API can only see photos that the calling app uploaded itself. So the only way to read the "counts against storage" flag for every item is through the same internal calls the Photos web app makes. The call names and data shapes come from [Google Photos Toolkit](https://github.com/xob0t/Google-Photos-Toolkit) (MIT license); only the parts this job needs are kept.

## How to use it

1. Open https://photos.google.com, then open the console with Cmd+Opt+J (Ctrl+Shift+J on Windows/Linux).
2. Edit line 9: `ACTION = 'report'`, `'album'` (the default) or `'trash'`.
3. Paste the whole file and press Enter.

## What it does

- Lists your entire library, including Archive.
- Checks each item's storage flag in batches of 5,000. Each item comes back marked as counting against storage or free, along with the bytes it counts for.
- Prints how many items count and their total size, next to Google's own "Photos uses X GB" figure, plus a table of the 25 biggest. The full list stays in `window.spaceHogs`.
- `album` puts them all in a new album called "Takes up space". Albums hold at most 20k items, so extra items go into "(2)", "(3)" and so on.
- `trash` asks you to confirm first, then moves them to the Bin, where you can restore them for 60 days.
- Items that come back with no storage info are left alone.

## Things to know

- **Not yet run against a real account.** It's checked with `space-hogs.test.mjs` (`node space-hogs.test.mjs`), which feeds the script fake responses built in the same shape as Google Photos Toolkit's recorded real ones. On your first run, use `report` and check that the flagged total roughly matches the "Photos uses" figure before using `trash`.
- **What actually counts:** anything in Original quality, plus anything uploaded after June 1, 2021, unless your device gets free storage (older Pixels). If most of your library is from after 2021, expect nearly everything to be flagged.
- **It can break without warning.** Google can change these internal calls at any time. If it fails, the error names the call that broke.
- **Read before you paste.** Pasting code into the console gives it full access to your logged-in Photos session. The script is about 90 lines, so check what it does first.
