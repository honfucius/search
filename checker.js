// checker.js
const CONFIG = {
  minLen: 1,
  maxLen: 3, 
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
  console.log(`🚀 啟動 GitHub Actions 檢查器...\n長度: ${CONFIG.minLen}-${CONFIG.maxLen}\n`);
  
  const nameGen = generateNames(CONFIG.chars, CONFIG.minLen, CONFIG.maxLen);
  let activeWorkers = 0, doneCount = 0;

  return new Promise((resolve) => {
    const next = async () => {
      const { value: name, done } = nameGen.next();
      if (done) {
        if (activeWorkers === 0) resolve();
        return;
      }
      activeWorkers++;
      
      try {
        const exists = await checkName(name);
        doneCount++;
        
        // 簡化進度輸出，每 500 個印一次，避免雲端 Log 爆炸
        if (doneCount % 500 === 0) {
          console.log(`⏱️ 目前已檢查: ${doneCount} 個...`);
        }

        if (exists) {
          console.log(`✅ [發現] https://${name}.netlify.app/`);
        }
      } finally {
        activeWorkers--;
        next();
      }
    };

    for (let i = 0; i < CONFIG.concurrency; i++) next();
  });
}

startChecker().then(() => console.log('\n🎉 檢查完畢！'));
