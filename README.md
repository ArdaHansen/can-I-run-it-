# Can I Run It V2 Render Stable

This version avoids Next.js build problems on Render. It is a secure Node/Express app with a static premium frontend and Supabase integration.

## Render settings

Build Command:
```bash
npm install
```

Start Command:
```bash
npm start
```

## Environment variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-anon-key
NEXT_PUBLIC_APP_URL=https://your-render-url.onrender.com
```

## Supabase setup
1. Run `supabase/schema.sql` in SQL Editor.
2. Authentication > URL Configuration:
   - Site URL: your Render/custom domain
   - Redirect URL: your Render/custom domain
3. Authentication > Email Templates:
   - Customize Confirm Signup so it looks branded.

## Security included
- Helmet security headers
- CSP locked to Supabase + jsdelivr
- Rate limiting
- Upload MIME + size validation in app and Supabase Storage
- Supabase Row Level Security
- Private storage bucket
- User data isolated by auth.uid()

## Important
V2 stores screenshots and asks users to confirm numbers manually. This is intentional: reliable OCR comes later. Wrong OCR would create unsafe training advice.
