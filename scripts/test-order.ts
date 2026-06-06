import prisma from "../lib/prisma";

async function main() {
  console.log("Testing order creation flow...");
  
  const menuItems = await prisma.menuItem.findMany();
  const tables = await prisma.table.findMany();
  
  console.log(`Menu items: ${menuItems.length}`);
  console.log(`Tables: ${tables.length}`);
  
  if (menuItems.length === 0 || tables.length === 0) {
    console.log("Missing test data - run scripts/setup-test-data.ts first");
    process.exit(1);
  }
  
  console.log("✓ Order test data verified!");
}

main().catch(console.error).finally(() => prisma.$disconnect());