import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Get a Prisma client instance scoped to a specific tenant
 * This ensures all queries are automatically filtered by tenant_id
 */
export function getTenantClient(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = {
            ...args.where,
            tenantId,
          }
          return query(args)
        },
        async findFirst({ args, query }) {
          args.where = {
            ...args.where,
            tenantId,
          }
          return query(args)
        },
        async findUnique({ args, query }) {
          args.where = {
            ...args.where,
            tenantId,
          }
          return query(args)
        },
        async create({ args, query }) {
          args.data = {
            ...args.data,
            tenantId,
          }
          return query(args)
        },
      },
    },
  })
}

export type PrismaClientType = typeof prisma
