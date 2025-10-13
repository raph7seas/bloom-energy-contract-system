import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const FALLBACK_EMAIL = (process.env.FALLBACK_ADMIN_EMAIL || 'admin@bloomenergy.com').toLowerCase();
const FALLBACK_PASSWORD = process.env.FALLBACK_ADMIN_PASSWORD || 'admin123';
const FALLBACK_USER = {
  id: 'fallback-admin',
  email: FALLBACK_EMAIL,
  firstName: 'System',
  lastName: 'Administrator',
  role: 'ADMIN'
};

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 refresh attempts per windowMs
  message: { error: 'Too many refresh attempts, please try again later' }
});

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'bloom-energy-contract-system-jwt-secret-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'bloom-energy-refresh-secret-2024';

// Helper functions
const generateAccessToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
};

const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

// Register new user
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'USER' } = req.body;

    if (!req.prisma) {
      return res.status(503).json({ error: 'User registration requires the database to be available' });
    }

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check if user already exists
    const existingUser = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await req.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: role.toUpperCase()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login user
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email, passwordLength: password?.length });
    console.log('Fallback mode check:', {
      prismaAvailable: !!req.prisma,
      emailLower: email?.toLowerCase(),
      expectedEmail: FALLBACK_EMAIL,
      emailMatch: email?.toLowerCase() === FALLBACK_EMAIL,
      passwordMatch: password === FALLBACK_PASSWORD
    });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!req.prisma) {
      if (email.toLowerCase() !== FALLBACK_EMAIL || password !== FALLBACK_PASSWORD) {
        console.log('❌ Fallback credentials do not match');
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      console.log('✅ Fallback credentials match, logging in');

      const accessToken = generateAccessToken(FALLBACK_USER.id, FALLBACK_USER.email, FALLBACK_USER.role);
      const refreshToken = generateRefreshToken(FALLBACK_USER.id);

      return res.json({
        message: 'Login successful (fallback mode)',
        fallback: true,
        accessToken,
        refreshToken,
        user: FALLBACK_USER
      });
    }

    // Find user
    const user = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      if (email.toLowerCase() === FALLBACK_EMAIL && password === FALLBACK_PASSWORD) {
        const accessToken = generateAccessToken(FALLBACK_USER.id, FALLBACK_USER.email, FALLBACK_USER.role);
        const refreshToken = generateRefreshToken(FALLBACK_USER.id);

        return res.json({
          message: 'Login successful (fallback mode)',
          fallback: true,
          accessToken,
          refreshToken,
          user: FALLBACK_USER
        });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    console.log('Password comparison:', {
      provided: password,
      storedHash: user.password?.substring(0, 20) + '...'
    });
    const isValidPassword = await comparePassword(password, user.password);
    console.log('Password valid:', isValidPassword);
    if (!isValidPassword) {
      if (email.toLowerCase() === FALLBACK_EMAIL && password === FALLBACK_PASSWORD) {
        const accessToken = generateAccessToken(FALLBACK_USER.id, FALLBACK_USER.email, FALLBACK_USER.role);
        const refreshToken = generateRefreshToken(FALLBACK_USER.id);

        return res.json({
          message: 'Login successful (fallback mode)',
          fallback: true,
          accessToken,
          refreshToken,
          user: FALLBACK_USER
        });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Create session
    const session = await req.prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    // Update last login
    await req.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token
router.post('/refresh', refreshLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    if (!req.prisma) {
      return res.status(503).json({ error: 'Token refresh requires the database to be available' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    // Find session
    const session = await req.prisma.session.findFirst({
      where: {
        refreshToken,
        isActive: true,
        userId: decoded.userId
      },
      include: { user: true }
    });

    if (!session || !session.user.isActive) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(
      session.user.id,
      session.user.email,
      session.user.role
    );

    // Update session
    await req.prisma.session.update({
      where: { id: session.id },
      data: {
        token: newAccessToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    });

    res.json({
      accessToken: newAccessToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        role: session.user.role
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Deactivate session
      await req.prisma.session.updateMany({
        where: { token, isActive: true },
        data: { isActive: false }
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
