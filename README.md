# Can I Run It? V2.1

Render-stable version: Express backend + static SPA frontend. No Next.js, no Tailwind build, no TypeScript build.

## Render

Build Command:
```bash
rm -rf node_modules package-lock.json && npm install
```

Start Command:
```bash
npm start
```

## Environment Variables

Required:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Recommended for auto schema setup:
```env
SUPABASE_DB_URL=postgresql://...
```

If you do not set `SUPABASE_DB_URL`, run `supabase/schema.sql` once in the Supabase SQL editor.

## Storage

Create a private Supabase Storage bucket named:
```txt
run-screenshots
```

## Auth Email Branding

Supabase Dashboard -> Authentication -> Email Templates.
Set product name to Can I Run It and customize the confirmation text.
