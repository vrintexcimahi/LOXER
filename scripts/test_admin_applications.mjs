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
  const testProfileDir = path.join(os.tmpdir(), 'chrome_test_profile_apps');
  const chrome = spawn(chromePath, [
    '--headless',
    '--disable-gpu',
    '--remote-debugging-port=9224',
    `--user-data-dir=${testProfileDir}`,
    '--no-sandbox',
    '--window-size=1440,1100',
  ]);

  // Wait up to 15s for Chrome CDP port to become responsive
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9224/json/version');
      if (res.ok) {
        ready = true;
        console.log('Chrome CDP ready on port 9224!');
        break;
      }
    } catch (e) {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!ready) {
    throw new Error('Chrome CDP failed to start on port 9224 after 15s');
  }

  try {
    async function capturePage(url, outPath) {
      console.log('Navigating to:', url);
      const newTabRes = await fetch(`http://127.0.0.1:9224/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
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

      console.log('Waiting 5s for data to fetch and render...');
      await new Promise((r) => setTimeout(r, 5000));

      const screenshotRes = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(outPath, Buffer.from(screenshotRes.data, 'base64'));
      console.log('Saved screenshot to:', outPath);

      ws.close();
      await fetch(`http://127.0.0.1:9224/json/close/${tabInfo.id}`).catch(() => {});
    }

    // 1. Data Pelamar Kerja
    await capturePage('http://127.0.0.1:3035/admin/applications?sim_role=admin', path.join(os.tmpdir(), 'admin_app_pelamar.png'));

    // 2. Katalog Iklan Loker
    await capturePage('http://127.0.0.1:3035/admin/applications?sim_role=admin&view=iklan', path.join(os.tmpdir(), 'admin_app_iklan.png'));

    // 3. Smart Add Iklan [Gemini 3.8]
    await capturePage('http://127.0.0.1:3035/admin/applications?sim_role=admin&view=smart-add', path.join(os.tmpdir(), 'admin_app_smart_add.png'));

    console.log('All 3 screenshots captured successfully!');
  } finally {
    try {
      chrome.kill('SIGKILL');
    } catch {
      try { chrome.kill(); } catch {}
    }
  }
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
