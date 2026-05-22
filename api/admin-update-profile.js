import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, updateData, table } = req.body;

    if (!userId || !updateData) {
      return res.status(400).json({ error: 'Missing userId or updateData in request body' });
    }

    const targetTable = table || 'entities_master';
    const ALLOWED_TABLES = ['entities_master', 'user_details', 'master_organization_entities', 'organization_details'];
    if (!ALLOWED_TABLES.includes(targetTable)) {
      return res.status(400).json({ error: 'Invalid table specified' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    let { data, error } = await supabaseClient
      .from(targetTable)
      .update(updateData)
      .eq('user_id', userId)
      .select();

    if (error) throw error;

    // Upsert guard: if update matched 0 rows on user_details or organization_details, insert a new row
    if ((!data || data.length === 0) && (targetTable === 'user_details' || targetTable === 'organization_details')) {
      const upsertResult = await supabaseClient
        .from(targetTable)
        .upsert({ user_id: userId, ...updateData }, { onConflict: 'user_id' })
        .select();

      if (upsertResult.error) throw upsertResult.error;
      data = upsertResult.data;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : (typeof error === 'object' ? JSON.stringify(error) : String(error));
    console.error('API Error:', error);
    return res.status(400).json({ error: errorMessage });
  }
}
