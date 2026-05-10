# Can I Run It? V1

Stable MVP with Next.js, Tailwind v3 and Supabase.

## Render settings
Build Command:
```bash
npm install && npm run build
```
Start Command:
```bash
npm start
```

## Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
```

## Supabase setup
Run `supabase/schema.sql` in Supabase SQL Editor.
Create a private Storage bucket named `run-screenshots` for the later OCR upload feature.

## Notes
V1 uses manual run input because it is more reliable for first deploy. Screenshot OCR can be added after the app is live.
