export default async function handler(req, res) {

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

Select the 4 most suitable products.

Return ONLY valid JSON.
No explanation.
Only this format:
["handle-1","handle-2"]
`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const geminiData = await geminiRes.json();

    const aiText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      return res.status(500).json({ error: "Gemini failed" });
    }

    let handles;

    try {
      handles = JSON.parse(aiText);
    } catch {
      return res.status(500).json({
        error: "Invalid JSON from AI",
        raw: aiText
      });
    }

    const recommended = products.filter(p =>
      handles.includes(p.handle)
    );

    return res.status(200).json({
      success: true,
      products: recommended
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
