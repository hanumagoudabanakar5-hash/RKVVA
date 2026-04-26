require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  try {
    // Try explicitly setting API version to v1
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    console.log("Checking with explicit v1...");
    const models = ["text-embedding-004", "embedding-001"];
    
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m }, { apiVersion: 'v1' });
        await model.embedContent("test");
        console.log(`✅ Model ${m} (v1) is WORKING`);
      } catch (e) {
        console.log(`❌ Model ${m} (v1) FAILED: ${e.message}`);
      }
    }
  } catch (err) {
    console.error("Discovery failed:", err);
  }
}

listModels();
