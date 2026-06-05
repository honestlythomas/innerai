import "dotenv/config";
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

const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const ALLOWED_OPENAI_MODELS = [
  DEFAULT_OPENAI_MODEL,
  "gpt-4.1",
  // Editable model menu entries. Keep entries here only when this API key has access to them.
  "gpt-5",
  "gpt-5-mini",
  "gpt-5.5"
];
const SYSTEM_PROMPT = "You are InnerAI, a private personal assistant interface inside a retro-terminal chat sandbox. Be helpful, direct, a little strange, and keep the user safe. Do not claim to be a different model than the server-provided model name.";

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;
    const systemPrompt = typeof req.body?.systemPrompt === "string" ? req.body.systemPrompt.trim() : "";
    const requestedModel = typeof req.body?.model === "string" ? req.body.model.trim() : "";

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing message." });
    }

    const effectiveSystemPrompt = systemPrompt || SYSTEM_PROMPT;
    const model = ALLOWED_OPENAI_MODELS.includes(requestedModel)
      ? requestedModel
      : DEFAULT_OPENAI_MODEL;
    let usedModel = model;
    const openaiMessages = [
      {
        role: "system",
        content: effectiveSystemPrompt
      },
      {
        role: "user",
        content: message
      }
    ];

    console.log("Received /api/chat request");

    let response;
    try {
      response = await client.chat.completions.create({
        model: usedModel,
        messages: openaiMessages
      });
    } catch (err) {
      const isUnavailableModel = err?.code === "model_not_found" || err?.status === 404;
      if (!isUnavailableModel || usedModel === DEFAULT_OPENAI_MODEL) {
        throw err;
      }
      console.warn(`Requested model unavailable; falling back to ${DEFAULT_OPENAI_MODEL}.`);
      usedModel = DEFAULT_OPENAI_MODEL;
      response = await client.chat.completions.create({
        model: usedModel,
        messages: openaiMessages
      });
    }

    console.log("OpenAI response received");

    res.json({
      model: usedModel,
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
