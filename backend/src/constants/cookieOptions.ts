import { CookieOptions } from 'express';

// For localhost development: secure must be false, sameSite can be 'lax'
// For production: secure should be true, sameSite can be 'lax' or 'strict'
export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // false for localhost HTTP
  sameSite: 'lax', // 'lax' works for localhost and production
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};
