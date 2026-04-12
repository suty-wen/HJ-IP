const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    // 使用 console.error，这样信息会留在日志里，而不会混进结果文件
    console.error('正在打开网页...');
    // 1. 将策略改为 'domcontentloaded' (只要基础结构出来就行，不理会那些慢悠悠的广告脚本)
    // 2. 将超时时间手动延长到 60 秒
    await page.goto('https://api.uouin.com/cloudflare.html', { 
    waitUntil: 'domcontentloaded', 
    timeout: 60000 
    });
    
    console.error('正在等待数据加载 (20秒)...');
    await page.waitForTimeout(20000); 

    const finalIps = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr'));
      let dxResult = null;
      let ipv6Result = null;
      const currentYear = new Date().getFullYear().toString();
      
      const ipv4Regex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
      const ipv6Regex = /([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}/;
      const speedRegex = /[\d\.]+\s*mb\/s/i;

      for (const row of rows) {
        const rowText = row.innerText;
        if (!rowText.includes(currentYear)) continue;
        const upperText = rowText.toUpperCase();

        if (!dxResult && upperText.includes('电信')) {
          const ipMatch = rowText.match(ipv4Regex);
          const speedMatch = rowText.match(speedRegex);
          if (ipMatch && speedMatch) {
            dxResult = `${ipMatch[0]}#uin-电信-${speedMatch[0].toLowerCase().replace(/\s/g, '')}`;
          }
        }

        if (!ipv6Result && upperText.includes('IPV6')) {
          const ipMatch = rowText.match(ipv6Regex);
          const speedMatch = rowText.match(speedRegex);
          if (ipMatch && speedMatch) {
            ipv6Result = `${ipMatch[0]}#uin-IPV6-${speedMatch[0].toLowerCase().replace(/\s/g, '')}`;
          }
        }
        if (dxResult && ipv6Result) break;
      }
      return [dxResult, ipv6Result].filter(Boolean);
    });

    if (finalIps.length > 0) {
      // 只有这里用 console.log，它是真正要存入文件的数据
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
