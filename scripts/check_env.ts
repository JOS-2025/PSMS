import * as dotenv from 'dotenv';
dotenv.config();

console.log('--- Environment Check ---');
const vars = [
  'SUPABASE_URL', 'VITE_SUPABASE_URL',
  'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'SERVICE_ROLE_KEY', 'VITE_SERVICE_ROLE_KEY'
];
vars.forEach(v => {
  console.log(`${v}: ${process.env[v] ? '✅ Present' : '❌ Missing'}`);
});
