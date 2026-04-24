const { computeRoomConsumption } = require('./consumptionEngine');
const { computeSolarScore } = require('./solarService');
const Room = require('../models/Room');
const RoomAppliance = require('../models/RoomAppliance');

/**
 * Rule-based recommendation engine using consumption metrics
 * Rules:
 *   1. High usage rooms → suggest solar or usage reduction
 *   2. High wattage appliances → suggest replacement with efficient model
 *   3. Idle rooms (low consumption despite active appliances) → suggest shutdown
 *   4. Cooling appliances (high consumption) → suggest 5-star upgrades
 *   5. Always-on devices with high wattage → suggest timer installation
 */
async function generateRecommendations(departmentId = null, month, year) {
  const filter = departmentId ? { departmentId } : {};
  const rooms = await Room.find(filter);
  
  if (!rooms || rooms.length === 0) return { recommendations: [], topRooms: [], topAppliances: [] };

  // 1. Gather all consumption data
  const consumptions = await Promise.all(rooms.map(r => computeRoomConsumption(r._id, month, year)));
  const validData = consumptions.filter(c => c && c.totalKWh > 0);

  if (validData.length === 0) return { recommendations: [], topRooms: [], topAppliances: [] };

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

  // 4. Generate rule-based recommendations
  const recommendations = [];

  // RULE 1: Highest consuming appliance optimization
  if (rankedAppliances.length > 0) {
    const worstApp = rankedAppliances[0];
    if (worstApp.category === 'cooling') {
      // Cooling appliances: suggest 5-star upgrade
      recommendations.push(
        `Appliance Upgrade: Your highest consuming appliance type is the "${worstApp.name}" (${worstApp.totalQuantity} units). ` +
        `Replacing with 5-Star inverter variants could reduce cooling energy consumption by 25-30%, ` +
        `saving approximately ₹${(worstApp.totalCost * 0.28).toFixed(2)} monthly.`
      );
    } else if (worstApp.category === 'heating') {
      // Heating appliances: check for unnecessary usage
      recommendations.push(
        `Energy Check: The "${worstApp.name}" consumes ${worstApp.totalKWh.toFixed(2)} kWh monthly. ` +
        `Verify if all ${worstApp.totalQuantity} units are in active use. Consider thermostatic controls to reduce idle consumption.`
      );
    } else {
      // General high-consumption appliances
      recommendations.push(
        `Efficiency Opportunity: The "${worstApp.name}" is your highest consuming appliance (${worstApp.totalKWh.toFixed(2)} kWh). ` +
        `Review operational hours and consider energy-efficient replacements to optimize your ₹${worsaApp.totalCost.toFixed(2)} monthly expense.`
      );
    }
  }

  // RULE 2: Solar feasibility for top rooms
  for (const topRoom of rankedRooms.slice(0, 2)) {
    if (topRoom.totalKWh > 100) { // Only recommend solar for high-consumption rooms
      const targetCapacity = Math.max(2, Math.ceil(topRoom.totalKWh / 120));
      const sScore = await computeSolarScore(topRoom.roomId, month, year, targetCapacity);
      
      if (sScore && sScore.isCritical) {
        recommendations.push(
          `Solar Recommendation (HIGH PRIORITY): ${topRoom.roomName} consumes ${topRoom.totalKWh.toFixed(2)} kWh monthly. ` +
          `A ${targetCapacity}kW solar array could achieve payback in ${sScore.paybackYears} years, ` +
          `saving ₹${sScore.annualSavingINR.toLocaleString()} annually.`
        );
      } else if (sScore && sScore.paybackYears && sScore.paybackYears < 7) {
        recommendations.push(
          `Solar Feasibility: ${topRoom.roomName} is suitable for ${targetCapacity}kW solar installation. ` +
          `Expected annual savings: ₹${sScore.annualSavingINR.toLocaleString()} with payback period of ${sScore.paybackYears} years.`
        );
      }
    }
  }

  // RULE 3: Staff efficiency improvement for underutilized rooms
  const avgRoomKWh = validData.length > 0 ? validData.reduce((s, r) => s + r.totalKWh, 0) / validData.length : 0;
  const underutilizedRooms = validData.filter(r => r.totalKWh < avgRoomKWh * 0.4 && r.totalKWh > 2);
  
  if (underutilizedRooms.length > 0) {
    recommendations.push(
      `Operational Optimization: ${underutilizedRooms.length} room(s) show below-average consumption. ` +
      `Verify if equipment is active during non-operational hours or if appliances need maintenance.`
    );
  }

  // RULE 4: High wattage device recommendations
  const highWattageApps = rankedAppliances.filter(a => a.powerW > 500 && a.totalKWh > 30);
  if (highWattageApps.length > 0) {
    const topHighWatt = highWattageApps[0];
    recommendations.push(
      `Monitor High-Power Equipment: "${topHighWatt.name}" (${topHighWatt.powerW}W × ${topHighWatt.totalQuantity}) ` +
      `uses ${topHighWatt.totalKWh.toFixed(2)} kWh monthly. Consider power-down schedules or replacement with lower-wattage alternatives.`
    );
  }

  return {
    recommendations: recommendations.slice(0, 5), // Top 5 recommendations
    topRooms: rankedRooms.map(r => ({ roomId: r.roomId, name: r.roomName, kWh: +r.totalKWh.toFixed(2), cost: +r.totalCost.toFixed(2) })),
    topAppliances: rankedAppliances.map(a => ({ ...a, totalKWh: +a.totalKWh.toFixed(2), totalCost: +a.totalCost.toFixed(2) }))
  };
}

module.exports = { generateRecommendations };
