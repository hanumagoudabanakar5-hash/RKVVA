require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent("Hello world");
    console.log("Success! Embedding generated.");
    console.log("Values length:", result.embedding.values.length);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
