require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testPro() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Hello!");
    console.log("✅ Gemini Pro is WORKING");
    console.log("Response:", result.response.text());
  } catch (err) {
    console.log(`❌ Gemini Pro FAILED: ${err.message}`);
  }
}

testPro();
