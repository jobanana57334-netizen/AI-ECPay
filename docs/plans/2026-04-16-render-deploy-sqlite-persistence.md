# 計畫：部署至 Render 並配置 SQLite 持久化硬碟

## 1. User Story

身為平台維運人員，我希望「花漾生活」能穩定部署在 Render 上，並讓 SQLite 資料庫儲存在雲端可持久化的硬碟路徑，以免重啟時遺失訂單資料。

## 2. Spec (規格)

- 部署平台：Render.
- 伺服器啟動方式：`npm start`。
- 持久化資料庫路徑：Render 的持久化硬碟目錄，如 `/data`，並由環境變數控制。
- SQLite 檔案必須由 `src/database.js` 依 `DATABASE_FILE` 或 `DATABASE_PATH` 變數建立，不可使用臨時路徑。
- 必須驗證雲端環境中 `BASE_URL` 與 ECPay 相關環境變數是否正確，並確認前端與後端使用同一個公開 URL。

## 3. 環境變數清單

| 變數 | 用途 | 必要性 | 建議值 |
| --- | --- | --- | --- |
| `BASE_URL` | Render 應用程式公開網址，ECPay Webhook / 前端回傳使用 | 必填 | `https://<service>.onrender.com` |
| `DATABASE_FILE` | SQLite 檔案完整路徑，指向 Render 持久化硬碟 | 必填 | `/data/database.sqlite` |
| `NODE_ENV` | Node 運行模式 | 選填 | `production` |
| `ECPAY_MERCHANT_ID` | 綠界商店代號 | 必填 | `2000132` |
| `ECPAY_HASH_KEY` | 綠界 HashKey | 必填 | `5294y06JbISpM5x9` |
| `ECPAY_HASH_IV` | 綠界 HashIV | 必填 | `v77hoKGq4kWxNNIS` |
| `ECPAY_ENV` | ECPay 連線環境（production / stage） | 選填 | `stage` |

## 4. Tasks (任務清單)

- [ ] 在 `src/database.js` 中加入 runtime 檢查：若 `DATABASE_FILE` 未設定，停止啟動並印出錯誤。
- [ ] 將 SQLite 建檔邏輯統一改為 `DATABASE_FILE` 的絕對路徑，並確保路徑所在目錄存在。
- [ ] 檢查 `app.js` / `server.js` 啟動流程，確認可在 Render 使用 `npm start` 啟動。
- [ ] 更新 `.env.example`，新增 `DATABASE_FILE=/data/database.sqlite` 範例說明。
- [ ] 在 Render Dashboard 中新增環境變數：`BASE_URL`、`DATABASE_FILE`、`ECPAY_MERCHANT_ID`、`ECPAY_HASH_KEY`、`ECPAY_HASH_IV`、`ECPAY_ENV`。
- [ ] 在 Render 服務設定中添加 Persistent Disk mount point，並對應到 `/data`。
- [ ] 部署後先執行 `npm start`；若啟動成功，驗證 `process.env.DATABASE_FILE` 與 `process.env.BASE_URL` 已讀取。
- [ ] 撰寫雲端驗證步驟，確認 SQLite 檔案持久化與金流相關 ENV 的運作。

## 5. 具體驗證步驟

### 5.1 在 Render 上檢查環境變數

1. 打開 Render 服務設定。
2. 在 Environment Variables 區域，確認以下變數存在且對應正確：
   - `BASE_URL` -> `https://<service>.onrender.com`
   - `DATABASE_FILE` -> `/data/database.sqlite`
   - `ECPAY_MERCHANT_ID`、`ECPAY_HASH_KEY`、`ECPAY_HASH_IV`、`ECPAY_ENV`
3. 若使用 Render 的公開 URL，確認 `BASE_URL` 與前端 `window.API_BASE_URL` 在部署後一致。

### 5.2 在 Render 服務啟動時驗證 sqlite 路徑

1. 部署後查看服務 Logs。
2. 確認伺服器啟動時 `process.env.DATABASE_FILE` 為 `/data/database.sqlite`（或指定的持久化路徑）。
3. 若有自訂啟動日誌，可在 `src/database.js` 打印：`Using SQLite database: ${DATABASE_FILE}`。
4. 使用 Render shell 或 logs 執行 `ls -la /data`，確認 `database.sqlite` 已建立。

### 5.3 持久化檢查

1. 在 Render 上建立一筆測試訂單或查詢現有訂單。
2. 重啟 Render 服務。
3. 再次查詢同一筆測試訂單，確認資料仍存在。
4. 檢查 `database.sqlite` 檔案大小是否符合預期，並於重啟前後仍存在於 `/data`。

### 5.4 ECPay / BASE_URL 驗證

1. 確認 `BASE_URL` 對應到 Render 應用程式公開 URL。
2. 使用 Render 服務 shell 或 log 寫入 `console.log(process.env.BASE_URL)`。
3. 確認 `ECPAY_MERCHANT_ID`、`ECPAY_HASH_KEY`、`ECPAY_HASH_IV`、`ECPAY_ENV` 已載入。
4. 測試 `POST /api/orders/:id/pay`，確認後端生成的 `ReturnURL` 與 `OrderResultURL` 均指向 `BASE_URL`。
5. 若需要，使用 `scripts/mock-ecpay-return.js` 模擬 ECPay Webhook，確認 `POST /api/orders/ecpay-return` 能正確驗證 `CheckMacValue`。

## 6. 自動化歸檔檢查

- 已建立 `docs/plans/archive/` 目錄，以符合專案歸檔流程。
- 目前唯一在 `docs/plans/` 下的計畫檔是 `2026-04-16-ecpay-integration.md`，內容仍有待完成的 checkbox。該檔案尚未移至 `docs/plans/archive/`，代表金流整合計畫仍屬執行中。
- `docs/plans/achieve/` 目前為空，表示尚無完成計畫檔已歸檔。

## 7. 交付標準

- 成功部署到 Render，並使用 `DATABASE_FILE=/data/database.sqlite`。
- 重啟後資料庫資料不遺失。
- `BASE_URL` 與 ECPay 相關 ENV 在 Render 環境中可讀取。
- 若本計畫完成，應將本文件移至 `docs/plans/archive/`，並更新 `docs/FEATURES.md` / `docs/CHANGELOG.md`。