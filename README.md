# innerai Render starter

Minimal Node/Express starter for a private OpenAI API interface.

## Files

- `server.js` serves the site and handles `/api/chat`
- `public/index.html` is the browser UI
- `package.json` defines the Node start command and dependencies

## Render settings

Use:

```txt
Language: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

Add this environment variable in Render, not in GitHub:

```txt
OPENAI_API_KEY=your_key_here
```

## Local test

```bash
npm install
OPENAI_API_KEY=your_key_here npm start
```

Then open:

```txt
http://localhost:3000
```
