const router = require('express').Router();
const { computeRoomConsumption } = require('../services/consumptionEngine');
const BillingSnapshot = require('../models/BillingSnapshot');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');

async function buildGlobalConsumption(month, year) {
  const rooms = await Room.find();
  const results = await Promise.all(rooms.map(r => computeRoomConsumption(r._id, month, year)));
  const valid = results.filter(Boolean);
  const total = valid.reduce((s, r) => s + r.totalKWh, 0);
  const totalCost = valid.reduce((s, r) => s + r.totalCost, 0);

  return {
    month,
    year,
    rooms: valid,
    totalKWh: +total.toFixed(3),
    totalCost: +totalCost.toFixed(2)
  };
}

async function buildGlobalTrends(year) {
  const rooms = await Room.find();
  const trends = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let m = 1; m <= 12; m++) {
    if (year === new Date().getFullYear() && m > new Date().getMonth() + 1) break;
    const results = await Promise.all(rooms.map(r => computeRoomConsumption(r._id, m, year)));
    const valid = results.filter(Boolean);
    const total = valid.reduce((s, r) => s + r.totalKWh, 0);
    trends.push({ name: monthNames[m - 1], consumption: +(total / 1000).toFixed(3) });
  }

  return trends;
}

// GET /api/consumption/public/global?month=4&year=2026
/**
 * @swagger
 * /api/consumption/public/global:
 *   get:
 *     summary: Get public global consumption
 *     tags: [Consumption]
 *     parameters:
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
 *         description: Public global consumption
 */
router.get('/public/global', async (req, res) => {
  const { month, year } = req.query;
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();
  res.json(await buildGlobalConsumption(m, y));
});

// GET /api/consumption/public/trends/global?year=2026
/**
 * @swagger
 * /api/consumption/public/trends/global:
 *   get:
 *     summary: Get public global consumption trends
 *     tags: [Consumption]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Public global trends
 */
router.get('/public/trends/global', async (req, res) => {
  const y = Number(req.query.year) || new Date().getFullYear();
  res.json(await buildGlobalTrends(y));
});

// GET /api/consumption/room/:roomId?month=4&year=2026
/**
 * @swagger
 * /api/consumption/room/{roomId}:
 *   get:
 *     summary: Get room consumption
 *     tags: [Consumption]
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
 *         description: Room consumption
 */
router.get('/room/:roomId', protect, async (req, res) => {
  const { month, year } = req.query;
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();
  const data = await computeRoomConsumption(req.params.roomId, m, y);
  res.json(data);
});

// GET /api/consumption/snapshot/:roomId?month=4&year=2026
/**
 * @swagger
 * /api/consumption/snapshot/{roomId}:
 *   get:
 *     summary: Get room billing snapshot
 *     tags: [Consumption]
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
 *         description: Snapshot found
 *       404:
 *         description: Snapshot not found
 */
router.get('/snapshot/:roomId', protect, async (req, res) => {
  const { month, year } = req.query;
  const snap = await BillingSnapshot.findOne({ roomId: req.params.roomId, month: Number(month), year: Number(year) });
  if (!snap) return res.status(404).json({ message: 'Snapshot not found for this period' });
  res.json(snap);
});

// GET /api/consumption/department/:departmentId?month=4&year=2026
/**
 * @swagger
 * /api/consumption/department/{departmentId}:
 *   get:
 *     summary: Get department consumption
 *     tags: [Consumption]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
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
 *         description: Department consumption
 */
router.get('/department/:departmentId', protect, async (req, res) => {
  const { month, year } = req.query;
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();
  const rooms = await Room.find({ departmentId: req.params.departmentId });
  const results = await Promise.all(rooms.map(r => computeRoomConsumption(r._id, m, y)));
  const total = results.reduce((s, r) => r ? s + r.totalKWh : s, 0);
  const totalCost = results.reduce((s, r) => r ? s + r.totalCost : s, 0);
  res.json({ departmentId: req.params.departmentId, month: m, year: y, rooms: results, totalKWh: +total.toFixed(3), totalCost: +totalCost.toFixed(2) });
});

// GET /api/consumption/global?month=4&year=2026 (Admin)
/**
 * @swagger
 * /api/consumption/global:
 *   get:
 *     summary: Get protected global consumption
 *     tags: [Consumption]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Global consumption
 */
router.get('/global', protect, async (req, res) => {
  const { month, year } = req.query;
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();
  res.json(await buildGlobalConsumption(m, y));
});

// GET /api/consumption/trends/global?year=2026
/**
 * @swagger
 * /api/consumption/trends/global:
 *   get:
 *     summary: Get protected global trends
 *     tags: [Consumption]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Global trends
 */
router.get('/trends/global', protect, async (req, res) => {
  const y = Number(req.query.year) || new Date().getFullYear();
  res.json(await buildGlobalTrends(y));
});

// GET /api/consumption/trends/department/:departmentId?year=2026
/**
 * @swagger
 * /api/consumption/trends/department/{departmentId}:
 *   get:
 *     summary: Get department consumption trends
 *     tags: [Consumption]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Department trends
 */
router.get('/trends/department/:departmentId', protect, async (req, res) => {
  const y = Number(req.query.year) || new Date().getFullYear();
  const rooms = await Room.find({ departmentId: req.params.departmentId });
  const trends = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  for (let m = 1; m <= 12; m++) {
    if (y === new Date().getFullYear() && m > new Date().getMonth() + 1) break;
    const results = await Promise.all(rooms.map(r => computeRoomConsumption(r._id, m, y)));
    const valid = results.filter(Boolean);
    const total = valid.reduce((s, r) => s + r.totalKWh, 0);
    trends.push({ name: monthNames[m-1], consumption: +(total / 1000).toFixed(3) });
  }
  res.json(trends);
});

module.exports = router;
