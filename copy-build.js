const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, 'app', 'build');
const destination = path.join(__dirname, 'server', 'build');

if (!fs.existsSync(source)) {
  console.error('React build folder not found:', source);
  process.exit(1);
}

if (fs.existsSync(destination)) {
  fs.rmSync(destination, { recursive: true, force: true });
}

fs.mkdirSync(destination, { recursive: true });

fs.cpSync(source, destination, { recursive: true });

console.log('Build copied successfully.');
