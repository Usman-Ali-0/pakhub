"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding PISA-HUB database...');
    // Admin user
    const adminPassword = await bcryptjs_1.default.hash('Admin123!', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@pisahub.com' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@pisahub.com',
            name: 'PISA-HUB Admin',
            bio: 'Platform administrator',
            passwordHash: adminPassword,
            isAdmin: true,
            emailVerified: true,
            avatarUrl: null,
        },
    });
    console.log(`✓ Admin user: ${admin.username}`);
    // Demo user
    const demoPassword = await bcryptjs_1.default.hash('Demo123!', 12);
    const demo = await prisma.user.upsert({
        where: { email: 'demo@pisahub.com' },
        update: {},
        create: {
            username: 'demo',
            email: 'demo@pisahub.com',
            name: 'Demo User',
            bio: 'Exploring PISA-HUB — the future of code collaboration',
            passwordHash: demoPassword,
            emailVerified: true,
            website: 'https://pisahub.com',
            location: 'San Francisco, CA',
        },
    });
    console.log(`✓ Demo user: ${demo.username}`);
    // Demo repository (metadata only — real git init happens via API)
    const repo = await prisma.repository.upsert({
        where: { ownerId_name: { ownerId: demo.id, name: 'hello-pisahub' } },
        update: {},
        create: {
            name: 'hello-pisahub',
            description: 'My first repository on PISA-HUB 🚀',
            isPrivate: false,
            defaultBranch: 'main',
            ownerId: demo.id,
            topics: ['demo', 'getting-started'],
            language: 'JavaScript',
        },
    });
    console.log(`✓ Demo repo: ${demo.username}/${repo.name}`);
    // Default labels for the demo repo
    const defaultLabels = [
        { name: 'bug', color: '#d73a4a', description: "Something isn't working" },
        { name: 'documentation', color: '#0075ca', description: 'Improvements or additions to documentation' },
        { name: 'duplicate', color: '#cfd3d7', description: 'This issue or pull request already exists' },
        { name: 'enhancement', color: '#a2eeef', description: 'New feature or request' },
        { name: 'good first issue', color: '#7057ff', description: 'Good for newcomers' },
        { name: 'help wanted', color: '#008672', description: 'Extra attention is needed' },
        { name: 'invalid', color: '#e4e669', description: "This doesn't seem right" },
        { name: 'question', color: '#d876e3', description: 'Further information is requested' },
        { name: 'wontfix', color: '#ffffff', description: 'This will not be worked on' },
    ];
    for (const label of defaultLabels) {
        await prisma.label.upsert({
            where: { repoId_name: { repoId: repo.id, name: label.name } },
            update: {},
            create: { repoId: repo.id, ...label },
        });
    }
    console.log(`✓ Created ${defaultLabels.length} default labels`);
    // Sample issues
    const issue1 = await prisma.issue.upsert({
        where: { repoId_number: { repoId: repo.id, number: 1 } },
        update: {},
        create: {
            repoId: repo.id,
            number: 1,
            title: 'Welcome to PISA-HUB! 🎉',
            body: `# Welcome!\n\nThis is your first issue on PISA-HUB.\n\n## What you can do here:\n- Create issues to track bugs and features\n- Assign labels and milestones\n- Discuss in the comments\n- Reference commits and PRs\n\nHappy coding! 🚀`,
            state: 'OPEN',
            authorId: admin.id,
        },
    });
    console.log(`✓ Sample issue #${issue1.number}`);
    // Follow relationship
    await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: demo.id, followingId: admin.id } },
        update: {},
        create: { followerId: demo.id, followingId: admin.id },
    });
    // Star the demo repo
    await prisma.star.upsert({
        where: { userId_repoId: { userId: admin.id, repoId: repo.id } },
        update: {},
        create: { userId: admin.id, repoId: repo.id },
    });
    await prisma.repository.update({
        where: { id: repo.id },
        data: { starsCount: 1 },
    });
    console.log('\n✅ Seeding complete!');
    console.log('─────────────────────────────');
    console.log('Admin:   admin@pisahub.com  / Admin123!');
    console.log('Demo:    demo@pisahub.com   / Demo123!');
    console.log('─────────────────────────────');
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map