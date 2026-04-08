const mongoose = require('mongoose');

const RoomAppliance = require('./server/models/RoomAppliance');
const Room = require('./server/models/Room');
const ApplianceLibrary = require('./server/models/ApplianceLibrary');
const FaultLog = require('./server/models/FaultLog');
const Department = require('./server/models/Department');
const Holiday = require('./server/models/Holiday');
const TimetableEntry = require('./server/models/TimetableEntry');

const { computeRoomConsumption } = require('./server/services/consumptionEngine');
const { generateRecommendations } = require('./server/services/recommendationEngine');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/vjti_energy');
  console.log('Connected');

  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  const recs = await generateRecommendations(null, m, y).catch(e => { console.log('generateRecommendations error:', e); return null;});
  
  if (recs) {
    console.log('Top Rooms Length:', recs.topRooms.length);
    console.log('Recommendations Length:', recs.recommendations.length);

    const rooms = await Room.find();
    console.log('Total rooms:', rooms.length);
    for (const r of rooms) {
        const apps = await RoomAppliance.find({ roomId: r._id, isActive: true }).populate('applianceLibraryId');
        console.log(`Room ${r.name} apps:`, apps.length);
        if (apps.length > 0) {
          const cons = await computeRoomConsumption(r._id, m, y).catch(e => { console.log('computeRoomConsumption error:', e); return null;});
          if (cons) console.log(`Cons: totalKWh=${cons.totalKWh}, workingDays=${cons.workingDays}`);
        }
    }
  }

  process.exit(0);
}

main().catch(console.error);
