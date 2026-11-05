// Покадровый рендер anim.html в MP4: node render.js [fps] [timeline.json] [out.mp4]
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const path=require('path');
(async()=>{
  const fps=+(process.argv[2]||30);
  const out=path.join(__dirname,process.argv[4]||'video_silent.mp4');
  const tl=process.argv[3]?JSON.parse(require('fs').readFileSync(path.join(__dirname,process.argv[3]))):null;
  // реальное время ролика → время анимации (кусочно-линейно)
  const warp=T=>{if(!tl)return T;const r=tl.real,a=tl.anim;for(let k=0;k<r.length-1;k++)if(T<=r[k+1])return a[k]+(a[k+1]-a[k])*(T-r[k])/(r[k+1]-r[k]);return a[a.length-1];};
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:1080,height:1920}});
  await p.goto('file://'+path.join(__dirname,'anim.html'));
  await p.evaluate(()=>document.fonts.ready);
  const dur=tl?tl.duration:await p.evaluate(()=>window.DURATION);
  const n=Math.round(dur*fps);
  const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-c:v','png','-i','-',
    '-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
  for(let i=0;i<n;i++){
    await p.evaluate(t=>render(t),warp(i/fps));
    const buf=await p.screenshot({type:'png'});
    if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));
    if(i%150===0) console.log(`кадр ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r=>ff.on('close',r));
  await b.close();
  console.log('готово:',out);
})();
