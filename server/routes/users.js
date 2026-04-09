const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/user.controller');

// @route   GET /api/users
router.get('/', protect, authorize('admin'), getUsers);

// @route   POST /api/users
router.post('/', protect, authorize('admin'), createUser);

// @route   PUT /api/users/:id
router.put('/:id', protect, authorize('admin'), updateUser);

// @route   DELETE /api/users/:id
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
