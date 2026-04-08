const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  const users = await User.find().populate('departmentId', 'name code').select('-password');
  res.json(users);
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  const { name, email, password, role, departmentId } = req.body;
  
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashed, role, departmentId });
  
  await AuditLog.create({ 
    action: 'CREATE_USER', 
    performedBy: req.user._id, 
    targetType: 'User', 
    targetId: user._id, 
    newValue: { name, email, role } 
  });
  
  const userResponse = await User.findById(user._id).select('-password');
  res.status(201).json(userResponse);
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  const old = await User.findById(req.params.id).select('-password');
  if (!old) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { password, ...updates } = req.body;
  if (password) {
    updates.password = await bcrypt.hash(password, 12);
  }
  
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
  
  await AuditLog.create({ 
    action: 'UPDATE_USER', 
    performedBy: req.user._id, 
    targetType: 'User', 
    targetId: user._id, 
    oldValue: old, 
    newValue: updates 
  });
  
  res.json(user);
};

// @desc    Deactivate/Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await User.findByIdAndUpdate(req.params.id, { isActive: false });
  
  await AuditLog.create({ 
    action: 'DEACTIVATE_USER', 
    performedBy: req.user._id, 
    targetType: 'User', 
    targetId: req.params.id 
  });
  
  res.json({ message: 'User deactivated' });
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
