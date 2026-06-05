# innerai

Private OpenAI API interface deployed on Render and protected by Cloudflare Access.

## Files

- `server.js` serves the app, blocks direct `innerai.onrender.com` host access, and handles `/api/chat`.
- `public/index.html` is the extracted `/dead/experiments/chat-sandbox/index.html` adapted to run standalone and call `/api/chat`.
- `package.json` defines the Node/Express/OpenAI dependencies.

## Render settings

```txt
Language: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

## Required Render environment variable

```txt
OPENAI_API_KEY=your_key_here
```

Do not commit the key to GitHub.

## Host lock

Allowed hosts are:

```txt
innerai.me
www.innerai.me
localhost:3000
127.0.0.1:3000
```

The direct Render hostname should return `Forbidden.`
