# Can I Run It? v2.1 Render Stable

Render settings:

Build Command:
```bash
rm -rf node_modules package-lock.json && npm install
```

Start Command:
```bash
npm start
```

Environment variables:
```env
NODE_ENV=production
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_URL=... # optional but recommended for auto-migration
```

If you do not set `SUPABASE_DB_URL`, run `supabase/schema.sql` once in Supabase SQL Editor.

Security notes:
- Service role key is only used server-side.
- Screenshot bucket is private.
- Upload limit: 5MB, jpg/png/webp only.
- API validates authenticated Supabase users before reading/writing data.
- RLS policies are included in schema.sql.
