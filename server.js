require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const { MercadoPagoConfig, Payment } = require("mercadopago");

if (!process.env.MP_ACCESS_TOKEN) {
  console.error("MP_ACCESS_TOKEN no está definido");
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

app.get("/api/config", (req, res) => {
  res.json({
    public_key: process.env.MP_PUBLIC_KEY
  });
});

app.post("/api/process-payment", async (req, res) => {
  try {
    const payment = new Payment(client);

    const response = await payment.create({
      body: {
        transaction_amount: Number(req.body.transaction_amount),
        token: req.body.token,
        description: "Pago SDK Railway",
        installments: Number(req.body.installments),
        payment_method_id: req.body.payment_method_id,
        issuer_id: req.body.issuer_id,
        payer: {
          email: req.body.payer.email,
          identification: req.body.payer.identification
        }
      }
    });

    res.json({
      status: response.status,
      payment_id: response.id
    });

  } catch (error) {
    console.error("Error procesando pago:", error);
    res.status(500).json({
      error: "Error procesando pago"
    });
  }
});

app.get("/", (req, res) => {
  res.send("MP SDK Railway funcionando");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});