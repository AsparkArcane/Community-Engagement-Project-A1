const router = require('express').Router();
const { computeRoomConsumption } = require('../services/consumptionEngine');
const { generateRecommendations } = require('../services/recommendationEngine');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');

let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch (e) {
  console.warn('pdfkit not installed - PDF endpoints will not work. Run: npm install pdfkit');
}

// GET /api/reports/csv/room/:roomId?month=4&year=2026
/**
 * @swagger
 * /api/reports/csv/room/{roomId}:
 *   get:
 *     summary: Download room CSV report
 *     tags: [Reports]
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
 *         description: CSV report generated
 */
router.get('/csv/room/:roomId', protect, async (req, res) => {
  const { month, year } = req.query;
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();
  const data = await computeRoomConsumption(req.params.roomId, m, y);
  if (!data) return res.status(404).json({ message: 'No data found' });

  let csv = 'Appliance,Category,Power(W),Quantity,UsageHours,Monthly kWh,Monthly Cost (INR)\r\n';
  for (const a of data.applianceBreakdown) {
    csv += `"${a.name}","${a.category}",${a.powerW},${a.quantity},${a.usageHours},${a.kWh},${a.cost}\r\n`;
  }
  csv += `\r\nTOTAL,,,,,${data.totalKWh},${data.totalCost}\r\n`;
  csv += `Working Days: ${data.workingDays} (Lecture: ${data.lectureDays} | Phantom: ${data.phantomDays} | Off: ${data.offDays})\r\n`;
  csv += `Tariff Used: ₹${data.tariff}/kWh\r\n`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${data.roomName}-${y}-${m}.csv"`);
  res.send(csv);
});

// GET /api/reports/csv/department/:departmentId?month=4&year=2026
/**
 * @swagger
 * /api/reports/csv/department/{departmentId}:
 *   get:
 *     summary: Download department CSV report
 *     tags: [Reports]
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
 *         description: CSV report generated
 */
router.get('/csv/department/:departmentId', protect, async (req, res) => {
  const { month, year } = req.query;
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();
  const rooms = await Room.find({ departmentId: req.params.departmentId });
  const results = await Promise.all(rooms.map(r => computeRoomConsumption(r._id, m, y)));

  let csv = 'Room,Working Days,Total kWh,Total Cost (INR)\r\n';
  let grandKWh = 0, grandCost = 0;
  for (const r of results.filter(Boolean)) {
    csv += `"${r.roomName}",${r.workingDays},${r.totalKWh},${r.totalCost}\r\n`;
    grandKWh += r.totalKWh;
    grandCost += r.totalCost;
  }
  csv += `\r\nGRAND TOTAL,,,${grandKWh.toFixed(3)},${grandCost.toFixed(2)}\r\n`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="dept-${req.params.departmentId}-${y}-${m}.csv"`);
  res.send(csv);
});

// GET /api/reports/csv/global
/**
 * @swagger
 * /api/reports/csv/global:
 *   get:
 *     summary: Download global CSV report
 *     tags: [Reports]
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
 *         description: CSV report generated
 */
router.get('/csv/global', protect, async (req, res) => {
  const { month, year } = req.query;
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();
  const rooms = await Room.find();
  
  const results = await Promise.all(rooms.map(r => computeRoomConsumption(r._id, m, y)));

  let csv = 'Room,Working Days,Total kWh,Total Cost (INR)\r\n';
  let grandKWh = 0, grandCost = 0;
  for (const r of results.filter(Boolean)) {
    csv += `"${r.roomName}",${r.workingDays},${r.totalKWh},${r.totalCost}\r\n`;
    grandKWh += r.totalKWh;
    grandCost += r.totalCost;
  }
  csv += `\r\nGRAND TOTAL,,,${grandKWh.toFixed(3)},${grandCost.toFixed(2)}\r\n`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="campus-global-${y}-${m}.csv"`);
  res.send(csv);
});

