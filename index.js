import express from "express";
import cors from "cors";
import { Resend } from "resend";

const app = express();
app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

// Test si l'API marche
app.get("/", (req, res) => {
  res.json({ status: "ZenPay API v2 OK" });
});

// Envoi d'email
app.post("/send", async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    const data = await resend.emails.send({
      from: "ZenPay <noreply@zenpaybj.xyz>",
      to: to,
      subject: subject,
      html: html
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Running on " + PORT));
