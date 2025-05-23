const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async function handler(req, res) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Replace with your URL or dynamic param
    const url = req.query.url || 'https://calendly.com';

    await page.goto(url, { waitUntil: 'networkidle2' });

    // Example: get page title
    const title = await page.title();

    res.status(200).json({ title });
  } catch (error) {
    console.error('Error launching Puppeteer:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
};
