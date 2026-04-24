# Launch Ladder

Climb from idea to release with visible launch steps and blockers.

![Launch Ladder preview](docs/preview.svg)

Launch Ladder is a small local-first planning tool for solo builders, operators, and creative teams who want a cleaner way to manage steps. Add items, score the signal, track the friction, and keep the strongest opportunities visible without needing a backend or build step.

## Features

- Local-first persistence with `localStorage`
- Search and filter controls
- Ranked list sorted by signal minus friction
- Inline editor for title, notes, type, status, score, and effort
- Import/export JSON backups
- Re-seed action for resetting the sample board
- Keyboard shortcuts: `N` for new, `/` for search
- No build tooling, just open in a browser

## Quick start

```bash
git clone https://github.com/<you>/launch-ladder.git
cd launch-ladder
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Data shape

```json
{
  "boardTitle": "Micro-product launch ladder",
  "items": [
    {
      "title": "Choose one narrow promise",
      "category": "Idea",
      "state": "Done",
      "score": 10,
      "effort": 1
    }
  ]
}
```

## Privacy

Everything stays in your browser unless you export a JSON backup.

## License

MIT
