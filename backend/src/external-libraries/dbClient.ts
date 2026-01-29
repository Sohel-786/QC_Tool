import { Prisma, PrismaClient } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';

export let prisma: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;

export function dbConnect() {
  try {
    if (!prisma) {
      prisma = new PrismaClient({
        log:
          process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
      });
    }
    console.log('Connected to Prisma Client');
  } catch (error) {
    console.error('Prisma Client Creation Error:', error);
    process.exit(1);
  }
}

export default dbConnect;
