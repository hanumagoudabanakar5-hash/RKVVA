require('dotenv').config();

async function testFetch() {
  const key = process.env.GEMINI_API_KEY.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      console.log("✅ API Key is VALID. Available models:");
      data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log(`❌ API Key check FAILED (${res.status}):`, data);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testFetch();
