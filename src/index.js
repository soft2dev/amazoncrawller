require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const Router = require('koa-router');
const sleep = require('await-sleep');
const {Builder, By, Key, until} = require('selenium-webdriver');
const axios = require('axios');
const delay = require('delay');
const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
// load environment variables
const {
  PORT: port,
  SHEET_NUMBER:sheet_number
} = process.env;

// create app for koa
const app = new Koa();
const router = new Router();
const cors = require('@koa/cors');
app.use(cors());
app.use(bodyParser());

// listen
app.listen(port, async () => {
  console.log(`Crawler is listening to port 8080`);
});

let pricesArray  = [];
let conditionsArray  = [];
let deliveriesArray  = [];
let sellersArray  = [];
let asinsArray  = [];
let driver = new Builder().forBrowser('chrome').build();
const creds = require('../client_secret.json');
(async function example() {
    await readSpreadsheet();
    console.log("Products :" + pricesArray.length);
    await writeSpreadsheet();
})();

async function getValueAmazon(i,asin){
    console.log("page number: "+i);
    await driver.get(`https://www.amazon.com/gp/offer-listing/${asin}/ref=olp_page_1?ie=UTF8&f_all=true&f_new=true&&startIndex=${10*i}`);
   let prices = await driver.findElements(By.css('span.a-size-large.a-color-price '));
   prices.map(await function (el) {
        el.getText().then(function(txt){
          asinsArray.push(asin);
          pricesArray.push(txt);
            console.log('price : '+txt);
        });
    });
    let conditions = await driver.findElements(By.css('.a-size-medium.olpCondition '));
    conditions.map(function (el) {
        el.getText().then(function(txt){
          conditionsArray.push(txt);
          console.log('condition : '+txt);
        });
    });
    let deliveries = await driver.findElements(By.css('.a-column.a-span3.olpDeliveryColumn '));
    deliveries.map(function (el) {
        el.getText().then(function(txt){
          deliveriesArray.push(txt);
          console.log('Delivery : '+txt);
        });
    });
    let sellers = await driver.findElements(By.css('.a-column.a-span2.olpSellerColumn '));
    sellers.map(function (el) {
        el.getText().then(function(txt){
          sellersArray.push(txt);
          console.log('Seller : '+txt);
        });
    });
}
async function readSpreadsheet(){
    const doc = new GoogleSpreadsheet(sheet_number);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[0];
    const rows = await promisify(sheet.getRows)({
      offset:1
    })
    for(let i =0;i<rows.length;i++){
      console.log("Asin number: " + i);
      console.log("Asin code: " + rows[i].asin);
      await getValueAmazon(0,rows[i].asin)
      await delay(5000);
      await getValueAmazon(1,rows[i].asin)
      await delay(5000);
    }
}
async function writeSpreadsheet(){
  const doc = new GoogleSpreadsheet(sheet_number);
  await promisify(doc.useServiceAccountAuth)(creds);
  const info = await promisify(doc.getInfo)();
  const sheet1 = info.worksheets[1];
  const cells = await promisify(sheet1.getCells)({
    'min-row' :1,
    'max-row' :500,
    'min-col' :1,
    'max-col' :7,
    'return-empty': true
  })
  for(let i=0;i<pricesArray.length;i++){
      console.log(asinsArray[i]+':i:'+i);
      cells[7+0+i*7].value = asinsArray[i];
      cells[7+0+i*7].save();
      console.log(asinsArray[i]);
      cells[7+1+i*7].value = pricesArray[i];
      cells[7+1+i*7].save();
      console.log(pricesArray[i]);
      cells[7+2+i*7].value = conditionsArray[i];
      cells[7+2+i*7].save();
      console.log(conditionsArray[i]);
      cells[7+3+i*7].value = deliveriesArray[i];  
      cells[7+3+i*7].save();
      console.log(deliveriesArray[i]);
      cells[7+4+i*7].value = sellersArray[i];
      cells[7+4+i*7].save();
      console.log(sellersArray[i]);
      let today = new Date();
      let date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
      let time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
      let dateTime = date+' '+time;

      cells[7+6+i*7].value = dateTime;
      cells[7+6+i*7].save();
      console.log(dateTime);
      
      await delay(300);
  }
}