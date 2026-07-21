/**
 * launchBrowser.js
 * Centralized Puppeteer browser launcher.
 * Handles both local (Windows/Linux) and production (Lambda/serverless) environments.
 */

const puppeteer = require("puppeteer");
const chromium  = require("@sparticuz/chromium");
const https     = require("https");
const http      = require("http");

const CHROME_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--hide-scrollbars",
  "--disable-web-security",
  "--font-render-hinting=none",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-default-apps",
  "--disable-sync",
  "--no-first-run",
  "--disable-features=VizDisplayCompositor",
];

async function getExecPath() {
  // 1. Explicit override (e.g. set in .env for local dev)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const fs = require("fs");

  // 2. Windows default Chrome path
  if (process.platform === "win32") {
    const winPaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) return p;
    }
  }

  // 3. Linux default paths (for VPS / Render)
  if (process.platform === "linux") {
    const linuxPaths = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    ];
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) return p;
    }
  }

  // 4. Serverless / Lambda / Vercel — use @sparticuz/chromium
  try {
    const sparticuzUrl = "https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar";
    console.log("[Browser] Attempting Sparticuz Chromium resolution...");
    let sparticuzPath = await chromium.executablePath();
    if (!sparticuzPath || sparticuzPath.includes("null")) {
      console.log("[Browser] Local Sparticuz empty, downloading from remote...");
      sparticuzPath = await chromium.executablePath(sparticuzUrl);
    }
    if (sparticuzPath) return sparticuzPath;
  } catch (err) {
    console.warn("[Browser] Sparticuz resolution failed. Retrying with explicit URL. Error:", err.message);
    try {
      const fallbackPath = await chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar");
      if (fallbackPath) return fallbackPath;
    } catch (e) {
      console.warn("[Browser] Sparticuz remote fallback also failed:", e.message);
    }
  }

  // 5. Fallback to null, allowing require('puppeteer') to use its bundled browser
  return null;
}

/**
 * Fetch a URL and return it as a base64 data URI.
 * Falls back to empty string on any failure (don't block PDF for a broken image).
 * @param {string} url
 * @returns {Promise<string>}
 */
async function urlToBase64(url) {
  if (!url || typeof url !== "string") return "";

  return new Promise((resolve) => {
    try {
      const proto = url.startsWith("https") ? https : http;
      const req = proto.get(url, { timeout: 8000 }, (res) => {
        if (res.statusCode !== 200) {
          console.warn(`[PDF] Image fetch failed (${res.statusCode}): ${url}`);
          return resolve("");
        }

        const contentType = res.headers["content-type"] || "image/png";
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const base64 = Buffer.concat(chunks).toString("base64");
          resolve(`data:${contentType};base64,${base64}`);
        });
        res.on("error", (e) => {
          console.warn(`[PDF] Image stream error: ${e.message}`);
          resolve("");
        });
      });

      req.on("timeout", () => {
        console.warn(`[PDF] Image fetch timeout: ${url}`);
        req.destroy();
        resolve("");
      });

      req.on("error", (e) => {
        console.warn(`[PDF] Image fetch request error: ${e.message}`);
        resolve("");
      });
    } catch (e) {
      console.warn(`[PDF] urlToBase64 exception: ${e.message}`);
      resolve("");
    }
  });
}

/**
 * Pre-fetch all external image URLs in the HTML and replace them with inline base64.
 * This prevents Puppeteer from making external HTTP requests during rendering,
 * which is the root cause of waitUntil: networkidle0 timeouts.
 * @param {string} html
 * @returns {Promise<string>}
 */
async function inlineExternalImages(html) {
  // Match src="http..." or src='http...' patterns
  const srcPattern = /src=["'](https?:\/\/[^"']+)["']/g;
  const matches = [...html.matchAll(srcPattern)];

  if (matches.length === 0) return html;

  console.log(`[PDF] Pre-fetching ${matches.length} external image(s)...`);

  // Deduplicate URLs
  const uniqueUrls = [...new Set(matches.map((m) => m[1]))];

  // Fetch all in parallel
  const base64Map = {};
  await Promise.all(
    uniqueUrls.map(async (url) => {
      base64Map[url] = await urlToBase64(url);
    })
  );

  // Replace all src="http..." with src="data:..."
  let inlined = html;
  for (const [url, b64] of Object.entries(base64Map)) {
    if (b64) {
      // Escape URL for regex use
      const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      inlined = inlined.replace(new RegExp(escaped, "g"), b64);
      console.log(`[PDF] Inlined: ${url.substring(0, 60)}...`);
    } else {
      console.warn(`[PDF] Skipped (fetch failed): ${url.substring(0, 60)}...`);
    }
  }

  return inlined;
}