// GET /api/reports/recommendations/global
/**
 * @swagger
 * /api/reports/recommendations/global:
 *   get:
 *     summary: Get global recommendations
 *     tags: [Reports]
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
 *         description: Recommendations fetched
 */
router.get('/recommendations/global', protect, async (req, res) => {
  const { generateRecommendations } = require('../services/recommendationEngine');
  const m = Number(req.query.month) || new Date().getMonth() + 1;
  const y = Number(req.query.year) || new Date().getFullYear();
  const data = await generateRecommendations(null, m, y);
  res.json(data);
});

// GET /api/reports/recommendations/department/:departmentId
/**
 * @swagger
 * /api/reports/recommendations/department/{departmentId}:
 *   get:
 *     summary: Get department recommendations
 *     tags: [Reports]
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
 *         description: Recommendations fetched
 */
router.get('/recommendations/department/:departmentId', protect, async (req, res) => {
  const {generateRecommendations } = require('../services/recommendationEngine');
  const m = Number(req.query.month) || new Date().getMonth() + 1;
  const y = Number(req.query.year) || new Date().getFullYear();
  const data = await generateRecommendations(req.params.departmentId, m, y);
  res.json(data);
});

// ============ PDF REPORT ENDPOINTS ============

// GET /api/reports/pdf/room/:roomId?month=4&year=2026
/**
 * @swagger
 * /api/reports/pdf/room/{roomId}:
 *   get:
 *     summary: Download room PDF report
 *     tags: [Reports]
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
 *         description: PDF report generated
 */
router.get('/pdf/room/:roomId', protect, async (req, res) => {
  if (!PDFDocument) return res.status(503).json({ message: 'PDF functionality not available' });

  try {
    const { month, year } = req.query;
    const m = Number(month) || new Date().getMonth() + 1;
    const y = Number(year) || new Date().getFullYear();
    const data = await computeRoomConsumption(req.params.roomId, m, y);
    
    if (!data) return res.status(404).json({ message: 'No data found' });

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Room-${data.roomName}-${y}-${m}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('VJTI Energy Consumption Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Room Level Analysis', { align: 'center' });
    doc.moveDown(0.5);

    // Room & Period Info
    doc.fontSize(12).font('Helvetica-Bold').text(`Room: ${data.roomName}`, { underline: true });
    doc.fontSize(10).font('Helvetica').text(`Period: ${y}-${String(m).padStart(2, '0')}`);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown(0.8);

    // Summary Table
    doc.fontSize(11).font('Helvetica-Bold').text('Consumption Summary:', { underline: true });
    const summaryData = [
      ['Total kWh', `${data.totalKWh.toFixed(2)}`],
      ['Working Days', `${data.workingDays || 22}`],
      ['Lecture Days', `${data.lectureDays || 0}`],
      ['Phantom Load Days', `${data.phantomDays || 0}`],
      ['Off Days', `${data.offDays || 0}`],
      ['Tariff (₹/kWh)', `${data.tariff || 7.5}`],
      ['Total Cost (₹)', `${data.totalCost.toFixed(2)}`]
    ];

    let yPos = doc.y + 10;
    for (const [label, value] of summaryData) {
      doc.fontSize(9).font('Helvetica').text(label, 50, yPos);
      doc.text(value, 250, yPos);
      yPos += 15;
    }
    doc.moveDown(1.5);

    // Appliance Breakdown
    doc.fontSize(11).font('Helvetica-Bold').text('Appliance Breakdown:', { underline: true });
    doc.moveDown(0.5);

    const tableY = doc.y;
    const headers = ['Appliance', 'Category', 'Power(W)', 'Qty', 'kWh', 'Cost(₹)'];
    const colWidths = [70, 55, 50, 35, 50, 60];
    let tableX = 50;
    let headerY = tableY;

    // Table header
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#333333');
    headers.forEach((h, i) => {
      doc.text(h, tableX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), headerY);
    });
    doc.moveDown(0.8);

    // Table rows
    doc.font('Helvetica').fillColor('#000000');
    for (const app of data.applianceBreakdown || []) {
      let rowData = [
        app.name.substring(0, 12),
        app.category.substring(0, 10),
        String(app.powerW),
        String(app.quantity),
        app.kWh.toFixed(2),
        app.cost.toFixed(2)
      ];
      rowData.forEach((val, i) => {
        doc.text(val, tableX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), doc.y);
      });
    }

    doc.moveDown(1.5);
    doc.fontSize(10).font('Helvetica-Bold').text(`TOTAL MONTHLY CONSUMPTION: ${data.totalKWh.toFixed(2)} kWh`);
    doc.fontSize(10).font('Helvetica-Bold').text(`TOTAL MONTHLY COST: ₹${data.totalCost.toFixed(2)}`);

    // Footer
    doc.moveDown(2).fontSize(8).font('Helvetica').fillColor('#666666');
    doc.text('This report is generated automatically from the VJTI Smart Energy System database.', { align: 'center' });
    doc.text(`Page 1 of 1`, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
});

