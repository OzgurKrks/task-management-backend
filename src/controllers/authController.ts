import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser, UserRole } from '../models/User';

// Generate JWT token
const generateToken = (user: IUser) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || '',
    { expiresIn: '1d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists - case insensitive check
    const userExists = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    });

    if (userExists) {
      res.status(400).json({ message: 'User already exists with this email' });
      return;
    }

    console.log('Creating new user with data:', { name, email, role });

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role: role || UserRole.DEVELOPER
    });

    if (user) {
      console.log('User created successfully:', user._id);
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Detailed error logging
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.keyPattern) {
      console.error('Key pattern:', error.keyPattern);
    }
    if (error.keyValue) {
      console.error('Key value:', error.keyValue);
    }
    
    // Check for MongoDB duplicate key error
    if (error.code === 11000) {
      const keyField = Object.keys(error.keyValue || {})[0] || 'field';
      const keyValue = Object.values(error.keyValue || {})[0] || '';
      
      res.status(400).json({ 
        message: `Duplicate key error. The ${keyField} "${keyValue}" is already in use.`,
        field: keyField
      });
    } else if (error.name === 'ValidationError') {
      // Handle mongoose validation errors (return 400)
      res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors
      });
    } else {
      res.status(500).json({ 
        message: 'Server error during registration',
        error: error.message 
      });
    }
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user)
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(req.user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}; 