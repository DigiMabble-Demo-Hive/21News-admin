import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { content } = req.body || {};
  if (!content) return res.status(400).json({ error: 'content required' });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: `Generate 5 FAQ pairs for this article.
Return ONLY JSON: { "faqs": [{"question": "...", "answer": "..."}] }

Article content: ${content.replace(/<[^>]*>/g, ' ').substring(0, 3000)}`,
        },
      ],
    });

    const json = JSON.parse(response.choices[0].message.content);
    return res.status(200).json(json);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'AI request failed' });
  }
}
