export default function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKeyLoaded = !!(process.env.SUPABASE_SERVICE_ROLE_KEY);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      supabase_url_loaded: !!supabaseUrl,
      supabase_url_preview: supabaseUrl ? supabaseUrl.slice(0, 30) + '...' : 'MISSING',
      service_role_key_loaded: serviceKeyLoaded,
    }
  });
}
