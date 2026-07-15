const http = require('http');

http.get('http://localhost:3000/api/model-categories?onlyWithModels=true&parentId=null', (res) => {
  console.log('Status Code:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      console.log('Headers:', res.headers);
      console.log('Response body preview:', data.substring(0, 500));
      const parsed = JSON.parse(data);
      console.log('Parsed items count:', parsed.length);
    } catch (e) {
      console.log('Error parsing response:', e.message);
    }
  });
}).on('error', err => {
  console.error('API request error:', err.message);
});
