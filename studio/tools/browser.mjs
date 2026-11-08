// The one place that starts a browser for the Studio's tests and tools.
// Copied from .\film\tools\render.mjs (read only, line 47).
// The one change: a missing Chrome throws an error, where render.mjs exits the process.
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const chromePath = () => {
  const c = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  const p = c.find((x) => x && fs.existsSync(x));
  if (!p) throw new Error('Chrome not found. Set CHROME_PATH to the Chrome or Chromium executable.');
  return p;
};

/** Starts headless Chrome with software WebGL 2. */
export const launch = () => chromium.launch({ executablePath: chromePath(), headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files'] });
