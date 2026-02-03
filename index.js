import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// CONFIGURA ESTO
const TELEGRAM_TOKEN = "8502434976:AAFPgWE903CLlcCZZIxjefAlW2qibZD9rTw";
const CHAT_ID = "-5299379220";

// ENDPOINT PARA RECIBIR PEDIDOS
app.post("/pedido", async (req, res) => {
  const pedido = req.body;

  const mensaje = `
🛒 *Nuevo Pedido Recibido*
Cliente: ${pedido.nombre}
Producto: ${pedido.producto}
Cantidad: ${pedido.cantidad}
Total: ${pedido.total} USD
Método: ${pedido.metodo}
  `;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: mensaje,
      parse_mode: "Markdown"
    })
  });

  res.json({ status: "ok", message: "Pedido recibido" });
});

// Servidor
app.listen(3000, () => console.log("API lista"));
app.post("/pedido", async (req, res) => {
  const pedido = req.body;

  // Sugerencia: detectar la moneda real (si la envías desde la app)
  const moneda = pedido.currency || "USD"; // fallback si no envías currency
  const mensaje = `
🛒 *Nuevo Pedido Recibido*
Cliente: ${pedido.nombre}
Producto: ${pedido.producto}
Cantidad: ${pedido.cantidad}
Total: ${pedido.total} ${moneda}
Método: ${pedido.metodo}
  `;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: mensaje,
        parse_mode: "Markdown"
      })
    });

    const tgBody = await tgRes.json().catch(() => ({}));
    if (!tgRes.ok || tgBody.ok === false) {
      console.error("Telegram error:", tgRes.status, tgBody);
      return res.status(500).json({ status: "error", message: "No se pudo enviar a Telegram" });
    }

    return res.json({ status: "ok", message: "Pedido recibido" });
  } catch (e) {
    console.error("Telegram fetch failed:", e);
    return res.status(500).json({ status: "error", message: "Fallo al conectar con Telegram" });
  }
});
