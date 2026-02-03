import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Variables de entorno (configúralas en Render)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!TELEGRAM_TOKEN || !CHAT_ID) {
  console.error("Faltan variables de entorno TELEGRAM_TOKEN o CHAT_ID");
}

// Log simple de entrada
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ENDPOINT: recibir pedidos desde la app
app.post("/pedido", async (req, res) => {
  // Log para ver exactamente qué llega desde la app
  console.log("Pedido recibido:", JSON.stringify(req.body));

  const pedido = req.body;

  // Valores con fallback por si algo viene vacío
  const nombre = pedido?.nombre ?? "Cliente";
  const producto = pedido?.producto ?? "Pedido";
  const cantidad = Number(pedido?.cantidad ?? 1);
  const total = pedido?.total ?? 0;
  const metodo = pedido?.metodo ?? "N/D";
  const currency = (pedido?.currency || "USD").toUpperCase();

  const mensaje = `
🛒 Nuevo Pedido Recibido
Cliente: ${nombre}
Producto: ${producto}
Cantidad: ${cantidad}
Total: ${total} ${currency}
Método: ${metodo}
  `;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Enviar simple (sin Markdown) para evitar errores por formato
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: mensaje
      })
    });

    const tgBodyText = await tgRes.text();
    let tgBody = tgBodyText;
    try { tgBody = JSON.parse(tgBodyText); } catch {}

    console.log("Telegram status:", tgRes.status);
    console.log("Telegram body:", tgBody);

    if (!tgRes.ok || (tgBody && tgBody.ok === false)) {
      return res.status(500).json({
        status: "error",
        message: "No se pudo enviar a Telegram",
        telegram: tgBody
      });
    }

    return res.json({ status: "ok", message: "Pedido recibido" });
  } catch (e) {
    console.error("Telegram fetch failed:", e);
    return res.status(500).json({ status: "error", message: "Fallo al conectar con Telegram" });
  }
});

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API lista en puerto ${PORT}`));
