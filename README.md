## Sort Quiz

A single-page, offline-friendly pub quiz inspired by the "Sortieren" game from Schlag den Raab. Place items into a vertical timeline in the correct order. A wrong placement ends the game.

### Play online
- Live site: [sort-quiz.com](https://www.sort-quiz.com/)

### How to use locally
- Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
- Click "Download Template" and save the JSON file.
- Fill in your quiz data:
  - `title`: string (e.g. "Chess World Champions")
  - `lowerLabel` / `upperLabel`: extremes (e.g. "Oldest" / "Newest")
  - `items`: array of strings in the correct order from lower → upper
- Upload your JSON via "Upload and Start Quiz" to start the game.

### Ready‑made quizzes carousel
- The app shows a carousel of ready‑made quizzes sourced from the `quizzes/` folder.
- You can click any card to start that quiz immediately.

### Contribute a new quiz
We welcome contributions! The easiest way to add a new ready‑made quiz is via Pull Request.

1. Fork this repo
2. Add a new JSON file under `quizzes/` (example structure below)
3. Update `quizzes/manifest.json` to include your file and a friendly `title`
4. Open a PR with a short description of your quiz

Example JSON (order from lowerLabel → upperLabel):
```json
{
  "title": "Animal sizes",
  "lowerLabel": "Small",
  "upperLabel": "Big",
  "_hint": "List at least 2 items from lowerLabel → upperLabel (Small → Big). Max 20 items.",
  "items": [
    "Ant", "Spider", "Mouse", "Raven", "Cat", "Dog", "Elephant"
  ]
}
```
Guidelines:
- Keep between 2 and 20 items (the app will downsample to 20 while preserving order)
- Use clear, unambiguous item names
- Match the sort direction with `lowerLabel` → `upperLabel`

We’d love to feature more topics—history, sports, pop culture, science—so please contribute a quiz!

### Development
No build step is required. Edit `index.html`, `styles.css`, and `app.js` and refresh. 