# ichido

You only live once.
Keep going forward, one step at a time.

ichido is a local-first day tracker. Mark each half-hour of the day as done, or failed with reasons and a note, and see your whole life in weeks ([inspired by waitbutwhy](https://waitbutwhy.com/2014/05/life-weeks.html)). All data lives in your browser; an optional self-hosted sync keeps one backup copy on your own Cloudflare account.

Live at [ichido.leekaize.com](https://ichido.leekaize.com).

## Use

- Click a box: done. Click a done box: pick reasons, add an optional note. Click a failed box to change or clear it.
- Drag paints several boxes in one stroke; the eraser clears; Ctrl+Z undoes.
- Focus list left of the life view, under the day grid: type and press Enter to add, click the circle to mark done, click text to edit, x removes.
- Habit tracker below the focus list: Enter adds a habit, clicking its box marks it achieved today (green) and clicking again cancels. Each box shows a strength bar over the last 30 days and the current streak; click text to rename, x deletes.
- The life-in-weeks view sits right of the focus list as a small static snapshot; click it (or the expand button) to open the full grid below the focus list, collapse returns to the mini.
- Settings holds your birthday and lifespan for the life-in-weeks view; until a birthday is set, that view shows an example grid and a dialog asks for yours. Events colors weeks. Backup in Settings downloads all data as a JSON file and can restore it. Sync in Settings (Push/Pull) mirrors all data to your own Cloudflare Worker after you paste a sync token once. With a token set, sync also runs by itself: edits push to the server within seconds, and every device using the same token merges them in when it loads and once a minute while open.

Everything is stored in your browser (IndexedDB). Sync additionally keeps one server-side copy on your Cloudflare account and keeps every browser with the same token in step. Clearing site data erases the local copy, so export a backup or Push if the data matters to you.

Developer notes, data model, and roadmap: [ARCHITECTURE.md](ARCHITECTURE.md).
