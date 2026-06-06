import prisma from "../lib/prisma";

async function main() {
  const t = await prisma.table.findFirst({ select: { id: true } });
  const m = await prisma.menuItem.findFirst({ select: { id: true } });
  console.log(JSON.stringify({ table: t?.id, menu: m?.id }));
}

main().finally(() => prisma.$disconnect());