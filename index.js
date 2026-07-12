import express from "express";
import cors from "cors";
import { Resend } from "resend";

const app = express();
app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

// Fonction pour générer un suffixe aléatoire (4 caractères)
function generateRandomCode(length = 4) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Test
app.get("/", (req, res) => {
  res.json({ status: "ZenPay Israel API v2 OK" });
});

// Endpoint principal
app.post("/api/inscription", async (req, res) => {
  try {
    const { 
      nom, email, montant, beneficiaire, compte, reference, 
      type, success, pct, 
      subject, html 
    } = req.body;

    if (!nom || !email) {
      return res.status(400).json({ success: false, error: "Missing nom or email" });
    }

    // Génération d'une référence unique (si non fournie)
    const ref = reference || Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    // Génération d'un suffixe aléatoire pour l'objet
    const randomSuffix = generateRandomCode(4);

    const now = new Date();
    const dateStr = now.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const montantAffiche = montant || '---';
    const beneficiaireAffiche = beneficiaire || '---';
    const compteAffiche = compte || '---';

    let sujet, htmlContent;

    // ===== Si l'email est déjà complet (type email_complete) =====
    if (type === 'email_complete') {
      // On utilise le subject et html envoyés, mais on peut y ajouter le suffixe si nécessaire.
      // Ici on suppose que le frontend a déjà construit le sujet complet avec le suffixe.
      // On conserve tel quel.
      sujet = subject || `ZenPay Israel - Transfer`;
      htmlContent = html || `<p>Hello ${nom},</p><p>Your transfer has been processed.</p>`;
    } 
    // ===== Remboursement admin =====
    else if (type === 'admin_refund') {
      // On construit l'email avec suffixe et référence
      sujet = `${randomSuffix} ZenPay Israel - Ref ${ref} : Transfer canceled`;
      htmlContent = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
          <div style="background:#7B2FBE;padding:12px 20px;text-align:center;color:#fff;font-size:26px;font-weight:bold;letter-spacing:1px;">ZenPay Israel</div>
          <div style="padding:20px;">
            <p>Dear ${nom},</p>
            <p><b style="color:#d9534f;">Transfer canceled by administrator</b></p>
            <p>The transfer of <b>${montantAffiche} ₪</b> has been canceled by the ZenPay Israel administrator.</p>
            <div style="background:#FEF2F2;padding:14px 16px;border-radius:6px;border-left:6px solid #DC2626;margin:14px 0;">
              <p style="margin:0 0 6px 0;"><strong>Reference:</strong> #${ref}</p>
              <p style="margin:0 0 6px 0;"><strong>Date:</strong> ${dateStr}</p>
              <p style="margin:0 0 6px 0;"><strong>Time:</strong> ${timeStr}</p>
              <p style="margin:0 0 6px 0;"><strong>Amount:</strong> ${montantAffiche} ₪</p>
              <p style="margin:0 0 6px 0;"><strong>Recipient:</strong> ${beneficiaireAffiche}</p>
              <p style="margin:0;"><strong>Account (IBAN):</strong> ${compteAffiche}</p>
            </div>
            <p>For any questions, please contact our support team at <a href="mailto:hello@zenpaybj.xyz">hello@zenpaybj.xyz</a></p>
            <p style="margin-top:25px;">Sincerely,<br>ZenPay Israel Team</p>
            <p style="font-size:13px;color:#666;">noreply@zenpaybj.xyz</p>
          </div>
        </div>
      `;
    } 
    // ===== Rejet =====
    else if (success === false || (pct && pct < 100)) {
      sujet = `${randomSuffix} ZenPay Israel - Ref ${ref} : Transfer rejected`;
      htmlContent = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
          <div style="background:#7B2FBE;padding:12px 20px;text-align:center;color:#fff;font-size:26px;font-weight:bold;letter-spacing:1px;">ZenPay Israel</div>
          <div style="padding:20px;">
            <p>Dear ${nom},</p>
            <p><b style="color:#d9534f;">Transfer rejected</b></p>
            <p>Your transfer request has been <b>rejected</b> at ${pct || 0}% processing.</p>
            <p style="background:#f8d7da;padding:10px;border-radius:4px;color:#721c24;">Reason: Operation not compliant with security conditions.</p>
            <div style="background:#FFFBEB;padding:14px 16px;border-radius:6px;border-left:6px solid #EAB308;margin:14px 0;">
              <p style="margin:0 0 6px 0;"><strong>Reference:</strong> #${ref}</p>
              <p style="margin:0 0 6px 0;"><strong>Date:</strong> ${dateStr}</p>
              <p style="margin:0 0 6px 0;"><strong>Time:</strong> ${timeStr}</p>
              <p style="margin:0 0 6px 0;"><strong>Amount:</strong> ${montantAffiche} ₪</p>
              <p style="margin:0 0 6px 0;"><strong>Recipient:</strong> ${beneficiaireAffiche}</p>
              <p style="margin:0;"><strong>Account (IBAN):</strong> ${compteAffiche}</p>
            </div>
            <p>Please check your details and try again.</p>
            <p style="margin-top:25px;">Sincerely,<br>ZenPay Israel Team</p>
            <p style="font-size:13px;color:#666;">noreply@zenpaybj.xyz</p>
          </div>
        </div>
      `;
    } 
    // ===== Succès =====
    else {
      sujet = `${randomSuffix} ZenPay Israel - Ref ${ref} : Transfer confirmed`;
      htmlContent = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
          <div style="background:#7B2FBE;padding:12px 20px;text-align:center;color:#fff;font-size:26px;font-weight:bold;letter-spacing:1px;">ZenPay Israel</div>
          <div style="padding:20px;">
            <p>Dear ${nom},</p>
            <p><b style="color:#28a745;">Transfer confirmed</b></p>
            <p>Your transfer has been successfully processed.</p>
            <div style="background:#F0FDF4;padding:14px 16px;border-radius:6px;border-left:6px solid #28a745;margin:14px 0;">
              <p style="margin:0 0 6px 0;"><strong>Reference:</strong> #${ref}</p>
              <p style="margin:0 0 6px 0;"><strong>Date:</strong> ${dateStr}</p>
              <p style="margin:0 0 6px 0;"><strong>Time:</strong> ${timeStr}</p>
              <p style="margin:0 0 6px 0;"><strong>Amount:</strong> ${montantAffiche} ₪</p>
              <p style="margin:0 0 6px 0;"><strong>Recipient:</strong> ${beneficiaireAffiche}</p>
              <p style="margin:0;"><strong>Account (IBAN):</strong> ${compteAffiche}</p>
            </div>
            <p style="margin-top:25px;">Sincerely,<br>ZenPay Israel Team</p>
            <p style="font-size:13px;color:#666;">noreply@zenpaybj.xyz</p>
          </div>
        </div>
      `;
    }

    const data = await resend.emails.send({
      from: `ZenPay <noreply@zenpaybj.xyz>`,
      to: email,
      reply_to: "hello@zenpaybj.xyz",
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
