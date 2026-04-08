const mongoose = require('mongoose');
require('dotenv').config();

const RoomAppliance = require('./server/models/RoomAppliance');
const Room = require('./server/models/Room');
const { computeRoomConsumption } = require('./server/services/consumptionEngine');
const { generateRecommendations } = require('./server/services/recommendationEngine');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vjti_energy');
  console.log('Connected');

  const rooms = await Room.find();
  console.log('Rooms:', rooms.length);

  for (const room of rooms) {
    const apps = await RoomAppliance.find({ roomId: room._id });
    console.log(`Room ${room.name} has ${apps.length} appliances`);
  }

  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  const recs = await generateRecommendations(null, m, y);
  
  console.log('Valid data length?', recs.topRooms.length);
  console.log(recs.recommendations);
  
  process.exit(0);
}

main().catch(console.error);
