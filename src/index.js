require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const {Builder, By, Key, until} = require('selenium-webdriver');

const delay = require('delay');
const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
// load environment variables
const {
  PORT: port,
  SHEET_NUMBER: sheetNumber
} = process.env;

// create app for koa
const app = new Koa();

const cors = require('@koa/cors');
app.use(cors());
app.use(bodyParser());

// listen
app.listen(port, async () => {
  console.log(`Crawler is listening to port 8080`);
});

// Automation tool would go through all the sellers of all 3pages
let VisitPages = 3;

let pricesArray = [];
let conditionsArray = [];
let deliveriesArray = [];
let sellersArray = [];
let asinsArray = [];
let inventoryArray = [];
let limitInventoryArray = [];
let markSellerName = ' ';
let driver = new Builder().forBrowser('chrome').build();
const creds = require('../client_secret.json');
(async function example() {
  await readSpreadsheet();
  await writeSpreadsheet();
})();
async function getValueAmazon(i, asin) {
  console.log('page number: ' + i);
  await driver.get(`https://www.amazon.com/gp/offer-listing/${asin}/ref=olp_page_1?ie=UTF8&f_all=true&f_new=true&&startIndex=${10 * i}`);
  let firstSeller = await driver.findElement(By.css('.a-column.a-span2.olpSellerColumn '));
  if (await firstSeller.getText() === markSellerName) {
    return;
  } else {
    markSellerName = await firstSeller.getText();
    console.log('firstSeller', markSellerName);
    console.log('markSellerName', await firstSeller.getText());
  }
  let prices = await driver.findElements(By.css('span.a-size-large.a-color-price '));
  prices.map(await function (el) {
    el.getText().then(function(txt) {
      asinsArray.push(asin);
      pricesArray.push(txt);
      console.log('price : ' + txt);
    });
  });
  let conditions = await driver.findElements(By.css('.a-size-medium.olpCondition '));
  conditions.map(function (el) {
    el.getText().then(function(txt) {
      conditionsArray.push(txt);
      console.log('condition : ' + txt);
    });
  });
  let deliveries = await driver.findElements(By.css('.a-column.a-span3.olpDeliveryColumn '));
  deliveries.map(function (el) {
    el.getText().then(function(txt) {
      deliveriesArray.push(txt);
      console.log('Delivery : ' + txt);
    });
  });
  let sellers = await driver.findElements(By.css('.a-column.a-span2.olpSellerColumn '));
  sellers.map(function (el) {
    el.getText().then(function(txt) {
      sellersArray.push(txt);
      console.log('Seller : ' + txt); 
    });
  });
  console.log('inventories');
  let inventories = await driver.findElements(By.css('.a-button-input'));
  // inventories.map(await async function (el) {
  for (let j = 0; j < inventories.length; j++) {
    await getInventoryAmazon(j, asin, i);
  }
  // });
}
async function getInventoryAmazon(iventoryNumber, asin, i) {
  await driver.get(`https://www.amazon.com/gp/offer-listing/${asin}/ref=olp_page_1?ie=UTF8&f_all=true&f_new=true&&startIndex=${10 * i}`);
  let inventories = await driver.findElements(await By.css('.a-button-input'));
  let el = inventories[iventoryNumber];
  await el.click().then(function() {});

  await driver.findElement(await By.id('hlb-view-cart-announce')).click();
  await driver.findElement(await By.css('.a-button.a-button-dropdown.a-button-small.a-button-span8.quantity')).click();
  driver.wait(until.elementLocated(By.linkText('10+')), 30000)
    .then(function() {
      // driver.navigate().back();
      driver.findElement(By.linkText('10+')).click();
    }, function (error) {
      console.log('Error happened!');
      console.log(error);
    });
  // await driver.findElement(await By.linkText('10+')).click();
  driver.wait(until.elementLocated(By.css('.a-input-text.a-span8.sc-quantity-textfield.sc-hidden')), 30000)
    .then(function() {
      // driver.navigate().back();
      driver.findElement(By.css('.a-input-text.a-span8.sc-quantity-textfield.sc-hidden')).sendKeys('999', Key.RETURN);
    }, function (error) {
      console.log('Error happened!');
      console.log(error);
    });
  // await driver.findElement(await By.css('.a-input-text.a-span8.sc-quantity-textfield.sc-hidden')).sendKeys('999', Key.RETURN);
  driver.wait(until.elementLocated(By.css('.a-row.a-spacing-base.sc-action-quantity.sc-action-quantity-right')), 30000)
    .then(function() {
      // driver.navigate().back();
    }, function (error) {
      console.log('Error happened!');
      console.log(error);
    });
  let inventory = await driver.findElement(await By.css('.a-row.a-spacing-base.sc-action-quantity.sc-action-quantity-right')).getAttribute('data-old-value');
  inventoryArray.push(inventory);
  limitInventoryArray.push(0);
  console.log('inventory', inventory);
  driver.wait(until.elementLocated(By.css('.sc-quantity-update-message.a-spacing-top-mini')), 30000)
    .then(function() {
      // driver.navigate().back();
      let alert = driver.findElement(By.css('.sc-quantity-update-message.a-spacing-top-mini'));
      let alertStr = alert.getText();
      console.log('alert', alertStr);
      if (alertStr.includes('limit')) {
        limitInventoryArray[limitInventoryArray.length - 1] = inventory;
        inventoryArray[inventoryArray.length - 1] = 0;
        console.log('inventory', inventoryArray[inventoryArray.length - 1]);
        console.log('limitinventory', inventory);
      } 
    }, function (error) {
      console.log('Error happened!');
      console.log(error);
    });
}