// GET /api/reports/pdf/global?month=4&year=2026
/**
 * @swagger
 * /api/reports/pdf/global:
 *   get:
 *     summary: Download global PDF report
 *     tags: [Reports]
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
 *         description: PDF report generated
 */
router.get('/pdf/global', protect, async (req, res) => {
  if (!PDFDocument) return res.status(503).json({ message: 'PDF functionality not available' });

  try {
    const { month, year } = req.query;
    const m = Number(month) || new Date().getMonth() + 1;
    const y = Number(year) || new Date().getFullYear();
    
    const rooms = await Room.find();
    const results = await Promise.all(rooms.map(r => computeRoomConsumption(r._id, m, y)));
    const validResults = results.filter(Boolean);

    if (validResults.length === 0) return res.status(404).json({ message: 'No data available' });

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Campus-Report-${y}-${m}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('VJTI Campus Energy Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Global Analysis', { align: 'center' });
    doc.moveDown(0.5);

    // Period Info
    doc.fontSize(10).font('Helvetica').text(`Period: ${y}-${String(m).padStart(2, '0')} | Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown(0.8);

    // Global Stats
    const totalKWh = validResults.reduce((s, r) => s + r.totalKWh, 0);
    const totalCost = validResults.reduce((s, r) => s + r.totalCost, 0);
    doc.fontSize(11).font('Helvetica-Bold').text('Campus Overview:', { underline: true });
    doc.fontSize(10).font('Helvetica')
      .text(`Total Rooms: ${validResults.length}`)
      .text(`Total Consumption: ${totalKWh.toFixed(2)} kWh`)
      .text(`Estimated Cost: ₹${totalCost.toFixed(2)}`);
    doc.moveDown(1);

    // Get recommendations
    const recommendations = await generateRecommendations(null, m, y);
    if (recommendations.recommendations.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').text('Energy Recommendations:', { underline: true });
      doc.fontSize(9).font('Helvetica').fillColor('#333333');
      for (const rec of recommendations.recommendations.slice(0, 3)) {
        doc.text(`• ${rec}`, { align: 'left' });
        doc.moveDown(0.3);
      }
      doc.moveDown(0.5);
    }

    // Top Rooms Table
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('Top Consuming Rooms:', { underline: true });
    doc.moveDown(0.5);

    let yPos = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').text('Room', 50, yPos);
    doc.text('kWh', 250, yPos);
    doc.text('Cost (₹)', 320, yPos);
    doc.moveDown(0.7);

    doc.font('Helvetica');
    for (const room of validResults.sort((a, b) => b.totalKWh - a.totalKWh).slice(0, 10)) {
      doc.text(room.roomName.substring(0, 30), 50, doc.y);
      doc.text(room.totalKWh.toFixed(2), 250, doc.y - 15);
      doc.text(room.totalCost.toFixed(2), 320, doc.y - 15);
      doc.moveDown(0.6);
    }

    doc.moveDown(1.5);
    doc.fontSize(8).font('Helvetica').fillColor('#666666');
    doc.text('Report generated by VJTI Smart Energy System | Confidential', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
});

module.exports = router;
