import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// CONFIGURA ESTO
const TELEGRAM_TOKEN = "AQUI_TU_TOKEN";
const CHAT_ID = "AQUI_TU_CHAT_ID";

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
