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

  const { action, id, data, slug, excludeId } = req.body || {};

  try {
    // ── list ──────────────────────────────────────────────────────
    if (action === 'list') {
      const { data: rows, error } = await db
        .from('blog_posts')
        .select('id, title, slug, status, published_at, created_at, featured_image_url, meta_description, excerpt, canonical_url, json_ld')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ data: rows });
    }

    // ── get ───────────────────────────────────────────────────────
    if (action === 'get') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { data: row, error } = await db
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return res.status(200).json({ data: row });
    }

    // ── create ────────────────────────────────────────────────────
    if (action === 'create') {
      if (!data) return res.status(400).json({ error: 'Missing data' });
      const { data: row, error } = await db
        .from('blog_posts')
        .insert([data])
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ data: row });
    }

    // ── update ────────────────────────────────────────────────────
    if (action === 'update') {
      if (!id || !data) return res.status(400).json({ error: 'Missing id or data' });
      const updates = { ...data };
      if (updates.status === 'published' && !updates.published_at) {
        updates.published_at = new Date().toISOString();
      }
      
      // If setting this post to featured, atomically unfeature other posts in the DB first
      if (updates.canonical_url === 'featured') {
        const { error: unfeatureError } = await db
          .from('blog_posts')
          .update({ canonical_url: '' })
          .neq('id', id)
          .eq('canonical_url', 'featured');
        if (unfeatureError) console.error('Error unfeaturing other posts:', unfeatureError);
      }

      const { data: row, error } = await db
        .from('blog_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ data: row });
    }

    // ── delete ────────────────────────────────────────────────────
    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { error } = await db
        .from('blog_posts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ── slug-check ────────────────────────────────────────────────
    if (action === 'slug-check') {
      if (!slug) return res.status(400).json({ error: 'Missing slug' });
      let query = db
        .from('blog_posts')
        .select('id', { count: 'exact', head: true })
        .eq('slug', slug);
      if (excludeId) query = query.neq('id', excludeId);
      const { count, error } = await query;
      if (error) throw error;
      return res.status(200).json({ unique: count === 0 });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    let msg = '';
    if (err && typeof err === 'object') {
      msg = err.message || err.details || JSON.stringify(err);
    } else {
      msg = String(err);
    }
    console.error('blog API error details:', err);
    return res.status(400).json({ error: msg });
  }
}
