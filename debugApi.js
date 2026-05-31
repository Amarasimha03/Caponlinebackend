// use native fetch

async function test() {
  try {
    // 1. Get an admin token directly using the login endpoint
    const baseURL = process.env.API_URL || 'https://capbackend.onrender.com';
    const loginRes = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: 'Admin123' })
    });
    const loginData = await loginRes.json();
    console.log('Login:', loginData.success ? 'Success' : loginData.message);
    if (!loginData.success) return;

    const token = loginData.token;

    // 2. Fetch assessments
    console.log('Fetching /api/assessments...');
    const getRes = await fetch(`${baseURL}/api/assessments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('GET Status:', getRes.status);
    console.log('GET Body:', await getRes.text());

    // 3. Create assessment
    console.log('Creating assessment...');
    const postRes = await fetch(`${baseURL}/api/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        _id: 'AA05',
        title: 'Debug Assessment',
        duration: 30,
        passingScore: 60,
        category: 'General',
        status: 'draft',
        maxViolations: 3,
        isRandomized: false
      })
    });
    console.log('POST Status:', postRes.status);
    console.log('POST Body:', await postRes.text());

  } catch (err) {
    console.error(err);
  }
}
test();
