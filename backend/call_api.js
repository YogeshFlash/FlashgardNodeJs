async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/models?categoryId=be3bef77-b9ee-49f9-bc58-164dba89d15d&take=100');
    const json = await res.json();
    console.log('Raw JSON Response:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('API call error:', e);
  }
}

main();
