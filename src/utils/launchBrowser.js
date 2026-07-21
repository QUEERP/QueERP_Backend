/**
 * launchBrowser.js
 * Centralized Puppeteer browser launcher.
 * Handles both local (Windows/Linux) and production (Vercel/Lambda/serverless) environments.
 *
 * Strategy:
 *   - On Vercel / AWS Lambda: uses puppeteer-core + @sparticuz/chromium (downloads binary to /tmp)
 *   - On local Windows/Linux: uses puppeteer (which has bundled Chrome)
 */

const https = require("https");
const http  = require("http");

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

// Vercel sets VERCEL=1, AWS Lambda sets AWS_EXECUTION_ENV or AWS_LAMBDA_FUNCTION_NAME
// The sbx_user home path is another signal for Vercel's Lambda sandbox
function isServerless() {
  return !!(
    process.env.VERCEL ||
    process.env.AWS_EXECUTION_ENV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    (process.env.HOME && process.env.HOME.includes("sbx_user"))
  );
}

/**
 * Launch a Puppeteer browser instance.
 * Always call browser.close() in a finally block.
 * @returns {Promise<Browser>}
 */
async function launchBrowser() {
  // ── SERVERLESS PATH (Vercel / AWS Lambda) ──────────────────────────────────
  if (isServerless()) {
    console.log("[Browser] Serverless environment detected (Vercel/Lambda). Using @sparticuz/chromium.");

    const chromium = require("@sparticuz/chromium");
    const puppeteerCore = require("puppeteer-core");

    // Pass the remote tarball URL so chromium downloads its binary into /tmp at runtime.
    // This is the ONLY approach that works on Vercel's read-only filesystem.
    const SPARTICUZ_URL =
      "https://github.com/Sparticuz/chromium/releases/download/v127.0.0/chromium-v127.0.0-pack.tar";

    const execPath = await chromium.executablePath(SPARTICUZ_URL);
    console.log(`[Browser] Sparticuz executablePath: ${execPath}`);

    const browser = await puppeteerCore.launch({
      executablePath: execPath,
      headless: chromium.headless,
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      timeout: 60000,
    });

    return browser;
  }

  // ── LOCAL PATH (Windows / Linux VPS) ───────────────────────────────────────
  console.log("[Browser] Local environment detected. Using puppeteer with bundled Chrome.");
  const puppeteer = require("puppeteer");
  const fs = require("fs");

  let execPath = process.env.PUPPETEER_EXECUTABLE_PATH || null;

  if (!execPath && process.platform === "win32") {
    const winPaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ];
    for (const p of winPaths) {
      if (fs.existsSync(p)) { execPath = p; break; }
    }
  }

  if (!execPath && process.platform === "linux") {
    const linuxPaths = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    ];
    for (const p of linuxPaths) {
      if (fs.existsSync(p)) { execPath = p; break; }
    }
  }

  const launchOptions = {
    headless: "new",
    args: CHROME_ARGS,
    defaultViewport: { width: 1200, height: 1600 },
    timeout: 60000,
  };

  if (execPath) {
    launchOptions.executablePath = execPath;
    console.log(`[Browser] Using explicit Chrome path: ${execPath}`);
  } else {
    console.log("[Browser] Using puppeteer bundled Chrome.");
  }

  try {
    return await puppeteer.launch(launchOptions);
  } catch (err) {
    if (err.message.includes("Could not find Chrome") || err.message.includes("Could not find expected browser")) {
      console.log("[Browser] Chrome not found. Auto-installing for cPanel/VPS...");
      
      let version = "127.0.6533.88";
      const match = err.message.match(/ver\. ([\d\.]+)/);
      if (match && match[1]) version = match[1];

      let cachePath = "";
      const pathMatch = err.message.match(/which is: (.*?)\)/);
      if (pathMatch && pathMatch[1]) cachePath = pathMatch[1].trim();

      const { execSync } = require("child_process");
      const cmd = cachePath 
        ? `npx @puppeteer/browsers install chrome@${version} --path ${cachePath}` 
        : `npx @puppeteer/browsers install chrome@${version}`;
      
      console.log(`[Browser] Executing: ${cmd}`);
      const output = execSync(cmd, { encoding: 'utf-8' });
      console.log(`[Browser] Install Output:\n${output}`);

      const lines = output.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('chrome@')) {
          const parts = line.trim().split(' ');
          if (parts.length >= 2) {
            launchOptions.executablePath = parts[1].trim();
            console.log(`[Browser] Found installed path: ${launchOptions.executablePath}`);
            break;
          }
        }
      }
      
      console.log("[Browser] Retrying launch after installation...");
      return await puppeteer.launch(launchOptions);
    }
    throw err;
  }
}

// ── Image helpers ─────────────────────────────────────────────────────────────

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
  const srcPattern = /src=["'](https?:\/\/[^"']+)["']/g;
  const matches = [...html.matchAll(srcPattern)];

  if (matches.length === 0) return html;

  console.log(`[PDF] Pre-fetching ${matches.length} external image(s)...`);

  const uniqueUrls = [...new Set(matches.map((m) => m[1]))];

  const base64Map = {};
  await Promise.all(
    uniqueUrls.map(async (url) => {
      base64Map[url] = await urlToBase64(url);
    })
  );

  let inlined = html;
  for (const [url, b64] of Object.entries(base64Map)) {
    if (b64) {
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
 * Generate a PDF Buffer from an HTML string.
 * @param {string} html - HTML content to render
 * @param {object} [pdfOptions] - Puppeteer PDF options
 * @returns {Promise<Buffer>}
 */
async function htmlToPdfBuffer(html, pdfOptions = {}) {
  const start = Date.now();
  let browser;

  try {
    const inlinedHtml = await inlineExternalImages(html);

    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (url.startsWith("data:")) return req.continue();
      if (url.startsWith("http://") || url.startsWith("https://")) return req.abort();
      req.continue();
    });

    await page.setContent(inlinedHtml, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await new Promise((r) => setTimeout(r, 500));

    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
      ...pdfOptions,
    });

    const bufferObj = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const duration = Date.now() - start;
    console.log(`[PDF] Generated in ${duration}ms, size: ${bufferObj.length} bytes`);

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
