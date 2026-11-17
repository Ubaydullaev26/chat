// Стоп-кадры движка v2 в headless Chromium (SwiftShader): node snap.js <ep> <style> <t1,t2,...> <out_dir> [доп. параметры адреса]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const [ep, style, ts, out, extra = ''] = process.argv.slice(2);
  const port = 8700 + Math.floor(Math.random() * 200);
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, 'three'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1000));
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-color-profile=srgb'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.text()); });
  const t0 = Date.now();
  const url = ep.endsWith('.html') ? `http://127.0.0.1:${port}/${ep}?style=${style}` : `http://127.0.0.1:${port}/index.html?ep=${ep}&style=${style}`;
  await p.goto(url + (extra ? '&' + extra : ''));
  await p.waitForFunction(() => window.scene3d && window.scene3d.ready, null, { timeout: 300000 });
  console.log('сцена собрана за', ((Date.now() - t0) / 1000).toFixed(1), 'с');
  for (const t of ts.split(',').map(Number)) {
    const a = Date.now();
    await p.evaluate(t => window.scene3d.render(t), t);
    await p.screenshot({ path: path.join(out, `t_${t.toFixed(2)}.png`) });
    console.log(`t=${t}: ${((Date.now() - a) / 1000).toFixed(1)} с`);
  }
  await b.close(); srv.kill();
})();
