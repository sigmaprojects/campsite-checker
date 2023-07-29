require('dotenv').config();
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');

const email_user = process.env.ZOHO_EMAIL_USER;
const email_password = process.env.ZOHO_EMAIL_PASS;

const mailTransporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    secure: true,
    port: 465,
    auth: {
        user: email_user,
        pass: email_password,
    },
});
 
const siteIds = {
    '1819': '53',
    '1820': '54',
    '1821': '55',
    '1822': '56',
    '1823': '57',
    '1824': '58',
    '1825': '59',
    '1826': '60',
    '1827': '61',
    '1828': '62',
    '1829': '63',
    '1830': '64'
};

let campsites = {};

const daysToCheckInTheFuture = 183;

function getDateAsString(date) {
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
}

async function main() {
    const browser = await puppeteer.launch({
        headless: 'new'
    });
    
    const page = await browser.newPage();

    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4182.0 Safari/537.36");
    await page.goto('https://reservations.sbparks.org/reservation/camping/index.asp',{waitUntil: 'networkidle0'});

    await page.click('button.ui-dialog-titlebar-close'); // close popup

    await page.select('#parent_idno', '2'); // change the select to Jalama Beach
    await page.waitForNavigation(); // wait here because changing the select navigates to a new page

    await page.click('button[type="submit"].BigBtn'); // search
    await page.waitForNavigation();


    //console.log('siteIds.length',siteIds.length);

    for (const [idNo, siteName] of Object.entries(siteIds)) {

        //console.log('attempting siteId: ', idNo);

        await page.$eval(
            'button[type=submit][name=item_idno]',
            (e, no) => e.setAttribute("value", no),
            idNo
        );
        await page.$eval(
            'button[type=submit][name=item_idno]',
            (e, no) => e.setAttribute("data-siteidno", no),
            idNo
        );
        var button = await page.$('button[type=submit][name=item_idno]');
        await button.click();
        await page.waitForNavigation({waitUntil: 'networkidle0'});

        let dates = await page.evaluate('booked_array');

        let availableDates = [];
        //let loopDay = todayDate;
        let loopDay = new Date();
        //loopDay.setHours(0,0,0,0); // the dates in the booked_dates array are all at midnight, so we need to set the time to midnight for the comparison to work
        for (let y = 0; y <= daysToCheckInTheFuture; y++) {
            loopDay.setDate(loopDay.getDate() + 1);
            let checkDateString = loopDay.getFullYear() + '-' + (loopDay.getMonth() + 1) + '-' + loopDay.getDate();
            if( !dates.includes(checkDateString) && !availableDates.includes(checkDateString) ) {
                availableDates.push(checkDateString);
                console.log("Campsite: " + idNo + " Available Day: " + checkDateString);
            }
        }

        let multiDaySpans = [];
        for (let z = 0; z < availableDates.length; z++) {
            let firstDateString = getDateAsString( new Date(availableDates[z]) );
            let nextDate = new Date(availableDates[z]);
            nextDate.setDate(nextDate.getDate() + 1);
            let nextDateString = getDateAsString( nextDate );

            if( availableDates.includes(firstDateString) && availableDates.includes(nextDateString) ) {
                // we have a multi-day span
                if( !multiDaySpans.includes(firstDateString) ) {
                    multiDaySpans.push(firstDateString);
                }
                
                if( !multiDaySpans.includes(nextDateString) ) {
                    multiDaySpans.push(nextDateString);
                }
            }
        }

        campsites[idNo] = {
            'idno': idNo,
            'site_name': siteName,
            //'booked_dates': dates,
            'available_dates': availableDates,
            'multi_day_spans': multiDaySpans
        };
        
        //console.log('dates',dates);

        await page.goBack({waitUntil: 'networkidle0'});
        await page.waitForSelector('button[type=submit][name=item_idno]');
    }
    //console.log('what');
    console.log(campsites);

    const mailDetails = {
        from: email_user,
        to: 'don@sigmaprojects.org',
        subject: 'Jalama Campsite Availability',
        text: JSON.stringify(campsites, null, 4)
    };

    mailTransporter.sendMail(mailDetails, function(err, data) {
        if(err) {
            console.log('Mail Error');
            console.log(err);
        } else {
            console.log('Email sent successfully');
        }
    });
 
    await browser.close();
}
main();