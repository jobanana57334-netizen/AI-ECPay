const express = require("express");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const db = require("../database");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// --- 輔助函式區 (精簡版) ---
const ecpayUrlEncode = (v) =>
  encodeURIComponent(v)
    .replace(/%20/g, "+")
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .toLowerCase();

const calculateCheckMacValue = (params, hashKey, hashIV) => {
  const sorted = Object.keys(params).sort((a, b) =>
    a.localeCompare(b, "en", { numeric: true }),
  );
  const raw = [
    `HashKey=${hashKey}`,
    ...sorted.map((k) => `${k}=${params[k]}`),
    `HashIV=${hashIV}`,
  ].join("&");
  return crypto
    .createHash("sha256")
    .update(ecpayUrlEncode(raw), "utf8")
    .digest("hex")
    .toUpperCase();
};

const sanitize = (v, len = 200) =>
  String(v || "")
    .replace(/[\r\n<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, len);

const formatTW = (d) =>
  new Date(d)
    .toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false })
    .replace(/\//g, "-");

// --- 路由區 ---

// 1. 綠界自動回傳通知 (Webhook) - 免驗證
router.post("/ecpay-return", (req, res) => {
  const body = req.body || {};
  const {
    ECPAY_MERCHANT_ID: mid,
    ECPAY_HASH_KEY: key,
    ECPAY_HASH_IV: iv,
  } = process.env;

  if (String(body.MerchantID) !== mid) return res.status(400).send("0|FAIL");

  const { CheckMacValue, ...params } = body;
  if (calculateCheckMacValue(params, key, iv) !== CheckMacValue.toUpperCase())
    return res.status(400).send("0|FAIL");

  const orderNo = String(body.MerchantTradeNo).trim();
  const order = db
    .prepare("SELECT * FROM orders WHERE REPLACE(order_no, '-', '') = ?")
    .get(orderNo);

  if (order && order.status !== "paid") {
    db.prepare(
      "UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE id = ?",
    ).run(order.id);
  }
  res.send("1|OK");
});

// 以下路由皆需驗證
router.use(authMiddleware);

// 2. 建立訂單
router.post("/", (req, res) => {
  const {
    recipientName: name,
    recipientEmail: email,
    recipientAddress: addr,
  } = req.body;
  const uid = req.user.userId;

  if (!name || !email || !addr)
    return res
      .status(400)
      .json({ error: "MISSING_DATA", message: "欄位未填齊" });

  const cart = db
    .prepare(
      `SELECT ci.*, p.name, p.price, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?`,
    )
    .all(uid);
  if (!cart.length)
    return res.status(400).json({ error: "EMPTY", message: "購物車為空" });

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const oid = uuidv4();
  const ono = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${uuidv4().slice(0, 5).toUpperCase()}`;

  try {
    db.transaction(() => {
      db.prepare(
        `INSERT INTO orders (id, order_no, user_id, recipient_name, recipient_email, recipient_address, total_amount) VALUES (?,?,?,?,?,?,?)`,
      ).run(oid, ono, uid, name, email, addr, total);
      for (const i of cart) {
        db.prepare(
          `INSERT INTO order_items (id, order_id, product_id, product_name, product_price, quantity) VALUES (?,?,?,?,?,?)`,
        ).run(uuidv4(), oid, i.product_id, i.name, i.price, i.quantity);
        db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`).run(
          i.quantity,
          i.product_id,
        );
      }
      db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(uid);
    })();
    res
      .status(201)
      .json({ data: { id: oid, order_no: ono }, message: "訂單建立成功" });
  } catch (e) {
    res.status(500).json({ message: "系統錯誤" });
  }
});

// 3. 取得列表與詳情
router.get("/", (req, res) => {
  const orders = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.userId);
  res.json({ data: { orders } });
});

router.get("/:id", (req, res) => {
  const order = db
    .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.userId);
  if (!order) return res.status(404).json({ message: "找不到訂單" });
  const items = db
    .prepare("SELECT * FROM order_items WHERE order_id = ?")
    .all(order.id);
  res.json({ data: { ...order, items } });
});

// 4. 取消訂單
router.patch("/:id/cancel", (req, res) => {
  const order = db
    .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.userId);
  if (!order || order.status !== "pending")
    return res.status(400).json({ message: "無法取消" });

  const items = db
    .prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?")
    .all(order.id);
  db.transaction(() => {
    for (const i of items)
      db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(
        i.quantity,
        i.product_id,
      );
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(
      order.id,
    );
  })();
  res.json({ message: "訂單已取消" });
});

// 5. 產生綠界支付參數
router.post("/:id/pay", (req, res) => {
  const order = db
    .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.userId);
  if (!order || order.status !== "pending")
    return res.status(400).json({ message: "狀態不符" });

  const items = db
    .prepare("SELECT * FROM order_items WHERE order_id = ?")
    .all(order.id);
  const {
    ECPAY_MERCHANT_ID: mid,
    ECPAY_HASH_KEY: key,
    ECPAY_HASH_IV: iv,
    BASE_URL,
    FRONTEND_URL,
    ECPAY_ENV,
  } = process.env;

  const ecpayParams = {
    MerchantID: mid,
    MerchantTradeNo: order.order_no.replace(/[^0-9A-Za-z]/g, "").slice(0, 20),
    MerchantTradeDate: formatTW(new Date()),
    PaymentType: "aio",
    TotalAmount: Math.max(1, order.total_amount),
    TradeDesc: sanitize(`訂單 ${order.order_no}`),
    ItemName: items
      .map((i) => `${sanitize(i.product_name)} x${i.quantity}`)
      .join("#")
      .slice(0, 200),
    ReturnURL: `${BASE_URL}/api/orders/ecpay-return`,
    OrderResultURL: `${FRONTEND_URL}/orders/${order.id}?payment=success`,
    ClientBackURL: `${FRONTEND_URL}/orders/${order.id}?payment=failed`,
    ChoosePayment: "ALL",
    EncryptType: 1,
  };

  const formData = {
    ...ecpayParams,
    CheckMacValue: calculateCheckMacValue(ecpayParams, key, iv),
  };
  const ecpayUrl =
    ECPAY_ENV === "production"
      ? "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5"
      : "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";

  res.json({ data: { ecpayUrl, formData } });
});

module.exports = router;
