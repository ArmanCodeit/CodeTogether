import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { storage } from '../services/storage.js';

const JWT_SECRET = process.env.JWT_SECRET || 'codetogether_super_secret_jwt_key_2026_dev_mesh';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await storage.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CT';

    const newUser = await storage.createUser({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      avatar: initials,
      handle: `@${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      role: 'developer',
      settings: {
        micMutedByDefault: false,
        cameraOffByDefault: false,
        theme: 'vs-dark',
        fontSize: 14,
        tabSize: 2,
      },
    });

    const token = generateToken(newUser);
    const { password: _, ...userSafe } = newUser;

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: userSafe,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await storage.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or credentials.' });
    }

    const token = generateToken(user);
    const { password: _, ...userSafe } = user;

    return res.json({
      message: 'Logged in successfully.',
      token,
      user: userSafe,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

export const getMe = async (req, res) => {
  try {
    return res.json({ user: req.user });
  } catch (error) {
    console.error('getMe error:', error);
    return res.status(500).json({ message: 'Server error retrieving profile.' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, handle, avatar, settings } = req.body;
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (handle) updateData.handle = handle.trim();
    if (avatar) updateData.avatar = avatar;
    if (settings) updateData.settings = settings;

    const updatedUser = await storage.updateUser(req.user._id || req.user.id, updateData);
    return res.json({
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ message: 'Failed to update profile.' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await storage.findUserByEmail(email);
    if (!user) {
      // Don't leak existence of user
      return res.json({ message: 'If an account with that email exists, password reset instructions have been dispatched.' });
    }

    // Generate mock reset token
    const resetToken = Math.random().toString(36).substring(2, 15);
    await storage.updateUser(user._id || user.id, {
      resetToken,
      resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour
    });

    return res.json({
      message: 'Password reset code generated. Use reset code to update password.',
      resetToken, // Provided in response for easy demonstration
    });
  } catch (error) {
    console.error('forgotPassword error:', error);
    return res.status(500).json({ message: 'Error processing password reset.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const user = await storage.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await storage.updateUser(user._id || user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    return res.json({ message: 'Password reset successfully. You may now log in.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    return res.status(500).json({ message: 'Error resetting password.' });
  }
};
