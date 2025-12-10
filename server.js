import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// --- Fallback simple por si OpenAI falla ---
function fakeTranslate(text, targetLang) {
  // Ejemplos solo para que veas que sí cambia algo
  if (targetLang === "en") return "[EN] " + text;
  if (targetLang === "fr") return "[FR] " + text;
  if (targetLang === "de") return "[DE] " + text;

  // Si no conocemos el idioma, devolvemos igual
  return text;
}

// --- Traducción real con OpenAI ---
async function translateWithOpenAI(text, targetLang) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("No hay OPENAI_API_KEY, usando fakeTranslate");
    return fakeTranslate(text, targetLang);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      // Usa el modelo que tengas disponible (ej: "gpt-4.1-mini" o "gpt-4o-mini")
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are a translation engine. Translate ALL user text to the language with ISO code "${targetLang}". Respond ONLY with the translated text, no explanations.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Error OpenAI:", response.status, data);
    return fakeTranslate(text, targetLang); // fallback
  }

  const translated = data.choices?.[0]?.message?.content?.trim();
  return translated || fakeTranslate(text, targetLang);
}

// Ruta de prueba en el navegador
app.get("/", (req, res) => {
  res.send("API de traducción Mich360 (OpenAI + fallback) está funcionando ✅");
});

app.post("/translate", async (req, res) => {
  const { text, targetLang } = req.body;

  if (!text || !targetLang) {
    return res
      .status(400)
      .json({ error: "Faltan parámetros text o targetLang" });
  }

  try {
    const translated = await translateWithOpenAI(text, targetLang);
    return res.status(200).json({ translated });
  } catch (err) {
    console.error("Error backend /translate:", err);
    return res.status(200).json({
      translated: fakeTranslate(text, targetLang),
      error: "Excepción en backend, se devuelve traducción falsa",
    });
  }
});

app.listen(3001, () => {
  console.log("Servidor de traducción listo (demo): http://localhost:3001");
});
