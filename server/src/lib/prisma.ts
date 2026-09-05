import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma client singleton.
 * Import this in ALL routes and services instead of instantiating a new PrismaClient.
 * This prevents connection pool exhaustion under load.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
