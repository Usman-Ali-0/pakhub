const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findUnique({ where: { username: 'usman' } });
  if (!user) {
    console.log("User not found");
    return;
  }
  const repos = await prisma.repository.findMany({ where: { ownerId: user.id } });
  console.log(repos.map(r => r.name + ' - ' + r.defaultBranch).join('\n'));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
