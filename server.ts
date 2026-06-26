import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined in environment variables. Gemini calls will fail.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key || "",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

async function generateContentWithFallback(params: {
  contents: any;
  config?: any;
}): Promise<any> {
  const ai = getGeminiClient();
  // Models to try in order of preference
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    // Retry each model up to 2 times
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Attempting Gemini generation using model: ${model} (attempt ${attempt}/2)`);
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (error: any) {
        lastError = error;
        console.warn(`Gemini generation failed for ${model} on attempt ${attempt}:`, error.message || error);
        
        // Wait briefly (with slight backoff) before retrying/falling back
        const delay = attempt * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Failed to generate content with all fallback models.");
}

function parseJsonSafe(text: string): any {
  const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleanText);
  } catch (error) {
    // Try to extract JSON between the first '{' and the last '}'
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonCandidate = cleanText.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonCandidate);
      } catch (nestedError) {
        console.error("Failed to parse extracted JSON block:", nestedError);
      }
    }
    throw error;
  }
}

// API routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "Missing audioBase64 data" });
    }

    const response = await generateContentWithFallback({
      contents: [
        {
          inlineData: {
            data: audioBase64,
            mimeType: mimeType || "audio/webm",
          }
        },
        {
          text: "You are an expert audio transcription system. Your task is to transcribe this audio file word-for-word as accurately as possible. Support any accents, dialects, and languages. After the transcription, also detect the primary spoken language and return it.\n\nReturn your response in a strict JSON format matching this schema:\n{\n  \"text\": \"The transcription of the audio here\",\n  \"detectedLanguage\": \"English (or Spanish, French, Hindi, Japanese, etc.)\"\n}\n\nDo not include any markdown backticks, preambles, or explanations outside of the JSON block."
        }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "";
    const resultJson = parseJsonSafe(resultText);
    
    res.json(resultJson);
  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: error.message || "Failed to transcribe audio." });
  }
});

app.post("/api/generate-email", async (req, res) => {
  try {
    const { transcription, tone, sourceLanguage, targetLanguage, recipientName, additionalContext } = req.body;
    if (!transcription) {
      return res.status(400).json({ error: "No transcription provided" });
    }

    const prompt = `You are an expert Agentic AI Email Assistant. Convert the following spoken voice transcript into a highly polished, professional, structured email draft.

Voice Transcript: "${transcription}"
Recipient Name: "${recipientName || "Valued Contact"}"
Tone: "${tone || "Professional"}"
Source Language: "${sourceLanguage || "Auto Detect"}"
Target Language: "${targetLanguage || "English"}"
Additional Context / Instructions: "${additionalContext || "None"}"

Please perform the following steps:
1. Identify the sender's core intent.
2. Extract any key details/information mentioned (such as dates, times, reasons, next steps).
3. Generate a clear, concise, and highly relevant Subject Line.
4. Compose the complete email body in the specified Target Language. The body should be well-structured with clear paragraphs, salutations, body content, and sign-off. Ensure it is written in the chosen Tone (e.g. Professional, Friendly, Formal, Apologetic, Executive, Customer Support, Persuasive) and respects any additional context. Use HTML tags like <p>, <br>, <strong> for formatting to make it look elegant.
5. Create a clear Call-to-Action (CTA) or suggested follow-up action.

Return your response in a strict JSON format matching this schema:
{
  "subject": "The generated email subject line",
  "body": "The generated email body in HTML format (using <p>, <br>, etc.)",
  "intent": "The identified core intent of the email",
  "keyInfo": ["extracted fact 1", "extracted fact 2", ...],
  "callToAction": "The suggested follow-up action or call-to-action"
}

Do not include any markdown formatting, backticks, or text other than the JSON string. Ensure the JSON is syntactically valid.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "";
    const resultJson = parseJsonSafe(resultText);

    res.json(resultJson);
  } catch (error: any) {
    console.error("Email generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate email." });
  }
});

