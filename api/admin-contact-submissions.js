import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const db = createClient(supabaseUrl, supabaseServiceKey);

  const { action, id, data } = req.body || {};

  try {
    if (action === 'list') {
      const { data: rows, error } = await db
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        const msg = error.message || '';
        if (msg.includes('does not exist') || msg.includes('schema cache') || error.code === '42P01') {
          return res.status(200).json({ data: [], tableNotFound: true });
        }
        throw error;
      }
      return res.status(200).json({ data: rows });
    }

    if (action === 'update_status') {
      if (!id || !data?.status) return res.status(400).json({ error: 'Missing id or status' });
      const updatePayload = { status: data.status };
      if (data.message !== undefined) {
        updatePayload.message = data.message;
      }
      const { data: rows, error } = await db
        .from('contact_submissions')
        .update(updatePayload)
        .eq('id', id)
        .select();
      if (error) throw error;
      return res.status(200).json({ data: rows?.[0] });
    }

    if (action === 'delete') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { error } = await db
        .from('contact_submissions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    const msg = err?.message || (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
    console.error('admin-contact-submissions error:', err);
    return res.status(400).json({ error: msg });
  }
}
