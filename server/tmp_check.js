const mongoose = require('mongoose');
require('dotenv').config();

const RoomAppliance = require('./models/RoomAppliance');
const Room = require('./models/Room');
const { computeRoomConsumption } = require('./services/consumptionEngine');
const { generateRecommendations } = require('./services/recommendationEngine');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vjti_energy');
  console.log('Connected');

  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  const recs = await generateRecommendations(null, m, y);
  
  console.log('Top Rooms Length:', recs.topRooms.length);
  console.log('Recommendations Length:', recs.recommendations.length);
  console.log('Recs:', JSON.stringify(recs.recommendations, null, 2));

  if (recs.topRooms.length === 0) {
    const rooms = await Room.find();
    console.log('Total rooms:', rooms.length);
    for (const r of rooms) {
       const apps = await RoomAppliance.find({ roomId: r._id, isActive: true }).populate('applianceLibraryId');
       console.log(`Room ${r.name} apps:`, apps.length);
       if (apps.length > 0) {
          const cons = await computeRoomConsumption(r._id, m, y);
          console.log(`Cons: totalKWh=${cons.totalKWh}, workingDays=${cons.workingDays}`);
       }
    }
  }

  process.exit(0);
}

main().catch(console.error);
