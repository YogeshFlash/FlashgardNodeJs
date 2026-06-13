const axios = require('axios');

async function testBatches() {
  try {
    // 1. Login as fgadmin
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'fgadmin@flashsolutions.in',
      password: 'password' // I don't know the password...
    });
    console.log(loginRes.data);
  } catch (e) {
    console.error(e.message);
  }
}
testBatches();
