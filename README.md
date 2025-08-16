## Sort Quiz

A single-page, offline-friendly pub quiz inspired by the "Sortieren" game from german tv show "Schlag den Raab". Place items into a vertical timeline in the correct order. A wrong placement ends the game.

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

### Contribute a new quiz via Pull Request

We welcome contributions! Adding a new ready‑made quiz is easy and helps grow our collection of interesting topics.

#### Step-by-step guide:

1. **Fork this repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/sort-quiz.git
   cd sort-quiz
   ```
3. **Create a new branch** for your quiz:
   ```bash
   git checkout -b add-quiz-your-topic-name
   ```
4. **Create your quiz file** in the `quizzes/` folder:
   - Use a descriptive filename like `your-topic-name.js`
   - Follow the structure below
5. **Add your quiz to the manifest** by editing `quizzes/quiz-titles.js`
6. **Test locally** by opening `index.html` in your browser
7. **Commit and push** your changes:
   ```bash
   git add .
   git commit -m "Add [Your Quiz Topic] quiz"
   git push origin add-quiz-your-topic-name
   ```
8. **Open a Pull Request** with:
   - Clear title: "Add [Your Quiz Topic] quiz"
   - Brief description of your quiz content
   - Mention the number of items and sort direction

#### Quiz file structure:

Create a new `.js` file in the `quizzes/` folder with this structure:

```javascript
// Your Quiz Topic Quiz Data
window.QUIZ_DATA_YOUR_TOPIC_NAME = {
    "title": "Your Quiz Topic",
    "lowerLabel": "First/Smallest/Oldest", 
    "upperLabel": "Last/Largest/Newest",
    "items": [
        "Item that comes first",
        "Item that comes second", 
        "Item that comes third",
        // ... continue in correct order from lowerLabel → upperLabel
        "Item that comes last"
    ]
};
```

#### Update the manifest:

Add your quiz to `quizzes/quiz-titles.js`:

```javascript
// Add this entry to the QUIZ_TITLES array:
{ 
  id: "your-topic-name", 
  title: "Your Quiz Topic",
  scriptPath: "quizzes/your-topic-name.js"
}
```

#### Guidelines:

- **2-20 items**: Keep between 2 and 20 items (the app will downsample to 20 while preserving order)
- **Clear names**: Use unambiguous item names that most people would recognize
- **Correct order**: Ensure items are listed from `lowerLabel` → `upperLabel` direction
- **Unique topics**: Choose topics that aren't already covered
- **Universal appeal**: Pick topics that are interesting to a broad audience

#### Example topics we'd love to see:
- Historical events, scientific discoveries, movie releases
- Sports records, geographical features, technological milestones  
- Pop culture phenomena, literary works, architectural wonders

Your contribution helps make the quiz more engaging for everyone!

### Development
No build step is required. Edit `index.html`, `styles.css`, and `app.js` and refresh. 