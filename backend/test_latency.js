const fetch = require('node-fetch');

async function check() {
    const t0 = Date.now();
    try {
        const res = await fetch('http://localhost:3000/api/contacts?organizationId=a43f8ab3-380d-4bb8-8dd7-d5d59049e325', {
            headers: {
                // Not passing auth token might fail, but let's see. 
            }
        });
        const t1 = Date.now();
        console.log("Time: " + (t1 - t0) + "ms", res.status);
    } catch (e) {
        console.log(e);
    }
}
check();
