## Agent Permissions

- 權限與安全限制已定義於 `.claude/settings.json`。
- 請在 Sandbox 環境下運行，禁止執行任何 git push 或刪除指令。

# CLAUDE.md

## 專案概述

花漾生活 (Flower Life) — Node.js / Express / EJS / Tailwind CSS v4

## 常用指令

- 啟動伺服器：`npm run dev:server`
- 編譯 CSS：`npm run dev:css` (Tailwind v4 監控模式)
- 完整啟動：`npm start`
- 執行測試：`npm test`
- 生成 API 文件：`npm run openapi`

## 關鍵規則

- **計畫導向開發**：開發前必須在 `docs/plans/` 建立計畫，完成後移至 `archive/`。
- **UI 規範**：嚴格使用 Tailwind CSS v4，禁止自訂額外 CSS 檔案。
- **語言限制**：所有註解與 UI 顯示必須使用 **台灣繁體中文**。
- **檔案規範**：所有新增文件必須符合 `docs/DEVELOPMENT.md` 中的撰寫標準。

## 詳細文件索引

- [快速開始](./docs/README.md) — 項目介紹與環境架構
- [架構說明](./docs/ARCHITECTURE.md) — 目錄、資料流與 API 總覽
- [開發規範](./docs/DEVELOPMENT.md) — **命名規則、文件撰寫標準與計畫流程**
- [功能列表](./docs/FEATURES.md) — 現有功能行為與狀態

目前的進度：金流系統已上線，具備完整的 Webhook 處理、CheckMacValue 驗證與 CORS 保安機制。已完成 ECPay Webhook 驗證邏輯、ngrok 本機 webhook 穿透，以及訂單取消時的庫存回補流程。

技術債/提醒：重啟 ngrok 時務必同步更新 `.env` 中的 `BASE_URL`，並確認 `window.API_BASE_URL` 與前端請求一致。
