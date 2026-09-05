import { Router } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

const INTERNAL_ROLES = ['SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    company: user.company,
    customerId: user.customerId,
    customer: user.customer,
  };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' } });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid email address' } });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { customer: true },
    });

    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } });
    }

    if (user.status === 'PENDING_APPROVAL') {
      return res.status(403).json({ error: { code: 'ACCOUNT_PENDING_APPROVAL', message: 'Your account is pending approval by an administrator.' } });
    }

    if (user.status === 'REJECTED') {
      return res.status(403).json({ error: { code: 'ACCOUNT_REJECTED', message: 'Your sign-up request was rejected by an administrator. Please contact support.' } });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      customerId: user.customerId,
    });

    return res.json({
      token,
      user: publicUser(user),
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/auth/register/employee
// Creates an employee account that requires admin approval before login.
router.post('/register/employee', async (req, res) => {
  try {
    const { name, email, password, role, company } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name, email and password are required' } });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid work email address' } });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters long' } });
    }

    if (!INTERNAL_ROLES.includes(role)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Role must be one of: SALES_REP, SALES_MANAGER, FINANCE_OPERATIONS' } });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        role,
        company: company ? company.trim() : null,
        status: 'PENDING_APPROVAL',
      },
    });

    return res.status(201).json({
      message: 'Sign-up submitted. Your account is pending approval by an administrator.',
      user: publicUser(user),
    });
  } catch (error: any) {
    console.error('Employee registration error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/auth/register/customer
// Creates a customer organization and an active customer account (using the company email) for immediate login.
router.post('/register/customer', async (req, res) => {
  try {
    const { companyName, companyEmail, contactName, password } = req.body;

    if (!companyName || !companyEmail || !contactName || !password) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Company name, company email, contact name and password are required' } });
    }

    if (!EMAIL_REGEX.test(companyEmail)) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid company email address' } });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters long' } });
    }

    const normalizedCompanyEmail = companyEmail.toLowerCase().trim();

    const existingCustomer = await prisma.customer.findUnique({ where: { email: normalizedCompanyEmail } });
    if (existingCustomer) {
      return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'A customer account with this company email already exists' } });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedCompanyEmail } });
    if (existingUser) {
      return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'An account with this email already exists' } });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const customer = await prisma.customer.create({
      data: {
        name: companyName.trim(),
        email: normalizedCompanyEmail,
        company: companyName.trim(),
        tier: 'BRONZE',
      },
    });

    const user = await prisma.user.create({
      data: {
        email: normalizedCompanyEmail,
        name: contactName.trim(),
        passwordHash,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        company: companyName.trim(),
        customerId: customer.id,
      },
    });

    return res.status(201).json({
      message: 'Customer account created successfully. You can now sign in with your company email.',
      user: publicUser(user),
    });
  } catch (error: any) {
    console.error('Customer registration error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { customer: true },
    });

    if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });

    return res.json({
      user: publicUser(user),
    });
  } catch (error: any) {
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  return res.json({ message: 'Successfully logged out' });
});

export default router;