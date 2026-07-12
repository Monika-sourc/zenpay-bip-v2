import express from "express";
import cors from "cors";
import { Resend } from "resend";

const app = express();
app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

// Fonction pour générer un suffixe aléatoire (4 caractères) - utilisé pour l'objet
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
    const randomSuffix = generateRandomCode(4);

    const now = new Date();
    const dateStr = now.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const montantAffiche = montant || '---';
    const beneficiaireAffiche = beneficiaire || '---';
    const compteAffiche = compte || '---';

    let sujet, htmlContent;

    // ===== Cas : email complet déjà construit =====
    if (type === 'email_complete') {
      sujet = subject || `ZenPay Israel - Transfer`;
      htmlContent = html || `<p>Hello ${nom},</p><p>Your transfer has been processed.</p>`;
    } 
    // ===== Cas : remboursement admin (hébreu) =====
    else if (type === 'admin_refund') {
      sujet = `${randomSuffix} ZenPay Israel - Ref ${ref} : העברה בוטלה`;
      htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;border:1px solid #ddd;border-radius:8px;overflow:hidden;direction:rtl;text-align:right;">
        <div style="background:#7B2FBE;padding:15px 20px;text-align:center;color:#fff;font-size:26px;font-weight:bold;letter-spacing:1px;">ZenPay Israel</div>
        <div style="padding:20px;">
          <p style="font-size:20px;color:#222;margin:0 0 15px 0;">שלום/שלום <strong>${nom}</strong>,</p>
          <p><b style="color:#d9534f;">ביטול העברה על ידי המנהל</b></p>
          <p>העברה בסך <b>${montantAffiche} ₪</b> בוטלה על ידי מנהל מערכת ZenPay Israel.</p>
          <p>ההחלטה התקבלה מסיבות מנהליות.</p>
          <div style="background:#FEF2F2;padding:14px 16px;border-radius:6px;border-right:6px solid #DC2626;margin:14px 0;word-wrap:break-word;">
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>מספר הפניה :</strong> #${ref}</p>
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>תאריך ביטול :</strong> ${dateStr}</p>
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>שעה :</strong> ${timeStr}</p>
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>סכום :</strong> ${montantAffiche} ₪</p>
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>מוטב :</strong> ${beneficiaireAffiche}</p>
            <p style="margin:0;font-size:14px;word-break:break-all;"><strong>חשבון (IBAN) :</strong> ${compteAffiche}</p>
          </div>
          <p style="margin-top:15px;">לשאלות, אנא צור קשר עם צוות התמיכה בכתובת <a href="mailto:hello@zenpaybj.xyz">hello@zenpaybj.xyz</a></p>
          <p style="margin-top:25px;">בברכה,<br><strong>צוות ZenPay Israel</strong></p>
          <p style="font-size:13px;color:#666;">noreply@zenpaybj.xyz</p>
        </div>
      </div>`;
    } 
    // ===== Cas : rejet (hébreu) =====
    else if (success === false || (pct && pct < 100)) {
      sujet = `${randomSuffix} ZenPay Israel - Ref ${ref} : ההעברה נדחתה`;
      htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;border:1px solid #ddd;border-radius:8px;overflow:hidden;direction:rtl;text-align:right;">
        <div style="background:#7B2FBE;padding:15px 20px;text-align:center;color:#fff;font-size:26px;font-weight:bold;letter-spacing:1px;">ZenPay Israel</div>
        <div style="padding:20px;">
          <p style="font-size:20px;color:#222;margin:0 0 15px 0;">שלום/שלום <strong>${nom}</strong>,</p>
          <p><b style="color:#d9534f;">ההעברה נדחתה</b></p>
          <p>בקשת ההעברה שלך <b>נדחתה</b> ב-${pct || 0}% מעיבוד.</p>
          <p style="background:#f8d7da;padding:10px;border-radius:4px;color:#721c24;">סיבה : הפעולה אינה עומדת בתנאי האבטחה.</p>
          <div style="background:#FFFBEB;padding:14px 16px;border-radius:6px;border-right:6px solid #EAB308;margin:14px 0;word-wrap:break-word;">
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>מספר הפניה :</strong> #${ref}</p>
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>תאריך :</strong> ${dateStr}</p>
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>שעה :</strong> ${timeStr}</p>
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>סכום :</strong> ${montantAffiche} ₪</p>
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>מוטב :</strong> ${beneficiaireAffiche}</p>
            <p style="margin:0;font-size:14px;word-break:break-all;"><strong>חשבון (IBAN) :</strong> ${compteAffiche}</p>
          </div>
          <p>אנא בדוק את הפרטים ונסה שוב.</p>
          <p style="margin-top:25px;">בברכה,<br><strong>צוות ZenPay Israel</strong></p>
          <p style="font-size:13px;color:#666;">noreply@zenpaybj.xyz</p>
        </div>
      </div>`;
    } 
    // ===== Cas : succès (hébreu) =====
    else {
      sujet = `${randomSuffix} ZenPay Israel - Ref ${ref} : ההעברה אושרה`;
      htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;border:1px solid #ddd;border-radius:8px;overflow:hidden;direction:rtl;text-align:right;">
        <div style="background:#7B2FBE;padding:15px 20px;text-align:center;color:#fff;font-size:26px;font-weight:bold;letter-spacing:1px;">ZenPay Israel</div>
        <div style="padding:20px;">
          <p style="font-size:20px;color:#222;margin:0 0 15px 0;">שלום/שלום <strong>${nom}</strong>,</p>
          <p><b style="color:#28a745;">ההעברה אושרה</b></p>
          <p>ההעברה שלך עובדה בהצלחה.</p>
          <div style="background:#F0FDF4;padding:14px 16px;border-radius:6px;border-right:6px solid #28a745;margin:14px 0;word-wrap:break-word;">
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>מספר הפניה :</strong> #${ref}</p>
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>תאריך :</strong> ${dateStr}</p>
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>שעה :</strong> ${timeStr}</p>
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>סכום :</strong> ${montantAffiche} ₪</p>
            <p style="margin:0 0 6px 0;font-size:14px;"><strong>מוטב :</strong> ${beneficiaireAffiche}</p>
            <p style="margin:0;font-size:14px;word-break:break-all;"><strong>חשבון (IBAN) :</strong> ${compteAffiche}</p>
          </div>
          <p style="margin-top:25px;">בברכה,<br><strong>צוות ZenPay Israel</strong></p>
          <p style="font-size:13px;color:#666;">noreply@zenpaybj.xyz</p>
        </div>
      </div>`;
    }

    // ===== EXPÉDITEUR FIXE (sans suffixe) =====
    const fromEmail = 'noreply@send.zenpaybj.xyz';

    const data = await resend.emails.send({
      from: `ZenPay <${fromEmail}>`,
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
