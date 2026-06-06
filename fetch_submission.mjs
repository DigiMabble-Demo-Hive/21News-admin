import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let supabaseUrl = '';
let supabaseKey = '';

const envPaths = [
  './.env',
  './.env.local',
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const matchUrl = line.match(/VITE_SUPABASE_URL\s*=\s*(.+)/);
      const matchKey = line.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.+)/);
      if (matchUrl) supabaseUrl = matchUrl[1].trim().replace(/['"]/g, '');
      if (matchKey) supabaseKey = matchKey[1].trim().replace(/['"]/g, '');
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('contact_submissions')
    .select('*')
    .eq('company', 'profile_change_request');

  if (error) {
    console.error('Error:', error);
    return;
  }

  for (const row of data) {
    let msg = {};
    try {
      msg = JSON.parse(row.message);
    } catch (e) {
      continue;
    }
    const isOrg = msg.entity_type === 'organization' || msg.proposed?.organization_name !== undefined;
    if (!isOrg) continue;

    console.log('--- Row ID:', row.id, 'Email/User ID:', row.email, 'Name:', row.name);
    console.log('Proposed keys:', Object.keys(msg.proposed || {}));
    console.log('Original keys:', Object.keys(msg.original || {}));
    if (msg.proposed) {
      for (const [k, v] of Object.entries(msg.proposed)) {
        if (v !== undefined) {
          console.log(`Proposed Field '${k}':`, typeof v === 'object' ? JSON.stringify(v).slice(0, 100) : v);
        }
      }
    }
  }
}

main();
