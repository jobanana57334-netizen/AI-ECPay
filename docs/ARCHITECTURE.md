# ARCHITECTURE

## 系統概覽
Flower Life 採用 Node.js + Express + EJS，前端使用 Tailwind CSS v4。後端負責 API、頁面渲染、會員認證、訂單與庫存管理，以及 ECPay 金流 Webhook 處理。

## 啟動流程
1. `server.js` 啟動 `app.js`。
2. `app.js` 載入 `.env`，初始化資料庫、全域 middleware、CORS、JSON 解析、session。
3. `src/database.js` 建表並執行資料完整性檢查。
4. 掛載路由，最後進入 404 與錯誤處理器。

## 主要架構組件
- `src/database.js`：SQLite 初始化、schema 建立、狀態約束與完整性檢查。
- `src/routes/orderRoutes.js`：訂單列表、訂單詳情、取消訂單、ECPay 付款參數生成、Webhook 回傳驗證。
- `src/middleware/authMiddleware.js`：JWT 驗證與使用者授權。
- `public/js/api.js`：前端 API 請求封裝，支援相對路徑與 `window.API_BASE_URL`。
- `views/layouts/front.ejs`：注入 `window.API_BASE_URL`，支援同源開發與 ngrok 金流測試。

## API 路由總覽
| 路徑 | 檔案 | 認證 | 功能 |
| --- | --- | --- | --- |
| GET /api/orders | `src/routes/orderRoutes.js` | JWT + x-session-id | 取得使用者訂單列表 |
| GET /api/orders/:id | `src/routes/orderRoutes.js` | JWT + x-session-id | 取得訂單詳情 |
| PATCH /api/orders/:id/cancel | `src/routes/orderRoutes.js` | JWT + x-session-id | 取消 pending 訂單並還原庫存 |
| POST /api/orders/:id/pay | `src/routes/orderRoutes.js` | JWT + x-session-id | 產生 ECPay 付款參數 |
| POST /api/orders/ecpay-return | `src/routes/orderRoutes.js` | none | ECPay Webhook 回傳，驗證 CheckMacValue 並更新狀態 |

## ECPay Webhook 流程
1. 前端建立訂單並呼叫 `/api/orders/:id/pay`。
2. 伺服器組合 ECPay 參數，計算 `CheckMacValue`，並回傳給前端。
3. 綠界付款完成後，以 `POST` 呼叫 `POST /api/orders/ecpay-return`。
4. 後端計算 `CheckMacValue`，與綠界回傳值比較。
5. 驗證成功後返回純文字 `1|OK`，並將 `orders.status` 更新為 `paid`。

## 訂單取消與庫存回補
- 取消路由只允許 `pending` 訂單。
- 取消時，後端會在 transaction 內執行庫存回補，並將 `orders.status` 設為 `cancelled`。
- 此邏輯避免直接刪除訂單，保留訂單紀錄並維持資料完整性。

## 資料庫 schema 重點
- `orders`：`id`, `order_no`, `user_id`, `total_amount`, `status`, `paid_at`, `created_at`
  - `status` 限制：`pending`、`paid`、`failed`、`cancelled`
- `order_items`：`order_id`, `product_id`, `product_name`, `product_price`, `quantity`

## CORS 與環境變數
- CORS 採 `origin: true, credentials: true`，允許 `Content-Type`, `Authorization`, `x-session-id`, `Accept`, `X-Requested-With`。
- `BASE_URL`：ngrok public URL，用於 ECPay webhook 及瀏覽器金流回傳。
- `FRONTEND_URL`：前端來源 URL，用於金流完成後的回跳路徑。
- `window.API_BASE_URL`：前端注入環境 URL，若為空則使用相對路徑 `/api/...`。
