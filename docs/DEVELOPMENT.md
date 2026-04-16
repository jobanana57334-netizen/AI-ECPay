### docs 文件詳細度要求

每份文件必須做到以下程度：

撰寫前先檢視專案，找出「關鍵知識點或技術決策」，判斷標準是：
**若開發者不知道這件事，是否會影響其他模組的開發或整合？**
符合此條件的內容才需要明確記錄進文件。

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**：目錄結構（每個檔案的用途）、啟動流程、API 路由總覽表（前綴、檔案、認證、說明）、統一回應格式範例、認證與授權機制（middleware 行為、JWT 參數、有效期）、資料庫 schema（每張表的欄位、型別、約束）、金流/第三方整合的流程描述
- **[FEATURES.md](./FEATURES.md)**：每個功能區塊須有行為描述段落，不只是端點表格。包含：查詢參數與預設值、請求 body 的必填/選填欄位、業務邏輯（例如購物車累加、訂單扣庫存的 transaction）、錯誤碼與錯誤情境、非標準機制（例如雙模式認證的流程）
- **[DEVELOPMENT.md](./DEVELOPMENT.md)**：命名規則對照表、模組系統說明、新增 API/middleware/DB 的步驟、環境變數表（變數、用途、必要性、預設值）、JSDoc 格式說明與範例
- **[TESTING.md](./TESTING.md)**：測試檔案表、執行順序與依賴關係、輔助函式說明、撰寫新測試的步驟與範例、常見陷阱
- **[README.md](./README.md)**：技術棧、快速開始（copy-paste 指令）、常用指令表、文件索引表

```markdown
## 計畫歸檔流程

1. 計畫檔案命名格式：YYYY-MM-DD-<feature-name>.md
2. 計畫文件結構：User Story → Spec → Tasks
3. 功能完成後：移至 docs/plans/archive/
4. 更新 docs/FEATURES.md 和 docs/CHANGELOG.md
```

## 環境變數規範
| 變數 | 用途 | 必要性 | 範例 |
| --- | --- | --- | --- |
| `BASE_URL` | ngrok 公開 URL，供 ECPay Webhook 與金流回跳使用 | 必填（開發測試） | `https://xxxxxx.ngrok-free.dev` |
| `FRONTEND_URL` | 前端頁面來源，用於金流完成後跳回 | 必填 | `http://localhost:3001` |
| `ECPAY_MERCHANT_ID` | 綠界商店代號 | 必填 | `2000132` |
| `ECPAY_HASH_KEY` | 綠界 HashKey，用於 CheckMacValue 計算 | 必填 | `5294y06JbISpM5x9` |
| `ECPAY_HASH_IV` | 綠界 HashIV，用於 CheckMacValue 計算 | 必填 | `v77hoKGq4kWxNNIS` |
| `ECPAY_ENV` | 環境模式（production / stage） | 選填 | `stage` |

## CORS 準則
- `app.js` 使用 `cors({ origin: true, credentials: true })`。
- 允許標頭：`Content-Type`, `Authorization`, `x-session-id`, `Accept`, `X-Requested-With`。
- 前端請求可優先使用相對路徑 `/api/...`，同源時避免跨域。
- 若使用 ngrok 測試金流，請確認 `window.API_BASE_URL` 與 `BASE_URL` 同步。

## 新增 API / middleware / DB 步驟
1. 先在 `src/routes/` 新增 route 檔或擴充現有 route。
2. 在 `docs/FEATURES.md` 補上功能行為描述、請求 / 回應及錯誤情境。
3. 若需要 `env` 變數，更新本檔 `DEVELOPMENT.md`。
4. 若需要資料庫變更，記錄 schema 差異與約束更新，並實作 `src/database.js` 的初始化檢查。
5. 確保 `docs/ARCHITECTURE.md` 的 API 總覽表與流程描述同步。

## 重要技術決策
- 金流 Webhook 必須使用 public URL (ngrok)，本地開發時不可直接用 localhost。
- 訂單取消採 `PATCH /api/orders/:id/cancel`，不刪除訂單資料，而是更新狀態並回補庫存。
- `x-session-id` 作為前端 session 整合的一部分，必須在 CORS 放行清單中。
