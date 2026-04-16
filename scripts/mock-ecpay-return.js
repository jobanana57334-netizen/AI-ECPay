require('dotenv').config();
const http = require('http');
const querystring = require('querystring');
const path = require('path');
const Database = require('better-sqlite3');

const orderNumber = process.argv[2];
const portArg = process.argv[3];
const host = process.env.HOST || 'localhost';
const port = portArg || process.env.PORT || '3001';

if (!orderNumber) {
  console.error('用法: node scripts/mock-ecpay-return.js <ORDER_NO> [PORT]');
  console.error('例如: node scripts/mock-ecpay-return.js ORD-20260416-0A999 3001');
  process.exit(1);
}

const db = new Database(path.join(__dirname, '..', 'database.sqlite'), { readonly: true });
const sanitizedOrderNo = orderNumber.replace(/[^0-9A-Za-z]/g, '');
const order = db.prepare(
  "SELECT * FROM orders WHERE REPLACE(order_no, '-', '') = ? OR order_no = ?"
).get(sanitizedOrderNo, orderNumber);

if (!order) {
  console.error('找不到訂單：', orderNumber);
  process.exit(1);
}

const MerchantID = process.env.ECPAY_MERCHANT_ID;
const HashKey = process.env.ECPAY_HASH_KEY;
const HashIV = process.env.ECPAY_HASH_IV;

if (!MerchantID || !HashKey || !HashIV) {
  console.error('請先設定 ECPAY_MERCHANT_ID、ECPAY_HASH_KEY、ECPAY_HASH_IV');
  process.exit(1);
}

function ecpayUrlEncode(value) {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .toLowerCase();
}

function calculateCheckMacValue(params, hashKey, hashIV) {
  const sortedKeys = Object.keys(params).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const raw = [`HashKey=${hashKey}`]
    .concat(sortedKeys.map(key => `${key}=${params[key]}`))
    .concat(`HashIV=${hashIV}`)
    .join('&');

  return require('crypto')
    .createHash('sha256')
    .update(ecpayUrlEncode(raw), 'utf8')
    .digest('hex')
    .toUpperCase();
}

const payload = {
  MerchantID,
  MerchantTradeNo: sanitizedOrderNo,
  StoreID: '',
  RtnCode: 1,
  RtnMsg: '交易成功',
  TradeNo: `Mock${Date.now()}`,
  TradeAmt: order.total_amount,
  PaymentDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
  PaymentType: 'Credit_CreditCard',
  PaymentTypeChargeFee: 0,
  TradeDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
  CarrierType: '',
  CarrierNum: '',
  Donation: 0,
  CheckMacValue: ''
};

const signPayload = { ...payload };
delete signPayload.CheckMacValue;
payload.CheckMacValue = calculateCheckMacValue(signPayload, HashKey, HashIV);
const postData = querystring.stringify(payload);

const options = {
  hostname: host,
  port,
  path: '/api/orders/ecpay-return',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log(`模擬綠界通知：http://${host}:${port}${options.path}`);

const req = http.request(options, (res) => {
  let body = '';
  res.setEncoding('utf8');
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('狀態碼:', res.statusCode);
    console.log('回應內容:', body);
    if (res.statusCode === 200) {
      console.log('模擬綠界回傳已成功送出。');
    }
  });
});

req.on('error', (err) => {
  console.error('連線失敗：', err.message);
});

req.write(postData);
req.end();
