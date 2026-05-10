const express = require('express')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const path = require('path')

const app = express()
const port = process.env.PORT || 10000

app.disable('x-powered-by')
app.use(compression())
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "https://cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "blob:", "https://*.supabase.co"],
      "connect-src": ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
      "object-src": ["'none'"],
      "frame-ancestors": ["'none'"],
      "base-uri": ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 350, standardHeaders: true, legacyHeaders: false }))
app.use(express.json({ limit: '64kb' }))
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '1h' }))

app.get('/config.js', (req, res) => {
  res.type('application/javascript')
  res.send(`window.CIRI_CONFIG=${JSON.stringify({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''
  })}`)
})

app.get('/health', (req, res) => res.json({ ok: true }))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')))

app.listen(port, () => console.log(`Can I Run It V2 running on port ${port}`))
