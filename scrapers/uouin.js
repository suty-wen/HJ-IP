const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    console.error('正在打开 uouin 网页...');
    // 改为 load，确保基础资源加载完毕
    await page.goto('https://api.uouin.com/cloudflare.html', { 
      waitUntil: 'load', 
      timeout: 60000 
    });
    
    console.error('正在等待数据渲染 (25秒)...');
    await page.waitForTimeout(25000); 

    const finalIps = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr'));
      // 调试信息：看看一共找到了多少行
      console.error('总行数:', rows.length);

      let dxResult = null;
      let ipv6Result = null;
      const currentYear = new Date().getFullYear().toString();
      
      const ipv4Regex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
      const ipv6Regex = /([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}/;
      const speedRegex = /[\d\.]+\s*mb\/s/i;

      for (const row of rows) {
        const rowText = row.innerText;
        // 如果这行包含今年年份，说明是真实数据
        if (rowText.includes(currentYear)) {
          const upperText = rowText.toUpperCase();

          if (!dxResult && upperText.includes('电信')) {
            const ipMatch = rowText.match(ipv4Regex);
            const speedMatch = rowText.match(speedRegex);
            if (ipMatch && speedMatch) {
              dxResult = `${ipMatch[0]}#uouin-电信-${speedMatch[0].toLowerCase().replace(/\s/g, '')}`;
            }
          }

          if (!ipv6Result && upperText.includes('IPV6')) {
            const ipMatch = rowText.match(ipv6Regex);
            const speedMatch = rowText.match(speedRegex);
            if (ipMatch && speedMatch) {
              ipv6Result = `${ipMatch[0]}#uouin-IPV6-${speedMatch[0].toLowerCase().replace(/\s/g, '')}`;
            }
          }
        }
        if (dxResult && ipv6Result) break;
      }
      return [dxResult, ipv6Result].filter(Boolean);
    });

    if (finalIps.length > 0) {
      console.log(finalIps.join('\n')); 
    } else {
      console.error('❌ 未能在数据行中匹配到目标。');
    }

  } catch (error) {
    console.error('运行出错:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