app.post("/api/translate-email", async (req, res) => {
  try {
    const { subject, body, targetLanguage, tone } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ error: "Missing subject or body" });
    }

    const prompt = `Translate the following email subject and HTML body into the target language: "${targetLanguage}".
Ensure the tone matches: "${tone}". Keep all HTML structure (like <p>, <br>, <strong>) completely intact.

Original Subject: "${subject}"
Original Body: "${body}"

Return your response in a strict JSON format:
{
  "subject": "Translated subject line",
  "body": "Translated HTML body"
}

Do not include any markdown backticks or extra text outside the JSON block.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "";
    const resultJson = parseJsonSafe(resultText);

    res.json(resultJson);
  } catch (error: any) {
    console.error("Translation error:", error);
    res.status(500).json({ error: error.message || "Failed to translate email." });
  }
});

app.post("/api/ai-action", async (req, res) => {
  try {
    const { action, text, tone, targetLanguage, additionalContext, templateTitle, fields } = req.body;
    
    let systemInstruction = "";
    let userPrompt = "";

    if (action === "template") {
      systemInstruction = "You are an expert AI Email Writer. Generate a complete, polished email from the structured template fields provided.";
      userPrompt = `Template Title: ${templateTitle || "Custom Template"}
Fields:
${JSON.stringify(fields, null, 2)}
Tone: ${tone || "Professional"}
Target Language: ${targetLanguage || "English"}
Additional Instructions: ${additionalContext || "None"}

Please output:
1. Subject line.
2. Complete formatted HTML email body (using <p>, <br>, <strong>, etc.).
3. Core intent of the email.
4. Key information highlighted.
5. Next steps or call to action.`;
    } else {
      // General rewrite/improve/shorten/expand/etc.
      systemInstruction = "You are an expert AI Email Assistant. You must perform the requested quick action on the given email or rough text.";
      userPrompt = `Action to perform: ${action}
Original Text: "${text || ""}"
Tone: ${tone || "Professional"}
Target Language: ${targetLanguage || "English"}
Additional Instructions / Context: ${additionalContext || "None"}

Actions can be:
- "improve": Enhance overall writing quality, flow, and clarity.
- "rewrite": Rewrite the text entirely keeping the same core message.
- "shorten": Make the email more concise and to the point.
- "expand": Add professional detail and expand on the points mentioned.
- "grammar": Correct spelling, punctuation, and grammatical mistakes while retaining content.
- "subject": Create a highly compelling, relevant subject line for the email.
- "tone": Rewrite the email specifically adjusting the tone to "${tone}".
- "compose": Convert rough notes or a brief description into a fully-realized email.

Please return a fully generated/modified email draft including subject and body.`;
    }

    const prompt = `${systemInstruction}

${userPrompt}

Return your response in a strict JSON format matching this schema:
{
  "subject": "The email subject line",
  "body": "The email body in HTML format (using <p>, <br>, etc.)",
  "intent": "Brief identified intent or summary of change",
  "keyInfo": ["key details extracted or highlights of the update"],
  "callToAction": "Brief suggested follow-up action or next steps"
}

Do not include any markdown formatting or text outside of the JSON block.`;

    const response = await generateContentWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "";
    const resultJson = parseJsonSafe(resultText);

    res.json(resultJson);
  } catch (error: any) {
    console.error("AI action error:", error);
    res.status(500).json({ error: error.message || "Failed to execute AI action." });
  }
});

app.post("/api/gmail/create-draft", async (req, res) => {
  try {
    let token = req.body.accessToken;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Missing Google OAuth access token" });
    }

    const { to, subject, body } = req.body;

    const emailParts = [
      `To: ${to || ""}`,
      `Subject: ${subject || ""}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      body || ""
    ];
    const emailString = emailParts.join('\r\n');
    
    const base64 = Buffer.from(emailString, 'utf-8').toString('base64');
    const raw = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          raw: raw
        }
      })
    });

    if (!gmailRes.ok) {
      const errorText = await gmailRes.text();
      throw new Error(`Gmail API error: ${gmailRes.status} ${errorText}`);
    }

    const data = await gmailRes.json();
    res.json({ success: true, draft: data });
  } catch (error: any) {
    console.error("Gmail draft creation error:", error);
    res.status(500).json({ error: error.message || "Failed to create Gmail draft." });
  }
});

// Vite middleware in development, serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
