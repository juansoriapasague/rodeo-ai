export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const { answers, products } = req.body;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    const prompt = "Test prompt";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (err) {
    return res.status(500).json({
      error: "Backend crash",
      details: err.message
    });
  }
}
