// Покадровый рендер 3D-ролика в MP4:  node render.js [fps] [timeline.json] [out.mp4] [язык ru|uz]
// Сам поднимает локальный http-сервер (ES-модули three.js не грузятся с file://).
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
(async () => {
  const fps = +(process.argv[2] || 30);
  const tl = process.argv[3] ? JSON.parse(fs.readFileSync(path.join(__dirname, process.argv[3]))) : null;
  const out = path.join(__dirname, process.argv[4] || 'video_silent.mp4');
  const warp = T => { if (!tl) return T; const r = tl.real, a = tl.anim;
    for (let k = 0; k < r.length - 1; k++) if (T <= r[k + 1]) return a[k] + (a[k + 1] - a[k]) * (T - r[k]) / (r[k + 1] - r[k]);
    return a[a.length - 1]; };
  const port = 8800 + Math.floor(Math.random() * 100);
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: __dirname, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://127.0.0.1:${port}/index.html?lang=${process.argv[5] || 'ru'}`);
  await p.waitForFunction(() => window.ready, null, { timeout: 120000 });
  const dur = tl ? tl.duration : await p.evaluate(() => window.DURATION);
  const n = Math.round(dur * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => render(t), warp(i / fps));
    const buf = await p.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`кадр ${i}/${n}, ${((Date.now() - t0) / 1000).toFixed(0)} с`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await b.close(); srv.kill();
  console.log('готово:', out);
})();
