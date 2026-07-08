// Vercel serverless function for user registration
// Place at: api/auth/register.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// Mock database - in production, connect to MongoDB Atlas, Supabase, etc.
const users: any[] = [];
const JWT_SECRET = process.env.JWT_SECRET || 'racketpoint-secret-key-change-in-prod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password, name, language = 'bg' } = req.body;

  // Validation
  if (!email || !password || !name) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  // Check if user exists (in production, query MongoDB)
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ message: 'User already exists' });
  }

  // Hash password in production (use bcrypt)
  const hashedPassword = Buffer.from(password).toString('base64'); // DO NOT USE IN PRODUCTION

  // Create user
  const user = {
    id: `user_${Date.now()}`,
    email,
    name,
    language,
    addresses: [],
    createdAt: new Date().toISOString(),
    role: 'user',
  };

  users.push({ ...user, password: hashedPassword });

  // Create JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.status(201).json({ user, token });
}
