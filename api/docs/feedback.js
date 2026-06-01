import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl    = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey    = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const db             = createClient(supabaseUrl, supabaseKey);

  const { id, helpful } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'Missing article ID' });
  }

  try {
    // 1. Fetch the existing article
    const { data: article, error: fetchError } = await db
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !article) {
      throw new Error(fetchError?.message || 'Article not found');
    }

    // 2. Unpack current json_ld metadata
    let meta = {};
    if (article.json_ld) {
      if (typeof article.json_ld === 'object') {
        meta = article.json_ld;
      } else {
        try {
          meta = JSON.parse(article.json_ld || '{}');
        } catch (e) {
          meta = {};
        }
      }
    }

    // 3. Initialize counts
    if (meta.helpful_count === undefined) meta.helpful_count = 0;
    if (meta.not_helpful_count === undefined) meta.not_helpful_count = 0;

    // 4. Increment the correct counter
    if (helpful) {
      meta.helpful_count += 1;
    } else {
      meta.not_helpful_count += 1;
    }

    // 5. Update the post in the DB
    const { data: updatedRow, error: updateError } = await db
      .from('blog_posts')
      .update({ json_ld: meta })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      success: true,
      helpful_count: meta.helpful_count,
      not_helpful_count: meta.not_helpful_count
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('feedback API error:', msg);
    return res.status(400).json({ error: msg });
  }
}
