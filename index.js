import express from "express";
import cors from "cors";
import { Resend } from "resend";

const app = express();
app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

// Test
app.get("/", (req, res) => {
  res.json({ status: "ZenPay Israel API v2 OK" });
});

// Envoi d'email (adapté pour Israël)
app.post("/api/inscription", async (req, res) => {
  try {
    const { nom, email, montant, beneficiaire, compte, reference, type, success, pct } = req.body;

    if (!nom || !email) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }

    // Génération d'une référence unique
    const ref = reference || Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IL', { hour: '2-digit', minute: '2-digit' });
    const montantAffiche = montant || '---';
    const beneficiaireAffiche = beneficiaire || '---';
    const compteAffiche = compte || '---';

    // Détermine le type de message
    let sujet, htmlContent;

    if (type === 'admin_refund') {
      sujet = `ZenPay Israel - Transfer canceled #${ref}`;
      htmlContent = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
          <div style="background:#005EB8;padding:12px 20px;text-align:center;color:#fff;font-size:24px;font-weight:bold;">ZenPay Israel</div>
          <div style="padding:20px;">
            <p>Dear ${nom},</p>
            <p><b style="color:#d9534f;">Transfer canceled by administrator</b></p>
            <p>The transfer of <b>${montantAffiche} ₪</b> has been canceled by the ZenPay Israel administrator.</p>
            <div style="background:#f0f0f0;padding:14px 16px;border-radius:6px;border-left:6px solid #DC2626;margin:14px 0;">
              <p><strong>Reference:</strong> #${ref}</p>
              <p><strong>Date:</strong> ${dateStr}</p>
              <p><strong>Time:</strong> ${timeStr}</p>
              <p><strong>Amount:</strong> ${montantAffiche} ₪</p>
              <p><strong>Recipient:</strong> ${beneficiaireAffiche}</p>
              <p><strong>Account (IBAN):</strong> ${compteAffiche}</p>
            </div>
            <p>For any questions, please contact our support team at <a href="mailto:support@zenpayisrael.co.il">support@zenpayisrael.co.il</a></p>
            <p style="margin-top:25px;">Sincerely,<br>ZenPay Israel Team</p>
            <p style="font-size:13px;color:#666;">noreply@zenpayisrael.co.il</p>
          </div>
        </div>
      `;
    } else if (success === false || (pct && pct < 100)) {
      sujet = `ZenPay Israel - Transfer rejected #${ref}`;
      htmlContent = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
          <div style="background:#005EB8;padding:12px 20px;text-align:center;color:#fff;font-size:24px;font-weight:bold;">ZenPay Israel</div>
          <div style="padding:20px;">
            <p>Dear ${nom},</p>
            <p><b style="color:#d9534f;">Transfer rejected</b></p>
            <p>Your transfer request has been <b>rejected</b> at ${pct || 0}% processing.</p>
            <div style="background:#f0f0f0;padding:14px 16px;border-radius:6px;border-left:6px solid #EAB308;margin:14px 0;">
              <p><strong>Reference:</strong> #${ref}</p>
              <p><strong>Date:</strong> ${dateStr}</p>
              <p><strong>Time:</strong> ${timeStr}</p>
              <p><strong>Amount:</strong> ${montantAffiche} ₪</p>
              <p><strong>Recipient:</strong> ${beneficiaireAffiche}</p>
              <p><strong>Account (IBAN):</strong> ${compteAffiche}</p>
            </div>
            <p>Please check your details and try again.</p>
            <p style="margin-top:25px;">Sincerely,<br>ZenPay Israel Team</p>
            <p style="font-size:13px;color:#666;">noreply@zenpayisrael.co.il</p>
          </div>
        </div>
      `;
    } else {
      sujet = `ZenPay Israel - Transfer confirmed #${ref}`;
      htmlContent = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
          <div style="background:#005EB8;padding:12px 20px;text-align:center;color:#fff;font-size:24px;font-weight:bold;">ZenPay Israel</div>
          <div style="padding:20px;">
            <p>Dear ${nom},</p>
            <p><b style="color:#28a745;">Transfer confirmed</b></p>
            <p>Your transfer has been successfully processed.</p>
            <div style="background:#f0f0f0;padding:14px 16px;border-radius:6px;border-left:6px solid #28a745;margin:14px 0;">
              <p><strong>Reference:</strong> #${ref}</p>
              <p><strong>Date:</strong> ${dateStr}</p>
              <p><strong>Time:</strong> ${timeStr}</p>
              <p><strong>Amount:</strong> ${montantAffiche} ₪</p>
              <p><strong>Recipient:</strong> ${beneficiaireAffiche}</p>
              <p><strong>Account (IBAN):</strong> ${compteAffiche}</p>
            </div>
            <p style="margin-top:25px;">Sincerely,<br>ZenPay Israel Team</p>
            <p style="font-size:13px;color:#666;">noreply@zenpayisrael.co.il</p>
          </div>
        </div>
      `;
    }

    const data = await resend.emails.send({
      from: `ZenPay Israel <noreply@zenpayisrael.co.il>`, // ← changez si vous avez un autre domaine
      to: email,
      reply_to: "support@zenpayisrael.co.il",
      subject: sujet,
      html: htmlContent,
      headers: {
        "X-Priority": "1 (Highest)",
        "X-MSMail-Priority": "High",
        "Importance": "high",
        "X-Google-Important": "yes"
      }
    });

    res.json({ success: true, ref, messageId: data.id });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ ZenPay Israel API running on ${PORT}`));
