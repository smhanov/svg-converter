const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { parseSVG } = require('./utils/svgParser');

const app = express();
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Browser pool configuration
const MAX_CONCURRENCY = parseInt(process.env.MAX_CONCURRENCY) || 2;
const BROWSER_TIMEOUT = 2 * 60 * 1000; // 2 minutes in milliseconds
const RENDER_TIMEOUT = parseInt(process.env.RENDER_TIMEOUT) || 10 * 1000; // Configurable timeout in milliseconds

// Server configuration
const SERVER_HOST = process.env.SERVER_HOST || '0.0.0.0';
const SERVER_PORT = parseInt(process.env.SERVER_PORT) || 3000;

// Browser pool state
const browserPool = {
  browsers: [], // Array of { browser, lastUsed, inUse }
  cleanupInterval: null,
  browsersBeingLaunched: 0, // Track number of browsers currently being launched

  async initialize() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Check every minute
  },

  async cleanup() {
    const now = Date.now();
    for (let i = this.browsers.length - 1; i >= 0; i--) {
      const browser = this.browsers[i];
      if (!browser.inUse && (now - browser.lastUsed) > BROWSER_TIMEOUT) {
        console.log('Cleaning up unused browser');
        await browser.browser.close();
        this.browsers.splice(i, 1);
      }
    }
  },

  async getBrowser() {
    // Try to find an available browser
    const availableBrowser = this.browsers.find(b => !b.inUse);
    if (availableBrowser) {
      availableBrowser.inUse = true;
      availableBrowser.lastUsed = Date.now();
      return availableBrowser.browser;
    }

    // Check if we've reached the limit before launching a new browser
    if (this.browsers.length + this.browsersBeingLaunched >= MAX_CONCURRENCY) {
      // Wait for a browser to become available
      console.log('Waiting for available browser...');
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const availableBrowser = this.browsers.find(b => !b.inUse);
          if (availableBrowser) {
            clearInterval(checkInterval);
            availableBrowser.inUse = true;
            availableBrowser.lastUsed = Date.now();
            resolve(availableBrowser.browser);
          }
        }, 100);
      });
    }

    // If we haven't reached the limit, create a new browser
    console.log('Launching new browser');
    this.browsersBeingLaunched++;
    try {
      const browser = await puppeteer.launch({
        args: ['--no-sandbox',
          '--disable-setuid-sandbox']
      });

      this.browsers.push({
        browser,
        lastUsed: Date.now(),
        inUse: true
      });
      return browser;
    } finally {
      this.browsersBeingLaunched--;
    }
  },

  releaseBrowser(browser) {
    const browserEntry = this.browsers.find(b => b.browser === browser);
    if (browserEntry) {
      console.log("Releasing browser");
      browserEntry.inUse = false;
      browserEntry.lastUsed = Date.now();
    }
  },

  async killBrowser(browser) {
    if (!browser) {
      console.log('No browser instance to kill');
      return;
    }

    try {
      // Get the browser process
      const process = browser.process();
      if (process) {
        // Kill the process and all its children
        process.kill('SIGKILL');
      } else {
        console.log('Browser process not found, browser might be already closed');
      }

      // Remove the browser from the pool
      const browserIndex = this.browsers.findIndex(b => b.browser === browser);
      if (browserIndex !== -1) {
        this.browsers.splice(browserIndex, 1);
      }
    } catch (error) {
      console.error('Error killing browser process:', error);
      // Still try to remove the browser from the pool even if killing fails
      const browserIndex = this.browsers.findIndex(b => b.browser === browser);
      if (browserIndex !== -1) {
        this.browsers.splice(browserIndex, 1);
      }
    }
  },

  async shutdown() {
    clearInterval(this.cleanupInterval);
    await Promise.all(this.browsers.map(b => b.browser.close()));
    this.browsers = [];
  }
};

// Initialize browser pool
browserPool.initialize();

