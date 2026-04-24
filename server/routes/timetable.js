const router = require('express').Router();
const TimetableEntry = require('../models/TimetableEntry');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * /api/timetable/{roomId}:
 *   get:
 *     summary: Get timetable entries for a room
 *     tags: [Timetable]
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
 *         description: Timetable entries fetched
 */
router.get('/:roomId', protect, async (req, res) => {
  const entries = await TimetableEntry.find({ roomId: req.params.roomId }).sort('dayOfWeek startTime');
  res.json(entries);
});

/**
 * @swagger
 * /api/timetable/{roomId}:
 *   post:
 *     summary: Create timetable entry for a room
 *     tags: [Timetable]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       201:
 *         description: Timetable entry created
 */
router.post('/:roomId', protect, authorize('admin', 'hod'), async (req, res) => {
  const entry = await TimetableEntry.create({ roomId: req.params.roomId, ...req.body });
  res.status(201).json(entry);
});

/**
 * @swagger
 * /api/timetable/{roomId}/{id}:
 *   put:
 *     summary: Update timetable entry
 *     tags: [Timetable]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Timetable entry updated
 */
router.put('/:roomId/:id', protect, authorize('admin', 'hod'), async (req, res) => {
  const entry = await TimetableEntry.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(entry);
});

/**
 * @swagger
 * /api/timetable/{roomId}/{id}:
 *   delete:
 *     summary: Delete timetable entry
 *     tags: [Timetable]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Timetable entry deleted
 */
router.delete('/:roomId/:id', protect, authorize('admin', 'hod'), async (req, res) => {
  await TimetableEntry.findByIdAndDelete(req.params.id);
  res.json({ message: 'Timetable entry deleted' });
});

module.exports = router;
