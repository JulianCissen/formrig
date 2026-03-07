const fs   = require('fs');
const path = require('path');

module.exports = async function globalTeardown() {
  const dir = process.env['QUARANTINE_DIR'] ?? path.resolve(__dirname, 'quarantine');
  try {
    const files = await fs.promises.readdir(dir);
    await Promise.all(
      files.map((f) => fs.promises.unlink(path.join(dir, f)).catch(() => {})),
    );
  } catch {
    // Directory doesn't exist — nothing to clean.
  }
};
