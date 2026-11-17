# ichido

You only live once.
Keep going forward, one step at a time.

ichido is a local-first day tracker. Mark each half-hour of the day as done, or failed with reasons and a note, and see your whole life in weeks ([inspired by waitbutwhy](https://waitbutwhy.com/2014/05/life-weeks.html)). No backend, no accounts: all data stays in your browser until you clear it.

Live at [ichido.leekaize.com](https://ichido.leekaize.com).

## Use

- Click a box: done. Click a done box: pick reasons, add an optional note. Click a failed box to change or clear it.
- Drag paints several boxes in one stroke; the eraser clears; Ctrl+Z undoes.
- Focus list under the grid: type and press Enter to add, click the circle to mark done, click text to edit, x removes.
- Settings holds your birthday and lifespan for the life-in-weeks view; until a birthday is set, that view shows an example grid and a dialog asks for yours. Events colors weeks. Backup in Settings downloads all data as a JSON file and can restore it.

Everything is stored only in your browser (IndexedDB). Clearing site data erases it, so export a backup from Settings if the data matters to you.

Developer notes, data model, and roadmap: [ARCHITECTURE.md](ARCHITECTURE.md).
