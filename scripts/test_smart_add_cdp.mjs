import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function findChromeExecutable() {
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return 'chrome';
  }
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'chromium-browser';
}

async function main() {
  const chromePath = findChromeExecutable();
  const testProfileDir = path.join(os.tmpdir(), 'chrome_test_profile');
  const chrome = spawn(chromePath, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9223',
    `--user-data-dir=${testProfileDir}`,
    '--no-sandbox',
    '--window-size=1440,1200',
  ]);

  await new Promise((r) => setTimeout(r, 3500));

  try {
    const targetUrl = 'http://127.0.0.1:3035/admin/companies?sim_role=admin&view=smart-add';
    const newTabRes = await fetch(`http://127.0.0.1:9223/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' });
    const tabInfo = await newTabRes.json();
    console.log('Opened tab:', tabInfo.id);

    const ws = new WebSocket(tabInfo.webSocketDebuggerUrl);
    await new Promise((res) => { ws.onopen = res; });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('Waiting 5s for page to fully load...');
    await new Promise((r) => setTimeout(r, 5000));

    // Click "Muat Contoh Poster Staffinc"
    console.log('Clicking sample button...');
    const sampleClickRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const sampleBtn = btns.find(b => b.textContent && b.textContent.includes('Muat Contoh Poster'));
        if (sampleBtn) { sampleBtn.click(); return 'Sample clicked'; }
        return 'Sample button not found';
      })()`,
    });
    console.log('Sample click result:', sampleClickRes?.result?.value);

    await new Promise((r) => setTimeout(r, 2500));

    // Click "Mulai Ekstraksi AI dengan Gemini 3.8"
    console.log('Clicking extract button...');
    const extractRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const extractBtn = btns.find(b => b.textContent && b.textContent.includes('Mulai Ekstraksi AI'));
        if (extractBtn) { extractBtn.click(); return 'Extract clicked'; }
        return 'Extract button not found';
      })()`,
    });
    console.log('Extract action:', extractRes?.result?.value);

    // Wait for AI extraction to complete
    console.log('Waiting for AI Gemini 3.8 response...');
    let foundReview = false;
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const check = await send('Runtime.evaluate', {
        expression: `Boolean(document.getElementById('smart-job-review-section'))`,
      });
      if (check?.result?.value) {
        console.log(`Review section appeared at ${i + 1}s!`);
        foundReview = true;
        break;
      }
    }

    if (!foundReview) {
      console.log('Review section not detected in time, checking page status...');
    }

    // Scroll to review section
    await send('Runtime.evaluate', {
      expression: `window.scrollTo(0, 360);`,
    });
    await new Promise((r) => setTimeout(r, 1500));

    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    if (shot?.data) {
      const outImg = path.join(os.tmpdir(), 'smart_add_extracted.png');
      fs.writeFileSync(outImg, Buffer.from(shot.data, 'base64'));
      console.log('Screenshot saved to', outImg);
    }

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(console.error);
