export const config = {
  runtime: "nodejs"
};

export default async function handler(req, res) {

  // ✅ CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const { answers, products } = req.body;

    if (!answers || !products) {
      return res.status(400).json({ error: "Missing data" });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    const profile = Object.entries(answers)
      .map(([k,v]) => `${k}: ${v}`)
      .join("\n");

    const prompt = `
You are a professional haircare expert.

Customer profile:
${profile}

Available products:
${JSON.stringify(products, null, 2)}

Select the 4 best product handles.

Return ONLY a JSON array.
`;

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

    if (!response.ok) {
      return res.status(500).json(data);
    }

    const aiText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const match = aiText.match(/\[.*\]/s);

    if (!match) {
      return res.status(500).json({ error: "Invalid AI output", raw: aiText });
    }

    const handles = JSON.parse(match[0]);

    const recommended = Array.isArray(products)
      ? products.filter(p => handles.includes(p.handle))
      : [];

    return res.status(200).json({
      success: true,
      products: recommended
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server crash",
      details: err.message
    });
  }
}
