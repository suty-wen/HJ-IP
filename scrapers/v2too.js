const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    console.error('正在打开 v2too 网页...');
    await page.goto('https://ip.v2too.top/', { waitUntil: 'networkidle' });
    
    // 等待核心数据容器加载（根据该站特征，等待 card 元素出现）
    await page.waitForSelector('.region', { timeout: 10000 }).catch(() => console.error('等待超时，尝试继续解析'));

    const finalIps = await page.evaluate(() => {
      // 获取所有的 IP 卡片/行容器
      // 通常这类站点的结构是每一个 IP 都在一个包含 region 和 speed 的 div 块里
      // 我们通过寻找包含 region 类的父级来定位
      const cards = Array.from(document.querySelectorAll('.item, .card, div:has(> .region)'));
      
      let tokyoResult = null;
      let singaporeResult = null;

      // 这里的选择器：寻找所有包含数据的行
      // 如果没有明确的卡片类名，我们直接找所有的 region 元素，然后向上找父级
      const regions = Array.from(document.querySelectorAll('.region'));

      for (const regEl of regions) {
        const regionText = regEl.innerText.trim();
        const parent = regEl.parentElement; // 假设 ip 和 speed 都在同一个父级下
        
        if (!parent) continue;

        // 提取 IP (通常在 class 为 ip 的 div 里，或者直接是文本)
        const ipEl = parent.querySelector('.ip') || parent.querySelector('.address');
        // 提取速度
        const speedEl = parent.querySelector('.speed');

        if (!ipEl || !speedEl) continue;

        const ip = ipEl.innerText.trim();
        // 去除速度中的所有空格
        const speed = speedEl.innerText.trim().replace(/\s/g, '');

        // 1. 匹配东京的第一个
        if (!tokyoResult && regionText.includes('东京')) {
          tokyoResult = `${ip}#v2too-东京-${speed}`;
        }

        // 2. 匹配新加坡的第一个
        if (!singaporeResult && regionText.includes('新加坡')) {
          singaporeResult = `${ip}#v2too-新加坡-${speed}`;
        }

        if (tokyoResult && singaporeResult) break;
      }

      return [tokyoResult, singaporeResult].filter(Boolean);
    });

    if (finalIps.length > 0) {
      // 最终结果输出到 log，用于合并到 temp_ips.txt
      console.log(finalIps.join('\n'));
    } else {
      console.error('❌ v2too 抓取失败：未找到东京或新加坡的 IP 数据');
    }

  } catch (error) {
    console.error('v2too 运行出错:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
