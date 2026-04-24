const router = require('express').Router();
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/departments:
 *   get:
 *     summary: List departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Department list
 */
router.get('/', protect, async (req, res) => {
  const depts = await Department.find().populate('hodId', 'name email');
  res.json(depts);
});

/**
 * @swagger
 * /api/departments:
 *   post:
 *     summary: Create a department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       201:
 *         description: Department created
 */
router.post('/', protect, authorize('admin'), async (req, res) => {
  const dept = await Department.create(req.body);
  await AuditLog.create({ action: 'CREATE_DEPARTMENT', performedBy: req.user._id, targetType: 'Department', targetId: dept._id, newValue: req.body });
  res.status(201).json(dept);
});

/**
 * @swagger
 * /api/departments/{id}:
 *   put:
 *     summary: Update a department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Department updated
 */
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const old = await Department.findById(req.params.id);
  const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await AuditLog.create({ action: 'UPDATE_DEPARTMENT', performedBy: req.user._id, targetType: 'Department', targetId: dept._id, oldValue: old, newValue: req.body });
  res.json(dept);
});

module.exports = router;
