/**
 * launchBrowser.js
 * Centralized Puppeteer browser launcher.
 * Handles both local (Windows/Linux) and production (Vercel Serverless) environments.
 */

const puppeteer = require("puppeteer-core");
const https = require("https");
const http = require("http");

// Sparticuz chromium provides optimal defaults for AWS Lambda / Vercel
const chromium = require("@sparticuz/chromium");

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
 * This prevents Puppeteer from waiting on image networks during PDF rendering.
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
 * Launch a Puppeteer browser instance optimized for Vercel/AWS Lambda.
 * @returns {Promise<import('puppeteer-core').Browser>}
 */
async function launchBrowser() {
  const launchStart = Date.now();
  console.log(`[TIME: ${launchStart}] [STEP 4] Starting browser launch`);
  console.log("--- ENVIRONMENT DIAGNOSTICS ---");
  console.log("process.platform:", process.platform);
  console.log("process.env.VERCEL:", process.env.VERCEL);

  const isLocal = process.platform === "win32" || process.env.NODE_ENV === "development";
  let executablePath, args, headless;

  if (isLocal) {
    // ——— Local (Windows / Linux dev) ———
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (process.platform === "win32") {
      const fs = require("fs");
      const winPaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      ];
      for (const p of winPaths) {
        if (fs.existsSync(p)) {
          executablePath = p;
          break;
        }
      }
    }
    args = puppeteer.defaultArgs();
    headless = true;
  } else {
    // ——— Vercel / AWS Lambda ———
    try {
      executablePath = await chromium.executablePath();
    } catch (err) {
      console.error("[STEP 5 FAILED] chromium.executablePath() error:", err);
      throw err;
    }

    // Start with chromium's recommended args, then add GPU‑disabling flags
    const defaultArgs = chromium.args;
    args = [
      ...defaultArgs,
      '--disable-gpu',
      '--disable-software-rasterizer',
    ];
    if (!args.includes('--no-sandbox')) {
      args.push('--no-sandbox');
    }

    // Use old headless mode to avoid GPU process
    headless = 'old';  // or `true` (old headless)
  }

  console.log("[STEP 5] Chromium executable path:", executablePath || 'default');
  if (!isLocal) {
    console.log("Final args:", args);
    console.log("Headless mode:", headless);
  }

  try {
    const browser = await puppeteer.launch({
      executablePath,
      headless,
      args,
      defaultViewport: chromium.defaultViewport,
      timeout: 60000,
    });
    console.log(`[TIME: ${Date.now()}] [STEP 6] Browser launched successfully. Took ${Date.now() - launchStart}ms`);
    return browser;
  } catch (err) {
    console.error(`[TIME: ${Date.now()}] [STEP 6 FAILED] Took ${Date.now() - launchStart}ms. Error:`, err);
    // Filesystem diagnostics (optional)
    if (!isLocal && executablePath) {
      const fs = require('fs');
      if (!fs.existsSync(executablePath)) {
        console.error(`FATAL: Executable does not exist at ${executablePath}`);
      } else {
        const stats = fs.statSync(executablePath);
        console.log(`Executable size: ${stats.size} bytes, permissions: ${stats.mode.toString(8)}`);
      }
    }
    throw err;
  }
}
/**
 * Generate a PDF Buffer from an HTML string.
 * @param {string} html - HTML content to render
 * @param {object} [pdfOptions] - Puppeteer PDF options
 * @returns {Promise<Buffer>}
 */
async function htmlToPdfBuffer(html, pdfOptions = {}) {
  const globalStart = Date.now();
  console.log(`[TIME: ${globalStart}] [STEP 1] HTML generated`);
  console.log(`[STEP 1.1] HTML size: ${(html.length / 1024).toFixed(2)} KB`);

  // Simple counters for diagnostic logs
  const imgCount = (html.match(/<img/g) || []).length;
  const extImgCount = (html.match(/src=["'](https?:\/\/[^"']+)["']/g) || []).length;
  const fontCount = (html.match(/@font-face/g) || []).length;
  const extCssCount = (html.match(/<link[^>]+rel=["']stylesheet["']/g) || []).length;
  console.log(`[DIAGNOSTICS] Images: ${imgCount} (External: ${extImgCount}), Fonts: ${fontCount}, CSS files: ${extCssCount}`);

  let browser;

  try {
    const inlineStart = Date.now();
    const inlinedHtml = await inlineExternalImages(html);
    console.log(`[TIME: ${Date.now()}] [STEP 1.2] inlineExternalImages took ${Date.now() - inlineStart}ms`);

    browser = await launchBrowser();

    let page;
    try {
      const newPageStart = Date.now();
      page = await browser.newPage();
      console.log(`[TIME: ${Date.now()}] [STEP 7] New page created. Took ${Date.now() - newPageStart}ms`);

      // Track ongoing requests
      let activeRequests = 0;
      page.on('request', (req) => {
        activeRequests++;
        console.log(`[NETWORK] Request started: ${req.url()}`);
      });
      page.on('requestfinished', (req) => {
        activeRequests--;
        console.log(`[NETWORK] Request finished: ${req.url()}`);
      });
      page.on('requestfailed', (req) => {
        activeRequests--;
        console.log(`[NETWORK] Request failed: ${req.url()} - ${req.failure()?.errorText}`);
      });

      // We log active requests right before timeouts
      page.on('error', err => console.log('[PAGE ERROR]', err));

    } catch (err) {
      console.error(`[TIME: ${Date.now()}] [STEP 7 FAILED] browser.newPage() error:`, err);
      throw err;
    }

    try {
      const contentStart = Date.now();
      console.log(`[TIME: ${contentStart}] [STEP 8] page.setContent() started`);
      // Changed from networkidle0 to domcontentloaded to prevent network hangs
      // We will manually wait for fonts to load instead.
      await page.setContent(inlinedHtml, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      console.log(`[TIME: ${Date.now()}] [STEP 8] page.setContent() completed. Took ${Date.now() - contentStart}ms`);

      // Manually wait for fonts
      const fontStart = Date.now();
      await page.evaluateHandle('document.fonts.ready').catch(() => { });
      console.log(`[TIME: ${Date.now()}] [STEP 8.1] Document fonts ready. Took ${Date.now() - fontStart}ms`);

    } catch (err) {
      console.error(`[TIME: ${Date.now()}] [STEP 8 FAILED] page.setContent() error:`, err);
      throw err;
    }

    let buffer;
    try {
      const pdfStart = Date.now();
      console.log(`[TIME: ${pdfStart}] [STEP 9] page.pdf() started`);
      buffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
        timeout: 45000,
        ...pdfOptions,
      });
      console.log(`[TIME: ${Date.now()}] [STEP 9] page.pdf() completed. Took ${Date.now() - pdfStart}ms`);
    } catch (err) {
      console.error(`[TIME: ${Date.now()}] [STEP 9 FAILED] page.pdf() error:`, err);
      throw err;
    }

    const bufferObj = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const duration = Date.now() - start;
    console.log(`[PDF] Generated in ${duration}ms, size: ${bufferObj.length} bytes`);

    if (!bufferObj || bufferObj.length === 0) {
      throw new Error("PDF buffer is empty after generation");
    }

    return bufferObj;
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log("[STEP 10] Browser closed");
      } catch (e) {
        console.error("[STEP 10 FAILED] Browser close error:", e);
        console.error(e.stack);
      }
    }
  }
}

module.exports = { launchBrowser, htmlToPdfBuffer, inlineExternalImages };