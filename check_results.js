const { querySheets } = require('./server/services/googleSheets');
require('dotenv').config({ path: './server/.env' });

async function cleanCorrupted() {
  const res = await querySheets('getResults');
  const results = res.data || [];
  
  const corrupted = results.filter(r => !r.assessment && !r.assessmentId);
  console.log(`Found ${corrupted.length} corrupted results. Deleting...`);
  
  for (const r of corrupted) {
    await querySheets('deleteEntity', { type: 'result', id: r._id });
    console.log(`Deleted ${r._id}`);
  }
  console.log("Cleanup complete.");
}

cleanCorrupted().catch(console.error);
