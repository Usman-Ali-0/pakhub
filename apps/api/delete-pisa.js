const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findUnique({ where: { username: 'usman' } });
  if (!user) return console.log('User not found');
  
  const repo = await prisma.repository.findFirst({ where: { ownerId: user.id, name: 'pisa' } });
  if (repo) {
    await prisma.repository.delete({ where: { id: repo.id } });
    console.log('Deleted from DB');
  } else {
    console.log('Repo not found in DB');
  }
  
  const repoPath = path.join('D:/github/repos', user.username, 'pisa.git');
  if (fs.existsSync(repoPath)) {
    fs.rmSync(repoPath, { recursive: true, force: true });
    console.log('Deleted from filesystem');
  } else {
    console.log('Repo not found on filesystem');
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
