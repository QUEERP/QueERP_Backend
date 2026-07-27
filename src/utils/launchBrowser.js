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
  console.log("[STEP 4] Starting browser launch");
  console.log("--- ENVIRONMENT DIAGNOSTICS ---");
  console.log("process.platform:", process.platform);
  console.log("process.version:", process.version);
  console.log("process.env.VERCEL:", process.env.VERCEL);
  console.log("process.env.NODE_ENV:", process.env.NODE_ENV);
  try {
    const pkg = require("../../package.json");
    console.log("puppeteer-core version:", pkg.dependencies["puppeteer-core"]);
    console.log("@sparticuz/chromium version:", pkg.dependencies["@sparticuz/chromium"]);
  } catch (e) {
    console.log("Could not read package.json version", e.message);
  }
  console.log("-------------------------------");

  const isLocal = process.platform === "win32" || process.env.NODE_ENV === "development";
  
  let executablePath;
  
  if (isLocal) {
    // 1. Explicit override for local dev
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    } else if (process.platform === "win32") {
      // 2. Windows default paths
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
  } else {
    // 3. Vercel Serverless / AWS Lambda
    try {
      executablePath = await chromium.executablePath();
      console.log("chromium.executablePath() succeeded.");
    } catch (err) {
      console.error("[STEP 5 FAILED] chromium.executablePath() error:", err);
      console.error(err.stack);
      throw err;
    }
  }

  console.log("[STEP 5] Chromium executable path:", executablePath || 'default');
  
  if (!isLocal) {
    console.log("chromium.args:", chromium.args);
    console.log("chromium.headless:", chromium.headless);
  }

  try {
    const browser = await puppeteer.launch({
      executablePath: executablePath,
      headless: isLocal ? true : chromium.headless,
      args: isLocal ? puppeteer.defaultArgs() : chromium.args,
      defaultViewport: chromium.defaultViewport,
      timeout: 60000,
    });
    console.log("[STEP 6] Browser launched successfully");
    return browser;
  } catch (err) {
    console.error("[STEP 6 FAILED] Failed to launch browser process:", err);
    console.error(err.stack);
    
    // Additional filesystem debug if Vercel
    if (!isLocal && executablePath) {
       const fs = require('fs');
       if (!fs.existsSync(executablePath)) {
         console.error(`FATAL: Executable does not exist at ${executablePath}`);
       } else {
         console.log(`Executable exists at ${executablePath}`);
         const stats = fs.statSync(executablePath);
         console.log(`Executable size: ${stats.size} bytes`);
         console.log(`Executable permissions: ${stats.mode.toString(8)}`);
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
  console.log("[STEP 2] HTML generated successfully");
  console.log(`[STEP 3] HTML size: ${html.length} characters`);
  const start = Date.now();
  let browser;

  try {
    const inlinedHtml = await inlineExternalImages(html);

    browser = await launchBrowser();
    
    let page;
    try {
      page = await browser.newPage();
      console.log("[STEP 7] New page created");
    } catch (err) {
      console.error("[STEP 7 FAILED] browser.newPage() error:", err);
      console.error(err.stack);
      throw err;
    }

    try {
      await page.setContent(inlinedHtml, {
        waitUntil: "networkidle0",
        timeout: 45000,
      });
      console.log("[STEP 8] HTML loaded");
    } catch (err) {
      console.error("[STEP 8 FAILED] page.setContent() error:", err);
      console.error(err.stack);
      throw err;
    }

    let buffer;
    try {
      buffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
        ...pdfOptions,
      });
      console.log("[STEP 9] PDF generated");
    } catch (err) {
      console.error("[STEP 9 FAILED] page.pdf() error:", err);
      console.error(err.stack);
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