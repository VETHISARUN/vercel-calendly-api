import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const {
    targetMonth,
    targetDay,
    desiredTime,
    fullName,
    email,
    guestEmails = "",
    note = ""
  } = req.body;

  let browser, page;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    page = await browser.newPage();
    await page.goto('https://calendly.com/johngvm20/30min', {
      waitUntil: 'networkidle2'
    });

    try {
      const cookieBtn = await page.waitForSelector('.onetrust-close-btn-handler', { timeout: 5000 });
      await cookieBtn.click();
    } catch {}

    while (true) {
      const currentMonth = await page.$eval('[data-testid="title"]', el => el.textContent.trim());
      if (currentMonth === targetMonth) break;

      const nextBtn = await page.$('button[aria-label="Go to next month"]');
      const isDisabled = await page.evaluate(btn => btn.disabled, nextBtn);
      if (isDisabled) throw new Error('No more months available');
      await nextBtn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    const dayButtons = await page.$$("table[aria-label='Select a Day'] button");
    let dayFound = false;
    for (const btn of dayButtons) {
      const dayText = await page.evaluate(el => el.textContent.trim(), btn);
      if (dayText === targetDay) {
        await btn.click();
        dayFound = true;
        break;
      }
    }
    if (!dayFound) throw new Error(`Day ${targetDay} not available`);

    await page.waitForSelector('[data-component="spotpicker-times-list"]');
    const timeClicked = await (async () => {
      const buttons = await page.$$('button[data-container="time-button"]');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent.trim().toLowerCase(), btn);
        if (text === desiredTime.toLowerCase()) {
          await btn.click();
          return true;
        }
      }
      return false;
    })();
    if (!timeClicked) throw new Error(`Time ${desiredTime} not available`);

    await page.click('button[aria-label^="Next"]');
    await page.waitForSelector('#full_name_input');
    await page.type('#full_name_input', fullName);
    await page.type('#email_input', email);

    if (guestEmails) {
      const guests = guestEmails.split(',');
      const guestBtn = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Add Guests'));
      });
      if (guestBtn && guestBtn.asElement()) {
        await guestBtn.asElement().click();
        const guestInput = await page.waitForSelector('#invitee_guest_input');
        for (const guest of guests) {
          await guestInput.type(guest.trim());
          await page.keyboard.press('Enter');
        }
      }
    }

    if (note) {
      try {
        const noteBox = await page.waitForSelector('textarea[name="question_0"]', { timeout: 3000 });
        await noteBox.type(note);
      } catch {}
    }

    const confirmBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Schedule Event'));
    });
    if (confirmBtn && confirmBtn.asElement()) {
      await confirmBtn.asElement().click();
    } else {
      const fallback = await page.$('button[type="submit"]');
      if (fallback) await fallback.click();
    }

    await new Promise(r => setTimeout(r, 5000));

    res.status(200).json({ message: 'Booking completed successfully!' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}
