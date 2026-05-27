const { readDB } = require('./utils/localCache');
const db = readDB();
console.log('Assessments:', db.assessments.map(a => ({
  _id: a._id,
  title: a.title,
  questionsCount: a.questions?.length
})));
console.log('Questions (first 5):', db.questions.slice(0, 5).map(q => ({
  _id: q._id,
  title: q.title,
  assessment: q.assessment
})));