async function readSpreadsheet() {
  const doc = new GoogleSpreadsheet(sheetNumber);
  await promisify(doc.useServiceAccountAuth)(creds);
  const info = await promisify(doc.getInfo)();
  const sheet = info.worksheets[0];
  const rows = await promisify(sheet.getRows)({
    offset: 1
  });
  for (let i = 0; i < rows.length; i++) {
    console.log('Asin number: ' + i);
    console.log('Asin code: ' + rows[i].asin);
    for (let index = 0; index < VisitPages; index++) {
      await getValueAmazon(index, rows[i].asin);
      await delay(5000);
    }
  }
}
async function writeSpreadsheet() {
  const doc = new GoogleSpreadsheet(sheetNumber);
  await promisify(doc.useServiceAccountAuth)(creds);
  const info = await promisify(doc.getInfo)();
  const sheet1 = info.worksheets[1];
  const cells = await promisify(sheet1.getCells)({
    'min-row': 1,
    'max-row': 500,
    'min-col': 1,
    'max-col': 8,
    'return-empty': true
  });
  for (let i = 0; i < pricesArray.length; i++) {
    console.log(asinsArray[i] + ':i:' + i);
    cells[8 + 0 + i * 8].value = asinsArray[i];
    cells[8 + 0 + i * 8].save();
    console.log(asinsArray[i]);
    cells[8 + 1 + i * 8].value = pricesArray[i];
    cells[8 + 1 + i * 8].save();
    console.log(pricesArray[i]);
    cells[8 + 2 + i * 8].value = conditionsArray[i];
    cells[8 + 2 + i * 8].save();
    console.log(conditionsArray[i]);
    cells[8 + 3 + i * 8].value = deliveriesArray[i];  
    cells[8 + 3 + i * 8].save();
    console.log(deliveriesArray[i]);
    cells[8 + 4 + i * 8].value = sellersArray[i];
    cells[8 + 4 + i * 8].save();
    console.log(sellersArray[i]);
    // if(inventoryArray[i] != 0){
    cells[8 + 5 + i * 8].value = inventoryArray[i];
    cells[8 + 5 + i * 8].save();
    console.log('inventory', inventoryArray[i]);
    // } else {
    cells[8 + 6 + i * 8].value = limitInventoryArray[i];
    cells[8 + 6 + i * 8].save();
    console.log('limitInventory', limitInventoryArray[i]);
    // }

    let today = new Date();
    let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    let time = today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();
    let dateTime = date + ' ' + time;

    cells[8 + 7 + i * 8].value = dateTime;
    cells[8 + 7 + i * 8].save();
    console.log(dateTime);
      
    await delay(500);
  }
}