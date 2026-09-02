import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "CF Juneda <onboarding@resend.dev>";

// ─── Email: Event Booking Confirmation ────────────────────────────────────────

export async function sendEventConfirmation({
  to,
  buyerName,
  eventTitle,
  eventDate,
  eventLocation,
  quantity,
  dietary,
  total,
}: {
  to: string;
  buyerName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  quantity: number;
  dietary?: string;
  total: number;
}) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `✅ Reserva confirmada — ${eventTitle}`,
    html: `
<!DOCTYPE html>
<html lang="ca">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: Inter, Arial, sans-serif; background: #0a0a0b; color: #ffffff; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: #e10600; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 28px; text-align: center;">⚽</div>
      <h1 style="color: #e10600; font-size: 22px; margin: 16px 0 4px;">Club Futbol Juneda</h1>
      <p style="color: rgba(255,255,255,0.5); font-size: 13px; margin: 0;">Som-hi Rojos! 🔴 #AixòÉsJuneda</p>
    </div>
    
    <div style="background: #121214; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 28px; margin-bottom: 24px;">
      <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 8px;">Reserva Confirmada! ✅</h2>
      <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 24px;">Hola ${buyerName}, la teva reserva ha estat confirmada correctament.</p>
      
      <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="color: rgba(255,255,255,0.5); padding: 6px 0;">Esdeveniment</td><td style="color: #fff; font-weight: 600; text-align: right;">${eventTitle}</td></tr>
          <tr><td style="color: rgba(255,255,255,0.5); padding: 6px 0;">Data</td><td style="color: #fff; text-align: right;">${eventDate}</td></tr>
          <tr><td style="color: rgba(255,255,255,0.5); padding: 6px 0;">Lloc</td><td style="color: #fff; text-align: right;">${eventLocation}</td></tr>
          <tr><td style="color: rgba(255,255,255,0.5); padding: 6px 0;">Tiquets</td><td style="color: #fff; text-align: right;">${quantity}</td></tr>
          ${dietary ? `<tr><td style="color: rgba(255,255,255,0.5); padding: 6px 0;">Dietètica</td><td style="color: #fff; text-align: right;">${dietary}</td></tr>` : ""}
          <tr style="border-top: 1px solid rgba(255,255,255,0.1);">
            <td style="color: #fff; font-weight: 700; font-size: 16px; padding: 12px 0 0;">Total pagat</td>
            <td style="color: #e10600; font-weight: 700; font-size: 18px; text-align: right; padding-top: 12px;">${total.toFixed(2)} €</td>
          </tr>
        </table>
      </div>
    </div>
    
    <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; line-height: 1.6;">
      Guarda aquest correu com a confirmació de la teva reserva.<br>
      Qualsevol dubte: <a href="mailto:joventjunedenc@gmail.com" style="color: #e10600;">joventjunedenc@gmail.com</a>
    </p>
  </div>
</body>
</html>
    `,
  });

  if (error) console.error("[Resend] Event confirmation error:", error);
  return { success: !error };
}

// ─── Email: Merch Order Confirmation ─────────────────────────────────────────

export async function sendMerchConfirmation({
  to,
  buyerName,
  productName,
  size,
  customization,
  total,
}: {
  to: string;
  buyerName: string;
  productName: string;
  size: string;
  customization?: string;
  total: number;
}) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `🛍️ Comanda confirmada — Botiga CF Juneda`,
    html: `
<!DOCTYPE html>
<html lang="ca">
<head><meta charset="UTF-8"></head>
<body style="font-family: Inter, Arial, sans-serif; background: #0a0a0b; color: #ffffff; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #e10600; font-size: 22px; margin: 0 0 4px;">Club Futbol Juneda</h1>
      <p style="color: rgba(255,255,255,0.5); font-size: 13px; margin: 0;">Botiga Oficial 🛍️</p>
    </div>
    <div style="background: #121214; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 28px;">
      <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 8px;">Comanda Confirmada! ✅</h2>
      <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 24px;">Hola ${buyerName}, hem rebut la teva comanda.</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="color: rgba(255,255,255,0.5); padding: 6px 0;">Producte</td><td style="color: #fff; font-weight: 600; text-align: right;">${productName}</td></tr>
        <tr><td style="color: rgba(255,255,255,0.5); padding: 6px 0;">Talla</td><td style="color: #fff; text-align: right;">${size}</td></tr>
        ${customization ? `<tr><td style="color: rgba(255,255,255,0.5); padding: 6px 0;">Personalització</td><td style="color: #fff; text-align: right;">${customization}</td></tr>` : ""}
        <tr style="border-top: 1px solid rgba(255,255,255,0.1);">
          <td style="color: #fff; font-weight: 700; font-size: 16px; padding: 12px 0 0;">Total</td>
          <td style="color: #e10600; font-weight: 700; font-size: 18px; text-align: right; padding-top: 12px;">${total.toFixed(2)} €</td>
        </tr>
      </table>
      <p style="color: rgba(255,255,255,0.4); font-size: 13px; margin: 20px 0 0;">Et notificarem quan la teva comanda estigui llesta per recollir.</p>
    </div>
  </div>
</body>
</html>
    `,
  });

  if (error) console.error("[Resend] Merch confirmation error:", error);
  return { success: !error };
}

// ─── Email: Membership Welcome ────────────────────────────────────────────────

export async function sendMembershipWelcome({
  to,
  buyerName,
  tierName,
  season,
  total,
}: {
  to: string;
  buyerName: string;
  tierName: string;
  season: string;
  total: number;
}) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `🔴 Benvingut/da, soci/sòcia! — CF Juneda`,
    html: `
<!DOCTYPE html>
<html lang="ca">
<head><meta charset="UTF-8"></head>
<body style="font-family: Inter, Arial, sans-serif; background: #0a0a0b; color: #ffffff; margin: 0; padding: 0;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background: #e10600; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 28px; text-align: center;">🔴</div>
      <h1 style="color: #e10600; font-size: 22px; margin: 16px 0 4px;">Club Futbol Juneda</h1>
    </div>
    <div style="background: #121214; border: 1px solid rgba(225,6,0,0.3); border-radius: 16px; padding: 28px;">
      <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 8px;">Benvingut/da, ${buyerName}! 🎉</h2>
      <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 24px;">Ja ets soci/sòcia del Club Futbol Juneda per a la temporada ${season}. Som-hi Rojos!</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr><td style="color: rgba(255,255,255,0.5); padding: 6px 0;">Tipus</td><td style="color: #fff; font-weight: 600; text-align: right;">${tierName}</td></tr>
        <tr><td style="color: rgba(255,255,255,0.5); padding: 6px 0;">Temporada</td><td style="color: #fff; text-align: right;">${season}</td></tr>
        <tr style="border-top: 1px solid rgba(255,255,255,0.1);">
          <td style="color: #fff; font-weight: 700; font-size: 16px; padding: 12px 0 0;">Quota pagada</td>
          <td style="color: #e10600; font-weight: 700; font-size: 18px; text-align: right; padding-top: 12px;">${total.toFixed(2)} €</td>
        </tr>
      </table>
    </div>
    <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; margin-top: 24px;">
      <a href="mailto:joventjunedenc@gmail.com" style="color: #e10600;">joventjunedenc@gmail.com</a>
    </p>
  </div>
</body>
</html>
    `,
  });

  if (error) console.error("[Resend] Membership welcome error:", error);
  return { success: !error };
}
