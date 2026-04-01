import { NextRequest } from 'next/server';
import { priceEvents, PriceUpdateEvent } from '@/lib/price-events';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Fetch current prices from DB to send on connect
  const products = await prisma.product.findMany({
    where: { isActive: true, status: 'publish' },
    select: { slug: true, price: true, options: true },
  });

  const initialPrices = products.reduce(
    (acc, p) => {
      acc[p.slug] = { price: p.price, options: p.options ?? null };
      return acc;
    },
    {} as Record<string, { price: number; options: string | null }>,
  );

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial prices immediately on connect
      const initMsg = `data: ${JSON.stringify({ type: 'init', prices: initialPrices })}\n\n`;
      controller.enqueue(encoder.encode(initMsg));

      // Listen for price updates and forward to this SSE client
      const onUpdate = (event: PriceUpdateEvent) => {
        if (closed) return;
        try {
          const msg = `data: ${JSON.stringify({ type: 'price_update', slug: event.slug, price: event.price, options: event.options })}\n\n`;
          controller.enqueue(encoder.encode(msg));
        } catch {
          // Client disconnected, will be cleaned up by abort signal
        }
      };

      priceEvents.on('price_updated', onUpdate);

      // Heartbeat every 20 s keeps the connection alive through nginx/LiteSpeed proxies
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 20_000);

      // Clean up when the client disconnects
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(heartbeat);
        priceEvents.off('price_updated', onUpdate);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Prevent nginx / LiteSpeed from buffering the stream
      'X-Accel-Buffering': 'no',
    },
  });
}
