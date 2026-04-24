const router = require('express').Router();
const { computeSolarScore } = require('../services/solarService');
const { protect, authorize } = require('../middleware/auth');

// GET /api/solar/score/:roomId
/**
 * @swagger
 * /api/solar/score/{roomId}:
 *   get:
 *     summary: Get solar feasibility score for a room
 *     tags: [Solar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Solar score computed
 */
router.get('/score/:roomId', protect, authorize('hod'), async (req, res) => {
  const { month, year } = req.query;
  const result = await computeSolarScore(req.params.roomId, Number(month), Number(year));
  res.json(result);
});

// GET /api/solar/payback/:roomId
/**
 * @swagger
 * /api/solar/payback/{roomId}:
 *   get:
 *     summary: Get payback timeline for a room
 *     tags: [Solar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: panelCapacityKW
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Payback timeline generated
 */
router.get('/payback/:roomId', protect, authorize('hod'), async (req, res) => {
  const { month, year, panelCapacityKW } = req.query;
  const result = await computeSolarScore(req.params.roomId, Number(month), Number(year), Number(panelCapacityKW));
  const yearlyData = [];
  const annualSaving = result.annualSavingINR;
  const totalCost = result.panelCostINR;
  for (let y = 0; y <= 20; y++) {
    yearlyData.push({ year: y, cumulativeSaving: +(annualSaving * y).toFixed(2), investment: totalCost });
  }
  res.json({ ...result, paybackTimeline: yearlyData });
});

// GET /api/solar/department/:departmentId
/**
 * @swagger
 * /api/solar/department/{departmentId}:
 *   get:
 *     summary: Get ranked solar scores for a department
 *     tags: [Solar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Department solar ranking
 */
router.get('/department/:departmentId', protect, authorize('hod'), async (req, res) => {
  const Room = require('../models/Room');
  const rooms = await Room.find({ departmentId: req.params.departmentId });
  const scores = await Promise.all(rooms.map(r => computeSolarScore(r._id, new Date().getMonth() + 1, new Date().getFullYear())));
  const ranked = scores.filter(s => s).sort((a, b) => b.sps - a.sps);
  res.json(ranked);
});

module.exports = router;
