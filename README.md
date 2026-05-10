# Can I Run It?

Premium Running SaaS MVP mit Supabase Auth, Supabase Database, Storage Upload, Streak-System und Goal-Readiness-Analyse.

## Setup lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Dann öffnen:

```txt
http://localhost:3000
```

## Supabase verbinden

In `.env.local` eintragen:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-publishable-oder-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Dann in Supabase:

1. SQL Editor öffnen
2. Inhalt aus `supabase/schema.sql` ausführen
3. Authentication > Providers > Email aktiv lassen
4. Optional: Email Confirmation für Tests deaktivieren

## Render Deploy

Render Web Service:

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment Variables wie in `.env.example`

Der vorherige Fehler kam von `nem install`. Richtig ist `npm install`.

## Vercel Deploy

Für Next.js ist Vercel am einfachsten:

- Repo importieren
- Environment Variables setzen
- Deploy

## Sicherheit

- Kein Supabase Service Role Key im Frontend
- Uploads nur PNG/JPG/WEBP bis 5 MB
- Private Storage Bucket
- Row Level Security für Profile, Runs und Storage
- User können nur eigene Daten lesen/schreiben

## V1 Grenzen

Die Screenshot-Erkennung ist in dieser Version noch nicht echtes OCR. Der Upload wird gespeichert, die Analyse nutzt die manuell eingegebenen Laufdaten. OCR/AI kann später als Server Route ergänzt werden.
