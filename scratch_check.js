const { readDB } = require('./utils/localCache');
const db = readDB();
console.log('Results in local database:', db.results.map(r => ({
  _id: r._id,
  employee: r.employee,
  assessment: r.assessment,
  status: r.status
})));
