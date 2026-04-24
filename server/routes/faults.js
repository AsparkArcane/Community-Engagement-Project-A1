const router = require('express').Router();
const FaultLog = require('../models/FaultLog');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/faults/room/{roomId}:
 *   get:
 *     summary: Get complaints for a room
 *     tags: [Faults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Complaint list for room
 */
router.get('/room/:roomId', protect, async (req, res) => {
  const faults = await FaultLog.find({ roomId: req.params.roomId })
    .populate('reportedBy', 'name')
    .populate('applianceId', 'name')
    .sort('-createdAt');
  res.json(faults);
});

const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * @swagger
 * /api/faults/public/feed:
 *   get:
 *     summary: Get public complaint feed
 *     tags: [Faults]
 *     responses:
 *       200:
 *         description: Public complaint feed
 */
router.get('/public/feed', async (req, res) => {
  const faults = await FaultLog.find()
    .populate('roomId', 'name code')
    .populate('reportedBy', 'name')
    .sort('-createdAt')
    .limit(12);
  res.json(faults);
});

/**
 * @swagger
 * /api/faults/{id}:
 *   get:
 *     summary: Get complaint by id
 *     tags: [Faults]
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
 *         description: Complaint details
 *       404:
 *         description: Complaint not found
 */
router.get('/:id', protect, async (req, res) => {
  const fault = await FaultLog.findById(req.params.id)
    .populate('roomId', 'name code type')
    .populate('reportedBy', 'name email')
    .populate('applianceId', 'name');
  if (!fault) return res.status(404).json({ message: 'Complaint not found' });
  res.json(fault);
});

/**
 * @swagger
 * /api/faults:
 *   post:
 *     summary: Create a complaint
 *     tags: [Faults]
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
 *         description: Complaint created
 */
router.post('/', protect, async (req, res) => {
  const fault = await FaultLog.create({ ...req.body, reportedBy: req.user._id });
  await AuditLog.create({ action: 'LOG_FAULT', performedBy: req.user._id, targetType: 'FaultLog', targetId: fault._id, newValue: req.body });

  // Notify HODs about this complaint
  const hods = await User.find({ role: 'hod', isActive: true });
  for (const hod of hods) {
    await Notification.create({
      userId: hod._id,
      message: `New complaint reported by ${req.user.name}: ${req.body.description}`,
      type: 'warning',
      relatedId: fault._id,
      relatedModel: 'FaultLog'
    });
  }

  res.status(201).json(fault);
});

/**
 * @swagger
 * /api/faults/{id}:
 *   put:
 *     summary: Update complaint
 *     tags: [Faults]
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
 *         description: Complaint updated
 */
router.put('/:id', protect, authorize('admin', 'hod'), async (req, res) => {
  const old = await FaultLog.findById(req.params.id);
  if (!old) return res.status(404).json({ message: 'Complaint not found' });

  if (req.body.status && !['open', 'in_progress', 'resolved'].includes(req.body.status)) {
    return res.status(400).json({ message: 'Invalid complaint status' });
  }

  if (req.body.status === 'resolved' && !req.body.resolvedAt) req.body.resolvedAt = new Date();
  if (req.body.status && req.body.status !== 'resolved') req.body.resolvedAt = null;

  const fault = await FaultLog.findByIdAndUpdate(req.params.id, req.body, { new: true });
  await AuditLog.create({ action: 'UPDATE_FAULT', performedBy: req.user._id, targetType: 'FaultLog', targetId: fault._id, oldValue: old, newValue: req.body });
  res.json(fault);
});

// GET /api/faults/correlation/:roomId - fault freq vs kWh correlation
/**
 * @swagger
 * /api/faults/correlation/{roomId}:
 *   get:
 *     summary: Get complaint correlation metrics for room
 *     tags: [Faults]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Correlation metrics
 */
router.get('/correlation/:roomId', protect, async (req, res) => {
  const faults = await FaultLog.find({ roomId: req.params.roomId });
  const faultCount = faults.length;
  const openFaults = faults.filter(f => f.status !== 'resolved').length;
  const totalRepairCost = faults.reduce((sum, f) => sum + (f.repairCost || 0), 0);
  res.json({ roomId: req.params.roomId, totalFaults: faultCount, openFaults, totalRepairCost });
});

module.exports = router;
