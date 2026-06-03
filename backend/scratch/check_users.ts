import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { organization: true }
  });
  console.log('Users:', JSON.stringify(users.map(u => ({ id: u.id, email: u.email, orgId: u.organizationId, orgName: u.organization?.name })), null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
