import express from "express";
import fetch from "node-fetch";
import multer from "multer";
import { FormData, Blob } from "node-fetch";

const app = express();

// Configurar multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

app.use(express.json());

// Variables de entorno (configúralas en Render)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!TELEGRAM_TOKEN || !CHAT_ID) {
  console.error("⚠️  Faltan variables de entorno TELEGRAM_TOKEN o CHAT_ID");
} else {
  console.log("✅ Variables de Telegram configuradas correctamente");
}

// Log simple de entrada
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ENDPOINT: recibir pedidos desde la app (SIN FOTO)
app.post("/pedido", async (req, res) => {
  console.log("📦 Pedido recibido:", JSON.stringify(req.body, null, 2));

  const pedido = req.body;

  // Valores con fallback por si algo viene vacío
  const nombre = pedido?.nombre ?? "Cliente";
  const telefono = pedido?.telefono ?? "N/D";
  const producto = pedido?.producto ?? "Pedido";
  const cantidad = Number(pedido?.cantidad ?? 1);
  const total = pedido?.total ?? 0;
  const metodo = pedido?.metodo ?? "N/D";
  const currency = (pedido?.currency || "USD").toUpperCase();
  const bankMessage = pedido?.bankMessage ?? "N/A";
  const notas = pedido?.notas ?? "";

  const mensaje = `
🛒 *NUEVO PEDIDO RECIBIDO*

👤 *Cliente:* ${nombre}
📱 *Teléfono:* ${telefono}

📦 *Producto(s):* ${producto}
🔢 *Cantidad:* ${cantidad}
💰 *Total:* ${total} ${currency}

💳 *Método de Pago:* ${metodo}

📝 *Mensaje del Banco:*
${bankMessage}

📌 *Notas:*
${notas}

⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'America/Havana' })}
  `.trim();

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

    const tgBodyText = await tgRes.text();
    let tgBody = tgBodyText;
    try { tgBody = JSON.parse(tgBodyText); } catch {}

    console.log("📱 Telegram status:", tgRes.status);
    console.log("📱 Telegram body:", tgBody);

    if (!tgRes.ok || (tgBody && tgBody.ok === false)) {
      return res.status(500).json({
        success: false,
        message: "No se pudo enviar a Telegram",
        telegram: tgBody
      });
    }

    // Generar ID único para el pedido
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    return res.json({ 
      success: true, 
      message: "Pedido recibido exitosamente",
      id: orderId
    });
  } catch (e) {
    console.error("❌ Telegram fetch failed:", e);
    return res.status(500).json({ 
      success: false, 
      message: "Fallo al conectar con Telegram",
      error: e.message 
    });
  }
});

// NUEVO ENDPOINT: recibir foto del comprobante
app.post("/pedido/comprobante", upload.single('photo'), async (req, res) => {
  console.log("📸 Comprobante recibido");
  
  if (!req.file) {
    console.log("❌ No se recibió ninguna foto");
    return res.status(400).json({
      success: false,
      message: "No se recibió ninguna foto"
    });
  }

  try {
    // Parsear los datos del pedido que vienen en el body
    const orderId = req.body.orderId || "N/A";
    const nombre = req.body.nombre || "Cliente";
    const telefono = req.body.telefono || "N/D";
    const metodo = req.body.metodo || "N/D";
    const total = req.body.total || "0";
    const currency = req.body.currency || "USD";
    const productos = req.body.productos || "N/D";

    const caption = `
📸 *COMPROBANTE DE PAGO*

🆔 *ID Pedido:* ${orderId}
👤 *Cliente:* ${nombre}
📱 *Teléfono:* ${telefono}
💳 *Método:* ${metodo}
💰 *Total:* ${total} ${currency}
📦 *Productos:* ${productos}

⏰ ${new Date().toLocaleString('es-ES', { timeZone: 'America/Havana' })}
    `.trim();

    // Crear FormData para enviar a Telegram
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
    
    // Convertir buffer a blob y añadir al FormData
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('photo', blob, 'comprobante.jpg');

    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
      method: "POST",
      body: formData
    });

    const tgBody = await tgRes.json();
    
    console.log("📱 Telegram photo status:", tgRes.status);
    console.log("📱 Telegram photo response:", JSON.stringify(tgBody, null, 2));

    if (!tgRes.ok || !tgBody.ok) {
      return res.status(500).json({
        success: false,
        message: "No se pudo enviar la foto a Telegram",
        telegram: tgBody
      });
    }

    return res.json({ 
      success: true, 
      message: "Comprobante enviado exitosamente a Telegram"
    });

  } catch (e) {
    console.error("❌ Error al enviar foto:", e);
    return res.status(500).json({ 
      success: false, 
      message: "Error al procesar la foto",
      error: e.message 
    });
  }
});

// Endpoint de prueba
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "API de Pedidos funcionando",
    endpoints: {
      pedido: "POST /pedido",
      comprobante: "POST /pedido/comprobante"
    }
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API lista en puerto ${PORT}`);
  console.log(`📡 Endpoints disponibles:`);
  console.log(`   - POST /pedido`);
  console.log(`   - POST /pedido/comprobante`);
});

