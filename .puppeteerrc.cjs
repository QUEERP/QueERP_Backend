const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to a local directory within the project
  // so that Render (and other hosts) bundle it correctly in the runtime container.
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
