import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { marked } from 'marked';

const viewport = {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  isMobile: false,
  isLandscape: true,
  hasTouch: false,
};

export async function generatePdfFromMarkdown(markdownContent: string): Promise<Buffer> {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    const htmlContent = await marked.parse(markdownContent);

    const fullHtml = `<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: 'Helvetica', sans-serif; font-size: 12px; line-height: 1.6; padding: 40px; max-width: 800px; margin: auto; }
      h1, h2, h3 { font-family: 'Helvetica Neue', sans-serif; border-bottom: 1px solid #eee; padding-bottom: 5px; }
      pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
      p, li { text-align: justify; }
    </style>
  </head>
  <body>${htmlContent}</body>
</html>`;

    const isLocal = !process.env.LAMBDA_TASK_ROOT;
    const headlessMode = isLocal ? false : 'shell'; // 'shell' is the recommended headless type for Chromium builds [web:34][web:7]

    const args = isLocal
      ? puppeteer.defaultArgs()
      : puppeteer.defaultArgs({ args: chromium.args, headless: headlessMode });

    browser = await puppeteer.launch({
      args,
      executablePath: isLocal
        ? await chromium.executablePath() // or a local Chrome path if preferred
        : await chromium.executablePath(),
      headless: headlessMode,
      defaultViewport: viewport,
      acceptInsecureCerts: true, // renamed from ignoreHTTPSErrors in Puppeteer v23+ [web:21]
    });

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
    });
    return Buffer.from(pdfUint8Array);
  } finally {
    if (browser) await browser.close();
  }
}
