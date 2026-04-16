# FEATURES

## ECPay 金流整合
- `POST /api/orders/:id/pay`：建立訂單後生成 ECPay 參數，回傳 `MerchantID`、`MerchantTradeNo`、`TradeDesc`、`ItemName`、`TotalAmount`、`ReturnURL`、`OrderResultURL` 等欄位。
- `POST /api/orders/ecpay-return`：綠界回傳 Webhook。伺服器會重新組合參數，使用 `ECPAY_HASH_KEY` / `ECPAY_HASH_IV` 計算 SHA256 的 `CheckMacValue`，並與回傳值比對。
- 驗證成功後回傳純文字 `1|OK`，並在 `orders` 表內將 `status` 設為 `paid`。
- 若 `CheckMacValue` 驗證失敗或資料不合法，回傳 `0|FAIL`，避免誤判付款結果。

## 訂單取消
- `PATCH /api/orders/:id/cancel`：僅接受 `pending` 狀態訂單。
- 取消動作會執行以下流程：
  1. 驗證訂單歸屬與狀態
  2. 讀取該訂單的所有 `order_items`
  3. 將對應 `products.stock` 回補至原先庫存
  4. 將 `orders.status` 更新為 `cancelled`
- 對於 `paid` 訂單，API 會回傳 `400`，錯誤碼 `INVALID_STATUS`，避免已付款訂單被誤取消。
- 此功能保障庫存一致性，並保留取消訂單紀錄以方便後續查詢。

## CORS 與同源 API
- 前端優先使用相對路徑 `'/api/...'`，避免不必要的跨域。
- 若使用 ngrok 測試金流，後端仍支援 `window.API_BASE_URL` 作為環境切換。
- 自定義標頭 `x-session-id` 必須在 CORS 放行清單中，並作為前端 session 整合的一部分。
