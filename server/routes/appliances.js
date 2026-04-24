const router = require('express').Router();
const ApplianceLibrary = require('../models/ApplianceLibrary');
const RoomAppliance = require('../models/RoomAppliance');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');
const { propagateLibraryUpdate } = require('../services/propagationService');

// --- Central Library ---
/**
 * @swagger
 * /api/appliances/library:
 *   get:
 *     summary: List appliance library devices
 *     tags: [Appliances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appliance library fetched
 */
router.get('/library', protect, async (req, res) => {
  const items = await ApplianceLibrary.find().sort('name');
  res.json(items);
});

/**
 * @swagger
 * /api/appliances/library:
 *   post:
 *     summary: Create appliance library device
 *     tags: [Appliances]
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
 *         description: Appliance library device created
 */
router.post('/library', protect, authorize('admin', 'hod'), async (req, res) => {
  const item = await ApplianceLibrary.create(req.body);
  await AuditLog.create({ action: 'CREATE_APPLIANCE_LIBRARY', performedBy: req.user._id, targetType: 'ApplianceLibrary', targetId: item._id, newValue: req.body });
  res.status(201).json(item);
});

/**
 * @swagger
 * /api/appliances/library/{id}:
 *   put:
 *     summary: Update appliance library device
 *     tags: [Appliances]
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
 *         description: Appliance library device updated
 */
router.put('/library/:id', protect, authorize('admin', 'hod'), async (req, res) => {
  const old = await ApplianceLibrary.findById(req.params.id);
  if (!old) return res.status(404).json({ message: 'Device not found in library' });
  const item = await ApplianceLibrary.findByIdAndUpdate(req.params.id, req.body, { new: true });
  // Propagate wattage change to all room appliances that haven't overridden
  if (req.body.powerW && req.body.powerW !== old.powerW) {
    await propagateLibraryUpdate(req.params.id, req.body.powerW);
  }
  await AuditLog.create({ action: 'UPDATE_APPLIANCE_LIBRARY', performedBy: req.user._id, targetType: 'ApplianceLibrary', targetId: item._id, oldValue: old, newValue: req.body });
  res.json(item);
});

/**
 * @swagger
 * /api/appliances/library/{id}:
 *   delete:
 *     summary: Delete appliance library device
 *     tags: [Appliances]
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
 *         description: Appliance library device deleted
 */
router.delete('/library/:id', protect, authorize('admin', 'hod'), async (req, res) => {
  const existing = await ApplianceLibrary.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Device not found in library' });

  const activeMappings = await RoomAppliance.countDocuments({
    applianceLibraryId: req.params.id,
    isActive: true
  });

  if (activeMappings > 0) {
    return res.status(400).json({
      message: 'Cannot delete device while it is mapped to active room appliances'
    });
  }

  await ApplianceLibrary.findByIdAndDelete(req.params.id);
  await AuditLog.create({
    action: 'DELETE_APPLIANCE_LIBRARY',
    performedBy: req.user._id,
    targetType: 'ApplianceLibrary',
    targetId: req.params.id,
    oldValue: existing
  });
  res.json({ message: 'Device deleted from library' });
});

// --- Room Appliances ---
/**
 * @swagger
 * /api/appliances/room/{roomId}:
 *   get:
 *     summary: List active appliances for a room
 *     tags: [Appliances]
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
 *         description: Room appliances fetched
 */
router.get('/room/:roomId', protect, async (req, res) => {
  const appliances = await RoomAppliance.find({ roomId: req.params.roomId, isActive: true })
    .populate('applianceLibraryId', 'name powerW category');
  res.json(appliances);
});

/**
 * @swagger
 * /api/appliances/room/{roomId}:
 *   post:
 *     summary: Add appliance mapping to a room
 *     tags: [Appliances]
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
 *         description: Room appliance mapping created
 */
router.post('/room/:roomId', protect, authorize('admin', 'hod'), async (req, res) => {
  const payload = { roomId: req.params.roomId, ...req.body };
  if (payload.usageHours === undefined || payload.usageHours === null || payload.usageHours === '') {
    payload.usageHours = 0;
  }
  const ra = await RoomAppliance.create(payload);
  await AuditLog.create({ action: 'ADD_ROOM_APPLIANCE', performedBy: req.user._id, targetType: 'RoomAppliance', targetId: ra._id, newValue: req.body });
  res.status(201).json(ra);
});

/**
 * @swagger
 * /api/appliances/room/{roomId}/{id}:
 *   put:
 *     summary: Update room appliance mapping
 *     tags: [Appliances]
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
 *         description: Room appliance mapping updated
 */
router.put('/room/:roomId/:id', protect, authorize('admin', 'hod'), async (req, res) => {
  const old = await RoomAppliance.findById(req.params.id);
  const payload = { ...req.body };
  if (payload.usageHours === undefined || payload.usageHours === null || payload.usageHours === '') {
    delete payload.usageHours;
  }
  const ra = await RoomAppliance.findByIdAndUpdate(req.params.id, payload, { new: true });
  await AuditLog.create({ action: 'UPDATE_ROOM_APPLIANCE', performedBy: req.user._id, targetType: 'RoomAppliance', targetId: ra._id, oldValue: old, newValue: req.body });
  res.json(ra);
});

/**
 * @swagger
 * /api/appliances/room/{roomId}/{id}:
 *   delete:
 *     summary: Remove appliance mapping from room
 *     tags: [Appliances]
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
 *         description: Room appliance mapping removed
 */
router.delete('/room/:roomId/:id', protect, authorize('admin', 'hod'), async (req, res) => {
  await RoomAppliance.findByIdAndUpdate(req.params.id, { isActive: false });
  await AuditLog.create({ action: 'REMOVE_ROOM_APPLIANCE', performedBy: req.user._id, targetType: 'RoomAppliance', targetId: req.params.id });
  res.json({ message: 'Appliance removed from room' });
});

module.exports = router;
