import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Mobile Home Page elements...');

  // Promotions
  const promotions = [
    {
      title: 'Exclusive iPhone 17 Launch',
      subtitle: 'Get 20% off on all iPhone 17 Pro designs!',
      backgroundColor: '#CE1D19',
      iconName: 'phone_iphone',
      sortOrder: 0,
    },
    {
      title: 'New Galaxy S25 Skins',
      subtitle: 'Explore the latest styles for Samsung S25.',
      backgroundColor: '#E6B82C',
      iconName: 'smartphone',
      sortOrder: 1,
    },
  ];

  for (const promo of promotions) {
    const existing = await prisma.mobilePromotion.findFirst({ where: { title: promo.title } });
    if (!existing) {
      await prisma.mobilePromotion.create({ data: promo });
    }
  }

  // Quick Actions
  const actions = [
    { label: 'Scan', iconName: 'qr_code_scanner', action: 'scan', sortOrder: 0 },
    { label: 'History', iconName: 'history', action: 'history', sortOrder: 1 },
    { label: 'Stock', iconName: 'inventory_2_outlined', action: 'stock', sortOrder: 2 },
    { label: 'Help', iconName: 'support_agent', action: 'help', sortOrder: 3 },
  ];

  for (const act of actions) {
    const existing = await prisma.mobileQuickAction.findFirst({ where: { label: act.label } });
    if (!existing) {
      await prisma.mobileQuickAction.create({ data: act });
    }
  }

  // Info Cards
  const infocards = [
    {
      title: 'How to apply Flashgard Skins',
      excerpt: 'Learn the best techniques for a perfect application every time.',
      timeText: '5 min read',
      sortOrder: 0,
    },
    {
      title: 'New Machine Firmware v2.1',
      excerpt: 'Stability improvements and 15% faster cutting speeds.',
      timeText: 'Yesterday',
      sortOrder: 1,
    },
    {
      title: 'System Maintenance',
      excerpt: 'The CRM will be undergoing maintenance on Sunday at 2 AM GMT.',
      timeText: '2 days ago',
      sortOrder: 2,
    },
  ];

  for (const card of infocards) {
    const existing = await prisma.mobileInfoCard.findFirst({ where: { title: card.title } });
    if (!existing) {
      await prisma.mobileInfoCard.create({ data: card });
    }
  }

  console.log('✅ Seeding Mobile Home Page elements completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
