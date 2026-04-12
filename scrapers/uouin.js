const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  try {
    console.log('正在打开网页...');
    await page.goto('https://api.uouin.com/cloudflare.html', { waitUntil: 'networkidle' });
    
    console.log('正在等待数据加载 (20秒)...');
    await page.waitForTimeout(20000); 

    const finalIps = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr'));
      let dxResult = null;
      let ipv6Result = null;

      // 动态获取今年年份，防止明年失效
      const currentYear = new Date().getFullYear().toString();
      
      const ipv4Regex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
      const ipv6Regex = /([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}/;
      // 精准匹配速度，必须包含 mb/s 且忽略大小写
      const speedRegex = /[\d\.]+\s*mb\/s/i;

      for (const row of rows) {
        const rowText = row.innerText;
        
        // 只看包含今年年份的行
        if (!rowText.includes(currentYear)) continue;

        const upperText = rowText.toUpperCase();

        // 1. 抓取电信
        if (!dxResult && upperText.includes('电信')) {
          const ipMatch = rowText.match(ipv4Regex);
          const speedMatch = rowText.match(speedRegex);
          if (ipMatch && speedMatch) {
            dxResult = `${ipMatch[0]}#uin-电信-${speedMatch[0].toLowerCase().replace(/\s/g, '')}`;
          }
        }

        // 2. 抓取 IPV6
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
      //fs.writeFileSync('ips.txt', finalIps.join('\n'));
      //console.log('✅ 抓取成功：\n' + finalIps.join('\n'));
      console.log(finalIps.join('\n')); // 确保这行存在，它负责把结果“吐”给 Workflow
    } else {
      console.log('❌ 未能在数据行中匹配到目标。');
      fs.writeFileSync('ips.txt', '抓取失败');
    }

  } catch (error) {
    console.error('运行出错:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
