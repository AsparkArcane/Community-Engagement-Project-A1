const router = require('express').Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Audit logs fetched
 */
router.get('/', protect, authorize('admin', 'hod'), async (req, res) => {
  const { targetType, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (targetType) filter.targetType = targetType;
  if (req.user.role === 'hod') filter.performedBy = req.user._id;
  
  const logs = await AuditLog.find(filter)
    .populate('performedBy', 'name email role')
    .sort('-timestamp')
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await AuditLog.countDocuments(filter);
  res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
});

module.exports = router;