// Middleware for logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check and test form endpoint
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SVG to Image Converter</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          margin-bottom: 20px;
        }
        .form-group {
          margin-bottom: 15px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          color: #666;
        }
        input[type="file"],
        input[type="number"] {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        }
        select {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background-color: white;
        }
        button {
          background-color: #4CAF50;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        button:hover {
          background-color: #45a049;
        }
        #result {
          margin-top: 20px;
          text-align: center;
        }
        #preview {
          max-width: 100%;
          margin-top: 10px;
        }
        .error {
          color: red;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>SVG to Image Converter</h1>
        <form id="convertForm">
          <div class="form-group">
            <label for="svgFile">SVG File:</label>
            <input type="file" id="svgFile" name="svg" accept=".svg" required>
          </div>
          <div class="form-group">
            <label for="width">Width:</label>
            <input type="number" id="width" name="width" min="1" max="10000" value="800" required>
          </div>
          <div class="form-group">
            <label for="height">Height:</label>
            <input type="number" id="height" name="height" min="1" max="10000" value="600" required>
          </div>
          <div class="form-group">
            <label for="format">Output Format:</label>
            <select id="format" name="format">
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <button type="submit">Convert</button>
        </form>
        <div id="result"></div>
      </div>

      <script>
        document.getElementById('convertForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const form = e.target;
          const resultDiv = document.getElementById('result');
          resultDiv.innerHTML = 'Converting...';

          const formData = new FormData(form);
          const format = document.getElementById('format').value;

          try {
            const response = await fetch('/', {
              method: 'POST',
              body: formData,
              headers: {
                'Accept': 'image/' + format
              }
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Conversion failed');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            resultDiv.innerHTML = \`
              <h3>Conversion Successful!</h3>
              <img id="preview" src="\${url}" alt="Converted image">
              <p><a href="\${url}" download="converted.\${format}">Download Image</a></p>
            \`;
          } catch (error) {
            resultDiv.innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// SVG to PNG conversion endpoint
app.post('/', upload.single('svg'), async (req, res) => {
  let browser;
  let tempHtmlPath;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No SVG file provided' });
    }

    const width = parseInt(req.body.width);
    const height = parseInt(req.body.height);

    if (!width || !height) {
      return res.status(400).json({ error: 'Width and height are required' });
    }

    // Parse SVG to get dimensions
    const svgContent = req.file.buffer.toString();
    const svgDimensions = await parseSVG(svgContent);

    // Calculate scaling factor to maintain aspect ratio
    const svgAspectRatio = svgDimensions.width / svgDimensions.height;
    const requestedAspectRatio = width / height;

    let viewportWidth, viewportHeight;

    if (svgAspectRatio > requestedAspectRatio) {
      // SVG is wider than requested dimensions
      viewportWidth = width;
      viewportHeight = Math.round(viewportWidth / svgAspectRatio);
    } else {
      // SVG is taller than requested dimensions
      viewportHeight = height;
      viewportWidth = Math.round(viewportHeight * svgAspectRatio);
    }

    // Ensure dimensions are within Puppeteer's limits and are integers
    const MAX_DIMENSION = 10000;
    viewportWidth = Math.min(Math.max(1, Math.round(viewportWidth)), MAX_DIMENSION);
    viewportHeight = Math.min(Math.max(1, Math.round(viewportHeight)), MAX_DIMENSION);

    console.log(`SVG dimensions: ${svgDimensions.width}x${svgDimensions.height}`);
    console.log(`Requested dimensions: ${width}x${height}`);
    console.log(`Setting viewport to ${viewportWidth}x${viewportHeight}`);

    // Create temporary HTML file
    const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    html, body {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        background: transparent;
                    }
                    img {
                        width: 100%;
                        height: 100%;
                        object-fit: contain;
                    }
                </style>
            </head>
            <body>
                <img src="data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}" />
            </body>
            </html>
        `;

    // Create temporary file with unique name
    tempHtmlPath = path.join(os.tmpdir(), `svg-convert-${Date.now()}-${Math.random().toString(36).substring(2)}.html`);
    await fs.writeFile(tempHtmlPath, htmlContent);

    // Set up abort handler
    const abortHandler = () => {
      console.log('Request aborted by client');
      if (browser) {
        browserPool.releaseBrowser(browser);
        browser = null;
      }
    };
    req.on('close', abortHandler);

    // Get a browser from the pool. This can take the most time, so
    // afterwards, we check if the client disconnected before continuing.
    browser = await browserPool.getBrowser();

    req.removeListener('close', abortHandler);  // Remove the abort handler
    if (browser == null) {
      // client aborted the connection.
      return res.status(499).json({ error: 'Client aborted the connection' });
    }

    const page = await browser.newPage();

    await page.setViewport({
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: 1
    });

    // Set up timeout for page.goto()
    let timeoutId;
    let timeoutResolve;
    const timeoutPromise = new Promise((resolve, reject) => {
      timeoutResolve = resolve;
      timeoutId = setTimeout(async () => {
        // Kill the browser process immediately
        await browserPool.killBrowser(browser);
        reject(new Error('SVG rendering timed out after 10 seconds'));
      }, RENDER_TIMEOUT);
    });

    try {
      await Promise.race([
        page.goto(`file://${tempHtmlPath}`),
        timeoutPromise
      ]);

      // Clear the timeout and resolve the promise since the conversion succeeded
      clearTimeout(timeoutId);
      timeoutResolve();
    } catch (error) {
      // Kill the browser and remove it from the pool
      await browserPool.killBrowser(browser);
      browser = null;

      if (error.message.includes('timed out')) {
        return res.status(504).json({
          error: 'SVG rendering timed out',
          details: 'The SVG file took too long to render. This might be due to complex animations or infinite loops in the SVG.'
        });
      }
      throw error;
    }

    // Determine content type from Accept header
    const acceptHeader = req.headers.accept || 'image/png';
    let screenshotOptions = {
      type: acceptHeader.includes('webp') ? 'webp' :
        acceptHeader.includes('jpeg') ? 'jpeg' : 'png',
      omitBackground: true  // This ensures transparency is preserved
    };

    const screenshot = await page.screenshot(screenshotOptions);

    // Cleanup
    await page.close();

    // Release the browser back to the pool
    browserPool.releaseBrowser(browser);
    browser = null;

    // Set appropriate content type
    res.setHeader('Content-Type', `image/${screenshotOptions.type}`);
    res.send(screenshot);

  } catch (error) {
    console.error('Error processing request:', error);

    // Handle screenshot timeout specifically
    if (error.message.includes('Page.captureScreenshot timed out')) {
      console.log('Screenshot timeout detected, killing browser');
      await browserPool.killBrowser(browser);
      browser = null;
      return res.status(500).json({
        error: 'Screenshot timeout',
        details: 'The browser took too long to capture the screenshot. This might be due to a complex SVG or system resource constraints.'
      });
    }

    if (browser) {
      browserPool.releaseBrowser(browser);
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    // Clean up temporary file in all cases
    if (tempHtmlPath) {
      try {
        await fs.unlink(tempHtmlPath);
      } catch (error) {
        console.error('Error cleaning up temporary file:', error);
      }
    }
  }
});

const server = app.listen(SERVER_PORT, SERVER_HOST, () => {
  console.log(`Server running on ${SERVER_HOST}:${SERVER_PORT}`);
  console.log(`Browser pool size: ${MAX_CONCURRENCY}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await browserPool.shutdown();
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
}); 