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

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const profile = Object.entries(answers)
      .map(([k,v]) => `${k}: ${v}`)
      .join("\n");

    const cleanProducts = products.map(p => ({
      title: p.title,
      handle: p.handle,
      description: p.description
    }));

    const prompt = `
You are a professional haircare expert.

Customer profile:
${profile}

Available products:
${JSON.stringify(cleanProducts, null, 2)}

Select the 4 most suitable product handles.

Return ONLY a pure JSON array.
Example:
["handle-1","handle-2","handle-3","handle-4"]
`;

    const geminiRes = await fetch(
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

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(500).json({
        error: "Gemini API error",
        details: geminiData
      });
    }

    const aiText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = aiText.match(/\[.*\]/s);

    if (!jsonMatch) {
      return res.status(500).json({
        error: "AI returned invalid format",
        raw: aiText
      });
    }

    const handles = JSON.parse(jsonMatch[0]);

    const recommended = products.filter(p =>
      handles.includes(p.handle)
    );

    return res.status(200).json({
      success: true,
      products: recommended
    });

  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
}
