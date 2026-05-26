import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const db = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await db
      .from('master_organization_entities')
      .select('user_id, organization_name, tagline, industry, location, is_premium, authority_score, updated_at, created_at, approval_status, Payment_status')
      .order('organization_name', { ascending: true });

    if (error) throw error;

    return res.status(200).json({ data: data || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('admin-org-profiles error:', err);
    return res.status(400).json({ error: msg });
  }
}
