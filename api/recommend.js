export const config = {
  runtime: "nodejs18.x",
};

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

    const prompt = `
You are a professional haircare expert.

Customer profile:
${profile}

Select the 4 best product handles.
Return ONLY a JSON array.
`;

    const response = await globalThis.fetch(
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

    const jsonMatch = aiText.match(/\[.*\]/s);

    if (!jsonMatch) {
      return res.status(500).json({
        error: "Invalid AI format",
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
      error: "Server crash",
      details: err.toString()
    });
  }
}
