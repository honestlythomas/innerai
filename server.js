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
const MAX_CHAT_HISTORY_MESSAGES = 40;

function resolveOpenAIModel(requestedModel) {
  return ALLOWED_OPENAI_MODELS.includes(requestedModel)
    ? requestedModel
    : DEFAULT_OPENAI_MODEL;
}

function getRequestedModel(body) {
  return typeof body?.model === "string" ? body.model.trim() : "";
}

function sanitizeHistoryMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((entry) => {
      return entry
        && (entry.role === "user" || entry.role === "assistant")
        && typeof entry.content === "string"
        && entry.content.trim();
    })
    .map((entry) => ({
      role: entry.role,
      content: entry.content
    }))
    .slice(-MAX_CHAT_HISTORY_MESSAGES);
}

async function createChatCompletionWithFallback(model, messages) {
  let usedModel = model;
  try {
    const response = await client.chat.completions.create({
      model: usedModel,
      messages
    });
    return { response, usedModel };
  } catch (err) {
    const isUnavailableModel = err?.code === "model_not_found" || err?.status === 404;
    if (!isUnavailableModel || usedModel === DEFAULT_OPENAI_MODEL) {
      throw err;
    }
    console.warn(`Requested model unavailable; falling back to ${DEFAULT_OPENAI_MODEL}.`);
    usedModel = DEFAULT_OPENAI_MODEL;
    const response = await client.chat.completions.create({
      model: usedModel,
      messages
    });
    return { response, usedModel };
  }
}

function cleanGeneratedTitle(value) {
  const cleaned = String(value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^title:\s*/i, "")
    .replace(/^chat about\s+/i, "")
    .replace(/[*_`#<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.split(/\s+/).slice(0, 6).join(" ");
}

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;
    const systemPrompt = typeof req.body?.systemPrompt === "string" ? req.body.systemPrompt.trim() : "";
    const requestedModel = getRequestedModel(req.body);

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing message." });
    }

    const effectiveSystemPrompt = systemPrompt || SYSTEM_PROMPT;
    const model = resolveOpenAIModel(requestedModel);
    const historyMessages = sanitizeHistoryMessages(req.body?.messages);
    const openaiMessages = [
      {
        role: "system",
        content: effectiveSystemPrompt
      }
    ];
    if (historyMessages.length) {
      openaiMessages.push(...historyMessages);
    } else {
      openaiMessages.push({
        role: "user",
        content: message
      });
    }

    console.log("Received /api/chat request");

    const { response, usedModel } = await createChatCompletionWithFallback(model, openaiMessages);

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

app.post("/api/title", async (req, res) => {
  try {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    const assistantReply = typeof req.body?.assistantReply === "string" ? req.body.assistantReply.trim() : "";
    const systemPrompt = typeof req.body?.systemPrompt === "string" ? req.body.systemPrompt.trim() : "";
    const requestedModel = getRequestedModel(req.body);

    if (!message) {
      return res.status(400).json({ error: "Missing message." });
    }

    const model = resolveOpenAIModel(requestedModel);
    const titleRequest = [
      "Create a brief chat title.",
      "Rules: 2 to 6 words, no quotes, no markdown, no 'Title:', no 'Chat about...'.",
      systemPrompt ? `System prompt context: ${systemPrompt}` : "",
      `First user message: ${message}`,
      assistantReply ? `First assistant reply: ${assistantReply}` : ""
    ].filter(Boolean).join("\n");

    const { response, usedModel } = await createChatCompletionWithFallback(model, [
      {
        role: "system",
        content: "You generate short plain-text chat titles only."
      },
      {
        role: "user",
        content: titleRequest
      }
    ]);

    const title = cleanGeneratedTitle(response.choices[0]?.message?.content || "");
    if (!title) {
      return res.status(500).json({ error: "Title generation failed." });
    }

    res.json({
      title,
      model: usedModel
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Title generation failed." });
  }
});

app.listen(PORT, () => {
  console.log(`innerai running on port ${PORT}`);
});