/**
 * Launch a Puppeteer browser instance.
 * Always call browser.close() in a finally block.
 * @returns {Promise<Browser>}
 */
async function launchBrowser() {
  const execPath = await getExecPath();
  const isSparticuz = execPath && execPath.includes('/tmp/');
  console.log(`[Browser] Using Chrome at: ${execPath || 'default bundled chromium'} (Sparticuz: ${!!isSparticuz})`);

  const launchOptions = {
    headless: isSparticuz ? chromium.headless : "new",
    args: isSparticuz ? chromium.args : CHROME_ARGS,
    defaultViewport: isSparticuz ? chromium.defaultViewport : { width: 1200, height: 1600 },
    timeout: 60000,
  };

  if (execPath) {
    launchOptions.executablePath = execPath;
  }

  let browser;
  try {
    browser = await puppeteer.launch(launchOptions);
  } catch (err) {
    if (err.message.includes("Could not find Chrome") || err.message.includes("Could not find expected browser")) {
      console.log("[Browser] Chrome not found. Running precise auto-installation...");
      
      // Extract exact version from error (e.g., "Could not find Chrome (ver. 127.0.6533.88)")
      let version = "127.0.6533.88"; // Fallback to 127.0.6533.88 for puppeteer 22.15.0
      const match = err.message.match(/ver\. ([\d\.]+)/);
      if (match && match[1]) {
        version = match[1];
      }

      // Extract exact cache path from error (e.g., "which is: /home/sbx_user1051/.cache/puppeteer)")
      let cachePath = "";
      const pathMatch = err.message.match(/which is: (.*?)\)/);
      if (pathMatch && pathMatch[1]) {
        cachePath = pathMatch[1].trim();
      }

      console.log(`[Browser] Missing version detected as: ${version}. Downloading to ${cachePath || 'default'}...`);
      const { execSync } = require('child_process');
      const cmd = cachePath 
        ? `npx @puppeteer/browsers install chrome@${version} --path ${cachePath}` 
        : `npx @puppeteer/browsers install chrome@${version}`;
      
      console.log(`[Browser] Executing: ${cmd}`);
      execSync(cmd, { stdio: 'inherit' });
      console.log("[Browser] Auto-installation complete. Retrying launch...");
      
      // Retry launch
      browser = await puppeteer.launch(launchOptions);
    } else {
      throw err;
    }
  }

  return browser;
}

/**
 * Generate a PDF Buffer from an HTML string.
 * - Pre-inlines all external images as base64 to avoid network timeouts.
 * - Uses domcontentloaded instead of networkidle0 for speed and reliability.
 * @param {string} html - HTML content to render
 * @param {object} [pdfOptions] - Puppeteer PDF options
 * @returns {Promise<Buffer>}
 */
async function htmlToPdfBuffer(html, pdfOptions = {}) {
  const start = Date.now();
  let browser;

  try {
    // Step 1: Pre-inline all external images to avoid network timeouts
    const inlinedHtml = await inlineExternalImages(html);

    // Step 2: Launch browser
    browser = await launchBrowser();
    const page = await browser.newPage();

    // Block ALL external network requests during rendering
    // (images are already inlined, so nothing external is needed)
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      const resourceType = req.resourceType();

      // Allow data URIs (our inlined base64 images)
      if (url.startsWith("data:")) {
        return req.continue();
      }

      // Block all external HTTP requests — they cause networkidle0 timeouts
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return req.abort();
      }

      req.continue();
    });

    // Step 3: Set content using domcontentloaded — fast and reliable
    // We don't need networkidle0 because all images are inlined
    await page.setContent(inlinedHtml, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Small delay to ensure layout is complete (fonts, CSS calculations)
    await new Promise((r) => setTimeout(r, 500));

    // Step 4: Generate PDF
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
      ...pdfOptions,
    });

    const bufferObj = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const duration = Date.now() - start;
    console.log(`[PDF] Generated in ${duration}ms, size: ${bufferObj.length} bytes`);

    // Sanity checks
    if (!bufferObj || bufferObj.length === 0) {
      throw new Error("PDF buffer is empty after generation");
    }

    const header = bufferObj.toString("utf8", 0, 5);
    if (header !== "%PDF-") {
      throw new Error(`Invalid PDF header: "${header}". PDF generation failed.`);
    }

    return bufferObj;
  } finally {
    if (browser) {
      await browser.close().catch((e) =>
        console.warn("[Browser] Close error:", e.message)
      );
    }
  }
}

module.exports = { launchBrowser, htmlToPdfBuffer, inlineExternalImages };
