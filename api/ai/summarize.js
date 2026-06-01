import { getAiClient } from './aiClient.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { content } = req.body || {};
  if (!content) return res.status(400).json({ error: 'content required' });

  try {
    const { client, model } = getAiClient();

    const response = await client.chat.completions.create({
      model: model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: `Summarise this article in exactly 2 sentences.
Return ONLY JSON: { "summary": "..." }

Article: ${content.replace(/<[^>]*>/g, ' ').substring(0, 3000)}`,
        },
      ],
    });

    const json = JSON.parse(response.choices[0].message.content);
    return res.status(200).json(json);
  } catch (err) {
    console.error('AI summarize error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'AI request failed' });
  }
}
