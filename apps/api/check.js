const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const repos = await prisma.repository.findMany({ select: { name: true, isPrivate: true } });
  console.log(repos);
}
run().catch(console.error).finally(() => prisma.$disconnect());
