// Рендер ролика движком v2 в несколько потоков: node render.js <style> <spp> <workers> [from_s] [to_s] [шаг кадров: 2 — «на двойках»] [язык ru|uz]
// Кадры — frames/00001.jpg … (кадр n ↔ t = (n−1)/30). Уже снятые кадры пропускаются: рендер можно продолжать.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const [style = 'toon', spp = '4', workers = '2', from = '0', to, step = '1', lang = 'ru'] = process.argv.slice(2);
const SUF = lang === 'ru' ? '' : '_' + lang;
const EP = process.env.EP || 'mm';                 // сцена: mm — «5 мифов», em — «Матку — удалять?»
const FPS = 30, dir = path.join(__dirname, 'frames' + (EP === 'mm' ? '' : '_' + EP) + SUF);
fs.mkdirSync(dir, { recursive: true });
const cues = JSON.parse(fs.readFileSync(path.join(__dirname, `three/v2/${EP}/cues${SUF}.json`)));
const n0 = Math.round(+from * FPS), n1 = Math.ceil((to ? +to : cues.end) * FPS);
const todo = [];
for (let n = n0; n < n1; n++) {
  if (n % +step) continue; const f = path.join(dir, String(n + 1).padStart(5, '0') + '.jpg'); if (!fs.existsSync(f)) todo.push([n, f]); }
console.log(`кадров к съёмке: ${todo.length}`);
(async () => {
  const port = 8600 + Math.floor(Math.random() * 300);
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, 'three'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  const W = +workers, t0 = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: W }, async (_, w) => {
    const jobs = todo.filter((_, i) => i % W === w);
    if (!jobs.length) return;
    const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--force-color-profile=srgb'] });
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto(`http://127.0.0.1:${port}/v2/${EP}/page.html?style=${style}&spp=${spp}&lang=${lang}`);
    await p.waitForFunction(() => window.scene3d && window.scene3d.ready, null, { timeout: 300000 });
    for (const [n, f] of jobs) {
      await p.evaluate(t => window.scene3d.render(t), n / FPS);
      fs.writeFileSync(f + '.tmp', await p.screenshot({ type: 'jpeg', quality: 94 }));
      fs.renameSync(f + '.tmp', f);
      if (++done % 60 === 0) { const el = (Date.now() - t0) / 1000; console.log(`${done}/${todo.length}  ${el.toFixed(0)} с, ~${(el / done * (todo.length - done) / 60).toFixed(0)} мин осталось`); }
    }
    await b.close();
  }));
  srv.kill();
  console.log(`готово за ${((Date.now() - t0) / 60000).toFixed(1)} мин`);
})();
