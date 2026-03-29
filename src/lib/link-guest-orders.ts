import prisma from '@/lib/db';

export async function linkGuestOrders(email: string, customerId: string): Promise<number> {
  const normalizedEmail = email.toLowerCase().trim();

  // Link guest orders to registered customer
  const result = await prisma.order.updateMany({
    where: {
      billingEmail: normalizedEmail,
      customerId: null,
      deletedAt: null,
    },
    data: { customerId },
  });

  return result.count;
}
