# TESTING

## 測試原則
- 以 `npm test` 執行整體測試；開發時優先先寫能自動重現的單元/整合測試。
- 測試內容應覆蓋 API 路由、授權 middleware、資料庫狀態變更與金流回傳流程。
- 測試檔案放在 `tests/`，命名應清楚對應到功能，如 `orders.test.js`、`auth.test.js`。
- 測試資料與初始化應獨立，避免測試之間互相污染。

## 執行方式
- `npm test`：執行所有 Vitest 測試。
- 若只要開發單一測試檔，可使用 `npx vitest run tests/<file>.test.js`。

## 常用依賴
- `vitest`：測試執行器與斷言。
- `supertest`：HTTP API 整合測試。

## 測試範例
範例測試檔案應包含：
1. 測試目標描述。
2. 測試前準備（如註冊使用者、取得 token）。
3. 呼叫 API。
4. 檢查回應結構與資料庫狀態。

```js
const request = require('supertest');
const app = require('../app');

it('should cancel pending order and restore stock', async () => {
  const token = await getAdminToken();
  const orderId = 1;

  const res = await request(app)
    .patch(`/api/orders/${orderId}/cancel`)
    .set('Authorization', `Bearer ${token}`)
    .set('x-session-id', 'test-session')
    .send();

  expect(res.status).toBe(200);
  expect(res.body.data.order.status).toBe('cancelled');
});
```

## 常見測試重點
- API 狀態驗證：`200`, `400`, `401`, `403`。
- 角色與權限：前端傳入的 `x-session-id`、JWT token、路由保護。
- 金流回傳：Webhook `POST /api/orders/ecpay-return` 必須驗證 `CheckMacValue`。
- 取消訂單：只允許 `pending` 狀態，並回補 `products.stock`。

## 測試編寫注意
- 若測試需要登入，請用 `tests/setup.js` 中的 helper 取得 token。
- 測試資料建議使用獨立帳號或測試商品，避免影響開發資料。
- 當新增 API 或 middleware，務必新增對應測試檔與行為驗證。
- 若遇到資料依賴，請補上前置建立步驟，而非直接使用固定資料。

## 測試失敗時
- 先檢查 API 回傳內容與預期是否一致。
- 確認是否因資料庫狀態不同導致測試前提失效。
- 若是 ECPay 相關測試，確認 `BASE_URL`、`ECPAY_HASH_KEY`、`ECPAY_HASH_IV` 之模擬參數是否正確。
