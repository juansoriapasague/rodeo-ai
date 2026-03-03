import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {

  // ===== PROPER CORS HANDLING =====
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI key missing" });
    }

    const { answers, products } = req.body;

    if (!answers || !products) {
      return res.status(400).json({ error: "Missing data" });
    }

    const profile = Object.entries(answers)
      .map(([k,v]) => `${k}: ${v}`)
      .join(", ");

    const productList = products
      .map(p => `${p.title} — ${p.description}`)
      .join("\n");

    const prompt = `
Customer profile:
${profile}

Available products:
${productList}

Select 3-5 best matching products.
Return ONLY product titles as JSON array.
Example:
["Product 1", "Product 2"]
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional hair care expert." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    const text = completion.choices[0].message.content;

    let selectedTitles;
    try {
      selectedTitles = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: "AI did not return valid JSON", raw: text });
    }

    const matched = products.filter(p =>
      selectedTitles.includes(p.title)
    );

    return res.status(200).json({
      success: true,
      products: matched
    });

  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      details: error.message
    });
  }
}
