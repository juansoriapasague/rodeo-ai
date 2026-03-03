import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "https://rodeoshop.dk");
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

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI key missing" });
    }

    const profile = Object.entries(answers)
      .map(([k,v]) => `${k}: ${v}`)
      .join("\n");

    const prompt = `
Customer profile:
${profile}

Available products:
${JSON.stringify(products, null, 2)}

Select the 4 best product handles.
Return ONLY a JSON array.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a haircare product expert." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    });

    const aiText = completion.choices[0].message.content;

    const match = aiText.match(/\[.*\]/s);
    const handles = match ? JSON.parse(match[0]) : [];

    const recommended = products.filter(p =>
      handles.includes(p.handle)
    );

    return res.status(200).json({
      success: true,
      products: recommended
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
