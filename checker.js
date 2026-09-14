// checker.js
const fs = require('fs');

const CONFIG = {
  minLen: 1,
  maxLen: 4, 
  chars: 'abcdefghijklmnopqrstuvwxyz0123456789-',
  concurrency: 10,
};

function* generateNames(chars, min, max) {
  const charArray = [...new Set(chars)];
  function* gen(prefix, n) {
    if (n === 0) { yield prefix; return; }
    for (let c of charArray) yield* gen(prefix + c, n - 1);
  }
  for (let n = min; n <= max; n++) yield* gen('', n);
}

async function checkName(name) {
  const url = `https://${name}.netlify.app/`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.status !== 404;
  } catch (error) {
    return false;
  }
}

async function startChecker() {
  console.log(`🚀 啟動檢查器... 長度: ${CONFIG.minLen}-${CONFIG.maxLen}\n`);
  
  const nameGen = generateNames(CONFIG.chars, CONFIG.minLen, CONFIG.maxLen);
  let activeWorkers = 0, doneCount = 0;
  const foundNames = [];

  return new Promise((resolve) => {
    const next = async () => {
      const { value: name, done } = nameGen.next();
      if (done) {
        if (activeWorkers === 0) resolve(foundNames);
        return;
      }
      activeWorkers++;
      
      try {
        const exists = await checkName(name);
        doneCount++;
        
        if (doneCount % 500 === 0) {
          console.log(`⏱️ 目前已檢查: ${doneCount} 個...`);
        }
        if (exists) {
          console.log(`✅ [發現] https://${name}.netlify.app/`);
          foundNames.push(name);
        }
      } finally {
        activeWorkers--;
        next();
      }
    };
    for (let i = 0; i < CONFIG.concurrency; i++) next();
  });
}

function exportHTML(names) {
  const rows = names.map(n => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #28303a">
      <span style="color:#7ee787;word-break:break-all">${n}.netlify.app</span>
      <a href="https://${n}.netlify.app/" target="_blank" rel="noopener" 
         style="background:#252c35;color:#e9eef5;text-decoration:none;padding:6px 14px;border-radius:8px;font-size:14px;font-weight:bold">新分頁</a>
    </div>
  `).join('');

  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Netlify 掃描結果</title>
<style>
body{margin:0;background:#0b0d10;color:#e9eef5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
main{max-width:760px;margin:auto;padding:20px}
.card{background:#14181e;border:1px solid #28303a;border-radius:16px;padding:20px}
</style>
</head>
<body>
<main>
  <h2>Netlify 存在網站清單</h2>
  <div class="card">
    <div style="margin-bottom:12px;color:#8793a2">共找到 <b>${names.length}</b> 個網站</div>
    ${rows || '<div style="color:#8793a2">本次未發現任何網站</div>'}
  </div>
</main>
</body>
</html>`;

  fs.writeFileSync('report.html', html, 'utf-8');
  console.log('📄 已成功建立 report.html');
}

startChecker().then((foundNames) => {
  exportHTML(foundNames);
  console.log('\n🎉 檢查完畢！');
});
