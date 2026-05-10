import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { config } from './config.js';
import { db } from './db.js';

const cookieName = 'ciri_token';
const userByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const userById = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?');
const insertUser = db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)');

export function signUser(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: '7d', issuer: 'can-i-run-it' });
}

export function setAuthCookie(res, token) {
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.env === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(cookieName);
}

export async function register(email, password) {
  const normalized = email.trim().toLowerCase();
  if (userByEmail.get(normalized)) throw new Error('EMAIL_EXISTS');
  const hash = await bcrypt.hash(password, 12);
  const id = uuid();
  insertUser.run(id, normalized, hash);
  db.prepare('INSERT OR IGNORE INTO streaks (user_id) VALUES (?)').run(id);
  return userById.get(id);
}

export async function login(email, password) {
  const user = userByEmail.get(email.trim().toLowerCase());
  if (!user) throw new Error('INVALID_LOGIN');
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error('INVALID_LOGIN');
  return userById.get(user.id);
}

export function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const payload = jwt.verify(token, config.jwtSecret, { issuer: 'can-i-run-it' });
    const user = userById.get(payload.sub);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Not authenticated' });
  }
}
