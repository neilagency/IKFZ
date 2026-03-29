import prisma from '@/lib/db';

export async function linkGuestOrders(email: string, customerId: string): Promise<number> {
  const normalizedEmail = email.toLowerCase().trim();
  const result = await prisma.order.updateMany({
    where: {
      billingEmail: normalizedEmail,
      customerId: null,
    },
    data: { customerId },
  });
  return result.count;
}
