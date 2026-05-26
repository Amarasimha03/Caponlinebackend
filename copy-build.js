const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  let entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync('./server/build')) {
  fs.rmSync('./server/build', { recursive: true, force: true });
}

if (fs.existsSync('./app/build')) {
  copyDir('./app/build', './server/build');
  console.log('React build copied to server/build');
} else {
  console.error('React build directory not found');
  process.exit(1);
}
