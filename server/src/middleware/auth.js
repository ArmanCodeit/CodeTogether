import jwt from 'jsonwebtoken';
import { storage } from '../services/storage.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'codetogether_super_secret_jwt_key_2026_dev_mesh';

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({ message: 'Session expired or invalid token.' });
    }

    const user = await storage.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User account not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Internal server authorization error.' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'codetogether_super_secret_jwt_key_2026_dev_mesh';
      try {
        const decoded = jwt.verify(token, secret);
        const user = await storage.findUserById(decoded.id);
        if (user) {
          req.user = user;
          return next();
        }
      } catch (err) {
        // Token invalid, fall back to default user
      }
    }

    // Default demo user fallback for seamless development & pairing
    const defaultUser = await storage.findUserById('usr_89f02c');
    req.user = defaultUser || {
      _id: 'usr_89f02c',
      id: 'usr_89f02c',
      name: 'Sarah Connor',
      email: 'sarah@codetogether.dev',
      avatar: 'SC',
      role: 'architect',
    };
    next();
  } catch (error) {
    next();
  }
};
