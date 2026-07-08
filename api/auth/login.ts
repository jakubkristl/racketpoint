// Vercel serverless function for user login
// Place at: api/auth/login.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// Mock database - connect to MongoDB in production
const users: any[] = [
  {
    id: 'admin_user',
    email: 'admin@racketpoint.bg',
    name: 'Admin',
    password: Buffer.from('racketpoint-admin').toString('base64'),
    language: 'bg',
    role: 'admin',
    addresses: [],
    createdAt: new Date().toISOString(),
  },
];

const JWT_SECRET = process.env.JWT_SECRET || 'racketpoint-secret-key-change-in-prod';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  // Find user (in production, query MongoDB)
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // Compare password (use bcrypt in production)
  const hashedPassword = Buffer.from(password).toString('base64');
  if (user.password !== hashedPassword) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // Create JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;

  res.status(200).json({ user: userWithoutPassword, token });
}
