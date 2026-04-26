require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testFlash() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hello!");
    console.log("✅ Gemini 1.5 Flash is WORKING");
    console.log("Response:", result.response.text());
  } catch (err) {
    console.log(`❌ Gemini 1.5 Flash FAILED: ${err.message}`);
  }
}

testFlash();
