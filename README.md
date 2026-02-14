# JLPT Vocabulary Master v10

A web-based Japanese vocabulary study application for JLPT preparation.

## Features

- **Study Tab**: Goi (vocabulary), Kanji, and Self Study sub-tabs
- **SRS Review**: Multiple choice and writing tests with spaced repetition
- **Stories**: Kanji mnemonics and stories
- **Similar Kanji**: Groups of similar-looking kanji for comparison
- **Marking System**: Track your progress with 6 categories
- **Canvas Drawing**: Practice writing kanji

## Project Structure

```
Japanese_study_app_advanced/
├── index.html          # Main HTML entry point
├── css/
│   └── styles.css      # All CSS styles
├── js/
│   ├── app.js          # Main application class
│   ├── config.js       # Constants and configuration
│   ├── data.js         # Database operations (Supabase)
│   ├── utils.js        # Helper functions
│   ├── canvas.js       # Drawing canvas functionality
│   ├── render.js       # Study tab rendering
│   ├── render-srs.js   # SRS tab rendering
│   ├── render-stories.js   # Stories tab rendering
│   ├── render-similar.js   # Similar Kanji tab rendering
│   └── events.js       # Event listeners
└── README.md           # This file
```

## Setup

1. Clone the repository
2. Open `index.html` in a browser (or deploy to GitHub Pages)
3. Sign in with Google
4. Start studying!

## Database

Uses Supabase for:
- Vocabulary data (4,000+ words)
- User markings and progress
- Story and similar kanji groups
- Self-study topics and words

## Tech Stack

- Vanilla JavaScript (ES6 Modules)
- Tailwind CSS
- Supabase (Database & Auth)
- Google OAuth

## Marking Categories

| Icon | Category | Description |
|------|----------|-------------|
| ○ | Not Marked | New/unreviewed |
| ✔ | Monthly Review | Known, needs occasional review |
| 💬 | Can't Converse | Know meaning, can't use in speech |
| ✍ | Can't Write | Can read, but can't write |
| 🤔 | Can't Use | Understand, but can't use naturally |
| ❌ | Don't Know | Need to learn |

## Development

This app uses ES6 modules, so it requires a web server to run locally:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve
```

Then open `http://localhost:8000` in your browser.

## License

MIT
