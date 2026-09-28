# format.json

A fast, no-nonsense JSON formatter, validator, and minifier in pure HTML/CSS/JS.

Runs entirely in your browser. No dependencies, no build steps, no tracking, and no servers.

## Features

- Format JSON (2 spaces, 4 spaces, or tabs)
- Minify JSON
- Validate syntax with line and column error indicators
- Syntax highlighting
- Character and line counter
- Load example JSON
- Upload and download `.json` files
- Copy output to clipboard
- Responsive layout with dark editor panes

## Usage

Just open `index.html` in any web browser.

```bash
# Optional: run with a local static server
python -m http.server 8000
```

## Keyboard Shortcuts

- `Ctrl + Enter` / `Cmd + Enter` - Format
- `Ctrl + M` / `Cmd + M` - Minify
- `Ctrl + K` / `Cmd + K` - Clear editor
- `Tab` - Insert indent
- `Esc` - Release focus from editor for keyboard navigation
- Dark and Light mode toggle with local storage persistence
- Mobile-optimized segmented view (Input, Output, Split) with 44px touch targets

## Tech Stack

- HTML5
- CSS3 (custom properties, responsive grid)
- Vanilla JavaScript (`JSON.parse`, `JSON.stringify`)

## License

MIT (c) [hanx](https://hanx.pro) ([hanx.lol](https://hanx.lol))
