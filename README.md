## Sortieren Pub Quiz (Static)

A single-page, offline-friendly pub quiz inspired by the "Sortieren" game from Schlag den Raab. Two players take turns placing items into a timeline in the correct order. Wrong placement loses the game.

### How to use
- Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
- Click "Download Template" and save the JSON file.
- Fill in your quiz data:
  - `title`: string (e.g. "Chess World Champions")
  - `lowerLabel`/`upperLabel`: extremes (e.g. "Oldest" / "Newest")
  - `items`: array of strings in the correct order from lower → upper
- Upload your JSON via "Upload Quiz File" to start the game.

### Gameplay
- One random item is pre-placed.
- There are numbered slots between/around placed items.
- On your turn, drag an item to a slot (or click an item and click a slot, or press number keys 1–9).
- If the placement keeps the timeline sorted, it stays and the turn switches.
- If it’s wrong, you immediately lose.

### Development
No build step is required. Edit `index.html`, `styles.css`, and `app.js` and refresh. 