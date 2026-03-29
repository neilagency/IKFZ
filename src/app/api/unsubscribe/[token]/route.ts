import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ token: string }> };

function htmlPage(title: string, message: string, success: boolean) {
  const icon = success ? '✅' : '❌';
  const color = success ? '#16a34a' : '#dc2626';
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title} – iKFZ Digital Zulassung</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f6f9; margin: 0; padding: 40px 20px; }
    .card { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); overflow: hidden; }
    .header { background: #0D5581; padding: 30px; text-align: center; }
    .header img { width: 160px; height: auto; }
    .body { padding: 40px 30px; text-align: center; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    .title { font-size: 20px; font-weight: 700; color: ${color}; margin-bottom: 12px; }
    .message { font-size: 15px; color: #555; line-height: 1.6; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #999; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="https://ikfzdigitalzulassung.de/logo.webp" alt="iKFZ Digital Zulassung" />
    </div>
    <div class="body">
      <div class="icon">${icon}</div>
      <div class="title">${title}</div>
      <div class="message">${message}</div>
    </div>
  </div>
  <div class="footer">
    <p>iKFZ Digital Zulassung UG (haftungsbeschränkt) · Gerhard-Küchen-Str. 14 · 45141 Essen</p>
  </div>
</body>
</html>`;
}

/** GET /api/unsubscribe/[token] – unsubscribe from emails */
export async function GET(_request: NextRequest, ctx: RouteCtx) {
  const { token } = await ctx.params;

  if (!token || token.length < 10) {
    return new NextResponse(
      htmlPage('Ungültiger Link', 'Dieser Abmeldelink ist ungültig.', false),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  try {
    const customer = await prisma.customer.findFirst({
      where: { unsubscribeToken: token },
    });

    if (!customer) {
      return new NextResponse(
        htmlPage(
          'Link nicht gefunden',
          'Dieser Abmeldelink ist ungültig oder wurde bereits verwendet. Falls Sie weiterhin E-Mails erhalten, kontaktieren Sie uns unter info@ikfzdigitalzulassung.de.',
          false
        ),
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { emailSubscribed: false },
    });

    return new NextResponse(
      htmlPage(
        'Erfolgreich abgemeldet',
        'Sie wurden erfolgreich vom Newsletter abgemeldet und erhalten keine weiteren Marketing-E-Mails von uns. Wichtige Benachrichtigungen zu Ihren Bestellungen erhalten Sie weiterhin.',
        true
      ),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new NextResponse(
      htmlPage(
        'Fehler',
        'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns unter info@ikfzdigitalzulassung.de.',
        false
      ),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
