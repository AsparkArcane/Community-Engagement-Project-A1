const { computeRoomConsumption } = require('./consumptionEngine');
const { computeSolarScore } = require('./solarService');
const Room = require('../models/Room');

async function generateRecommendations(departmentId = null, month, year) {
  const filter = departmentId ? { departmentId } : {};
  const rooms = await Room.find(filter);
  
  if (!rooms || rooms.length === 0) return { recommendations: [], topRooms: [], topAppliances: [] };

  // 1. Gather all consumption data
  const consumptions = await Promise.all(rooms.map(r => computeRoomConsumption(r._id, month, year)));
  const validData = consumptions.filter(c => c && c.totalKWh > 0);

  // 2. Rank Rooms
  const rankedRooms = validData.sort((a, b) => b.totalKWh - a.totalKWh).slice(0, 5);

  // 3. Flatten and Rank Appliances
  let applianceMap = {}; 
  for (const roomData of validData) {
    for (const app of roomData.applianceBreakdown) {
      if (!applianceMap[app.name]) {
        applianceMap[app.name] = { name: app.name, category: app.category, powerW: app.powerW, totalQuantity: 0, totalKWh: 0, totalCost: 0 };
      }
      applianceMap[app.name].totalQuantity += app.quantity;
      applianceMap[app.name].totalKWh += app.kWh;
      applianceMap[app.name].totalCost += app.cost;
    }
  }
  
  const rankedAppliances = Object.values(applianceMap).sort((a, b) => b.totalKWh - a.totalKWh).slice(0, 5);

  // 4. Generate AI-like natural language action strings
  const recommendations = [];

  // Appliance Recommendations
  if (rankedAppliances.length > 0) {
    const worstApp = rankedAppliances[0];
    if (worstApp.category === 'cooling') {
      recommendations.push(`Appliance Upgrade: Your highest consuming appliance type is the "${worstApp.name}". Replacing these ${worstApp.totalQuantity} units globally with 5-Star inverter variants could slash your cooling footprint by up to 30%, saving an estimated ₹${(worstApp.totalCost * 0.3).toFixed(2)} monthly.`);
    } else {
      recommendations.push(`Efficiency Alert: Watch out for the "${worstApp.name}". This asset is currently pulling ${worstApp.totalKWh.toFixed(2)} kWh across these rooms. Phasing them out for an eco-rated alternative represents a massive efficiency win.`);
    }
  }

  // Room & Solar Recommendations
  for (const topRoom of rankedRooms.slice(0, 2)) {
    // Determine dynamic panel capacity estimation: roughly totalKWh / 120 gives a rough kW
    let targetCapacity = Math.max(2, Math.ceil(topRoom.totalKWh / 120));
    const sScore = await computeSolarScore(topRoom.roomId, month, year, targetCapacity);
    
    if (sScore && sScore.isCritical) {
      recommendations.push(`Solar Conversion (Critical): ${topRoom.roomName} is heavily consuming ${topRoom.totalKWh.toFixed(2)} kWh. Installing a ${targetCapacity}kW Solar Array on this sector guarantees a payback period of exactly ${sScore.paybackYears} years.`);
    } else if (sScore) {
      recommendations.push(`Solar Feasibility: Generating localized solar for ${topRoom.roomName} targets a huge ${topRoom.totalKWh.toFixed(2)} kWh footprint. You could aggressively mitigate this burden with a ${targetCapacity}kW array saving ₹${sScore.annualSavingINR.toLocaleString()} annually.`);
    }
  }

  return {
    recommendations,
    topRooms: rankedRooms.map(r => ({ roomId: r.roomId, name: r.roomName, kWh: +r.totalKWh.toFixed(2), cost: +r.totalCost.toFixed(2) })),
    topAppliances: rankedAppliances.map(a => ({ ...a, totalKWh: +a.totalKWh.toFixed(2), totalCost: +a.totalCost.toFixed(2) }))
  };
}

module.exports = { generateRecommendations };
