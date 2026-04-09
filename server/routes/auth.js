const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { protect } = require('../middleware/auth');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed, role });

    await AuditLog.create({ action: 'CREATE_USER', performedBy: user._id, targetType: 'User', targetId: user._id, newValue: { name, email, role } });

    res.status(201).json({ message: 'User registered successfully' });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email }).populate('departmentId', 'name code');
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    await AuditLog.create({ action: 'LOGIN', performedBy: user._id, ipAddress: req.ip });

    const token = signToken(user._id);
    res.json({
        token,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.departmentId
        }
    });
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
