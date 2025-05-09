const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Create a test SVG file if it doesn't exist
const testSvgPath = path.join(__dirname, 'test.svg');
if (!fs.existsSync(testSvgPath)) {
  const svgContent = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="blue"/>
      <circle cx="50" cy="50" r="40" fill="red"/>
    </svg>
  `;
  fs.writeFileSync(testSvgPath, svgContent);
}

async function runLoadTest() {
  // Read the SVG file into a buffer
  const svgBuffer = fs.readFileSync(testSvgPath);

  // Create form data
  const form = new FormData();
  form.append('svg', svgBuffer, {
    filename: 'test.svg',
    contentType: 'image/svg+xml'
  });
  form.append('width', '800');
  form.append('height', '600');
  form.append('format', 'png');

  const result = await autocannon({
    url: 'http://localhost:3000',
    method: 'POST',
    headers: {
      ...form.getHeaders(),
      'Accept': 'image/png'
    },
    body: form.getBuffer(),
    connections: 10,
    duration: 10,
    timeout: 20
  });

  console.log('Load test results:');
  console.log(`Average latency: ${result.latency.average}ms`);
  console.log(`Requests/second: ${result.requests.average}`);
  console.log(`2xx responses: ${result['2xx']}`);
  console.log(`Non-2xx responses: ${result.non2xx}`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Timeouts: ${result.timeouts}`);
}

runLoadTest().catch(console.error); 