# Can I Run It?

A secure MVP web app for runners. Upload a Garmin/Strava/NRC screenshot, enter your race goal and get a race-readiness score, weaknesses, next workouts and a streak.

## Start

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000

## Optional AI screenshot extraction

Add `OPENAI_API_KEY` in `.env`. Without it, the app still works with manual/demo extraction and rule-based analysis.

## Security defaults

- Helmet security headers and strict CSP
- HTTP-only SameSite cookies
- JWT auth with bcrypt password hashing
- CSRF protection for mutating routes
- Rate limiting for auth and API routes
- Server-side upload validation: image MIME, size limit, Sharp re-encoding, no user filename trust
- SQLite prepared statements
- No public access to uploaded raw files

## Production notes

- Set strong `JWT_SECRET` and `COOKIE_SECRET`
- Run behind HTTPS
- Set `NODE_ENV=production`
- Set `APP_ORIGIN` to your real domain
- Review OpenAI/Strava API terms before using third-party fitness data commercially
