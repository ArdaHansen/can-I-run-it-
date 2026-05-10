import dotenv from 'dotenv';
dotenv.config();

export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  cookieSecret: process.env.COOKIE_SECRET || 'dev-cookie-secret',
  openaiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 6)
});

if (config.env === 'production' && config.jwtSecret.includes('change')) {
  throw new Error('Set a strong JWT_SECRET before running in production.');
}
