const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    console.error('正在打开 v2too 网页...');
    // 页面结构简单，使用 load 即可
    await page.goto('https://ip.v2too.top/', { waitUntil: 'load', timeout: 60000 });
    
    console.error('正在等待数据渲染 (10秒)...');
    // 给页面一点时间完成内部加载
    await page.waitForTimeout(10000);

    const finalIps = await page.evaluate(() => {
      // 获取所有的行（无论它是 tr 还是 div 构成的行）
      const rows = Array.from(document.querySelectorAll('tr, .list-item, .card, div[style*="flex"]'));
      
      let tokyoResult = null;
      let singaporeResult = null;

      // 正则规则
      const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/;
      const speedRegex = /[\d\.]+\s*(?:MB\/s|Mb\/s|mb\/s)/i;

      for (const row of rows) {
        const text = row.innerText;

        // 1. 寻找“东京”的第一行
        if (!tokyoResult && text.includes('东京')) {
          const ipMatch = text.match(ipRegex);
          const speedMatch = text.match(speedRegex);
          if (ipMatch && speedMatch) {
            // 去除速度中的空格并标准化为 MB/s
            const speed = speedMatch[0].toUpperCase().replace(/\s/g, '');
            tokyoResult = `${ipMatch[0]}#v2too-东京-${speed}`;
          }
        }

        // 2. 寻找“新加坡”的第一行
        if (!singaporeResult && text.includes('新加坡')) {
          const ipMatch = text.match(ipRegex);
          const speedMatch = text.match(speedRegex);
          if (ipMatch && speedMatch) {
            const speed = speedMatch[0].toUpperCase().replace(/\s/g, '');
            singaporeResult = `${ipMatch[0]}#v2too-新加坡-${speed}`;
          }
        }

        // 两个都找到了就提前结束
        if (tokyoResult && singaporeResult) break;
      }

      return [tokyoResult, singaporeResult].filter(Boolean);
    });

    if (finalIps.length > 0) {
      // 成功结果输出到标准输出，供 workflow 合并
      console.log(finalIps.join('\n'));
    } else {
      console.error('❌ v2too 抓取失败：未在页面中识别到东京或新加坡的数据行');
    }

  } catch (error) {
    console.error('v2too 运行出错:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
