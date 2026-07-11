import express from "express";
import cors from "cors";
import { Resend } from "resend";

const app = express();
app.use(cors());
app.use(express.json());

const resend = new Resend(process.env.RESEND_API_KEY);

function generateRandomCode(length = 4) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

app.get("/", (req, res) => {
  res.json({ status: "FLOA BK Israel API v2 OK" });
});

app.post("/api/inscription", async (req, res) => {
  const { nom, email, telephone, ville, pays, pct, success, montant, beneficiaire, compte, reference, type } = req.body;
  if (!nom || !email) return res.status(400).json({ success: false });

  const ref = reference || Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const randomPrefix = generateRandomCode(4);
  const fromEmail = `noreply+${randomPrefix}@floabk.co.il`;

  const now = new Date();
  const dateStr = now.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const montantAffiche = montant || '---';
  const beneficiaireAffiche = beneficiaire || '---';
  const compteAffiche = compte || '---';

  const estRejet = (success === false) || (typeof pct === 'number' && pct < 100);
  const pourcentage = (typeof pct === 'number' && pct >= 0 && pct <= 100) ? pct : 100;

  let sujet, htmlContent, textContent;

  const header = `<div style="background:#6D28D9;padding:12px 20px;text-align:center;border-radius:8px 8px 0 0;color:#fff;font-size:26px;font-weight:bold;letter-spacing:1px;">FLOA BK</div>`;
  const footer = `<p style="font-size:13px;color:#666;">noreply@floabk.co.il</p>`;

  // ----- Remboursement administratif -----
  if (type === 'admin_refund') {
    sujet = `${randomPrefix} FLOA BK - ביטול העברה #${ref}`;
    htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
      ${header}
      <div style="padding:20px;">
        <p>${nom} שלום,</p>
        <p><b style="color:#d9534f;">ביטול העברה על ידי המנהל</b></p>
        <p>ההעברה בסכום <b>${montantAffiche} ₪</b> בוטלה על ידי מנהל המערכת.</p>
        <div style="background:#FEF2F2;padding:14px 16px;border-radius:6px;border-left:6px solid #DC2626;margin:14px 0;">
          <p style="margin:0 0 6px 0;"><strong>אסמכתא :</strong> #${ref}</p>
          <p style="margin:0 0 6px 0;"><strong>תאריך ביטול :</strong> ${dateStr}</p>
          <p style="margin:0 0 6px 0;"><strong>שעה :</strong> ${timeStr}</p>
          <p style="margin:0 0 6px 0;"><strong>סכום :</strong> ${montantAffiche} ₪</p>
          <p style="margin:0 0 6px 0;"><strong>מוטב :</strong> ${beneficiaireAffiche}</p>
          <p style="margin:0;"><strong>חשבון (IBAN) :</strong> ${compteAffiche}</p>
        </div>
        <p style="margin-top:15px;">לשאלות נא לפנות לתמיכה: <a href="mailto:support@floabk.co.il">support@floabk.co.il</a></p>
        <p style="margin-top:25px;">בכבוד רב,<br>צוות FLOA BK</p>
        ${footer}
      </div>
    </div>`;
    textContent = `${nom} שלום, ביטול העברה. העברה של ${montantAffiche} ₪ בוטלה. אסמכתא #${ref}. לשאלות: support@floabk.co.il.`;
  } 
  // ----- Rejet -----
  else if (estRejet) {
    sujet = `${randomPrefix} FLOA BK - העברה נדחתה #${ref}`;
    htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
      ${header}
      <div style="padding:20px;">
        <p>${nom} שלום,</p>
        <p><b style="color:#d9534f;">דחייה : ההעברה בוטלה</b></p>
        <p>בקשתך להעברה נדחתה בשלב ${pourcentage}%.</p>
        <p style="background:#f8d7da;padding:10px;border-radius:4px;color:#721c24;">סיבה : פעולה לא עמדה בתנאי האבטחה.</p>
        <div style="background:#FFFBEB;padding:14px 16px;border-radius:6px;border-left:6px solid #EAB308;margin:14px 0;">
          <p style="margin:0 0 6px 0;"><strong>אסמכתא :</strong> #${ref}</p>
          <p style="margin:0 0 6px 0;"><strong>תאריך :</strong> ${dateStr}</p>
          <p style="margin:0 0 6px 0;"><strong>שעה :</strong> ${timeStr}</p>
          <p style="margin:0 0 6px 0;"><strong>סכום :</strong> ${montantAffiche} ₪</p>
          <p style="margin:0 0 6px 0;"><strong>מוטב :</strong> ${beneficiaireAffiche}</p>
          <p style="margin:0;"><strong>חשבון (IBAN) :</strong> ${compteAffiche}</p>
        </div>
        <p>אנא בדוק את הפרטים ונסה שוב.</p>
        <p style="margin-top:25px;">בכבוד רב,<br>צוות FLOA BK</p>
        ${footer}
      </div>
    </div>`;
    textContent = `${nom} שלום, דחייה. העברה נדחתה בשלב ${pourcentage}%. אסמכתא #${ref}. בדוק פרטים.`;
  } 
  // ----- הצלחה -----
  else {
    sujet = `${randomPrefix} FLOA BK - העברה אושרה #${ref}`;
    htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
      ${header}
      <div style="padding:20px;">
        <p>${nom} שלום,</p>
        <p><b style="color:#28a745;">אושר : ההעברה בוצעה בהצלחה</b></p>
        <p>העסקה נרשמה בהצלחה. תודה על השימוש ב‑FLOA BK.</p>
        <div style="background:#F0FDF4;padding:14px 16px;border-radius:6px;border-left:6px solid #28a745;margin:14px 0;">
          <p style="margin:0 0 6px 0;"><strong>אסמכתא :</strong> #${ref}</p>
          <p style="margin:0 0 6px 0;"><strong>תאריך :</strong> ${dateStr}</p>
          <p style="margin:0 0 6px 0;"><strong>שעה :</strong> ${timeStr}</p>
          <p style="margin:0 0 6px 0;"><strong>סכום :</strong> ${montantAffiche} ₪</p>
          <p style="margin:0 0 6px 0;"><strong>מוטב :</strong> ${beneficiaireAffiche}</p>
          <p style="margin:0;"><strong>חשבון (IBAN) :</strong> ${compteAffiche}</p>
        </div>
        <p style="margin-top:25px;">בכבוד רב,<br>צוות FLOA BK</p>
        ${footer}
      </div>
    </div>`;
    textContent = `${nom} שלום, הצלחה. ההעברה בוצעה. אסמכתא #${ref}.`;
  }

  try {
    const data = await resend.emails.send({
      from: `FLOA BK <${fromEmail}>`,
      to: email,
      reply_to: "support@floabk.co.il",
      subject: sujet,
      html: htmlContent,
      text: textContent,
      priority: 'high',
      headers: {
        "X-Priority": "1 (Highest)",
        "X-MSMail-Priority": "High",
        "Importance": "high",
        "X-Google-Important": "yes",
        "X-Mailer": "FLOA BK Mailer",
        "List-Unsubscribe": "<mailto:support@floabk.co.il>",
        "Precedence": "transactional",
        "X-Entity-Ref-ID": ref
      }
    });
    res.json({ success: true, ref, messageId: data.id });
  } catch (e) {
    console.error("Error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ FLOA BK Israel API running on ${PORT}`));
