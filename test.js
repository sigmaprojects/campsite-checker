const puppeteer = require('puppeteer');
async function main() {

    console.log("main executing...");

    // await pingtest();

    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        headless: 'new',
        dumpio: true,
        args:['--no-sandbox','--disable-dev-shm-usage'],
        timeout: 40000
    });
    browser.on('disconnected', async () => {
        console.log('disconnected!');
        console.log(this);
    });

    const page = await browser.newPage();

    console.log("opening https://github.com");
    await page.goto('https://reservations.sbparks.org/reservation/camping/index.asp', {waitUntil: 'networkidle2',timeout: 80000});
    const data = await page.evaluate(() => document.querySelector('*').outerHTML);

    console.log(data);
    await browser.close();

}
main();