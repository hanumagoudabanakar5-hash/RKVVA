require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // In newer SDKs, there might be a listModels method, but we can also use the REST API if needed.
    // However, let's try the common ones first.
    console.log("Checking common models...");
    const models = ["embedding-001", "text-embedding-004", "models/embedding-001", "models/text-embedding-004"];
    
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        await model.embedContent("test");
        console.log(`✅ Model ${m} is WORKING`);
      } catch (e) {
        console.log(`❌ Model ${m} FAILED: ${e.message}`);
      }
    }
  } catch (err) {
    console.error("Discovery failed:", err);
  }
}

listModels();
