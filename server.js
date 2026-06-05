import express from "express";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_HOSTS = new Set([
  "innerai.me",
  "www.innerai.me",
  "localhost:3000",
  "127.0.0.1:3000"
]);

app.use((req, res, next) => {
  const host = (req.headers.host || "").toLowerCase().replace(/\.$/, "");

  if (!ALLOWED_HOSTS.has(host)) {
    return res.status(403).send("Forbidden.");
  }

  next();
});

if (!process.env.OPENAI_API_KEY) {
  console.warn("Missing OPENAI_API_KEY environment variable.");
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json());
app.use(express.static("public"));

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing message." });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are InnerAI, a private personal assistant interface."
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    res.json({
      reply: response.choices[0]?.message?.content || ""
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OpenAI request failed." });
  }
});

app.listen(PORT, () => {
  console.log(`innerai running on port ${PORT}`);
});
