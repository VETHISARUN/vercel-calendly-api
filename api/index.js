const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

module.exports = async function handler(req, res) {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath || '/usr/bin/chromium-browser',
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Example URL — replace with your Calendly URL or dynamic query param
    const url = req.query.url || 'https://calendly.com';

    await page.goto(url, { waitUntil: 'networkidle2' });

    // Example: extract page title
    const title = await page.title();

    res.status(200).json({ title });
  } catch (error) {
    console.error('Error in Puppeteer:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
};
