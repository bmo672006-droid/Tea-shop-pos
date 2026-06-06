import prisma from "../lib/prisma";

async function main() {
  console.log("Setting up test data for orders...");

  const menuItems = await prisma.menuItem.findMany();
  console.log(`Found ${menuItems.length} menu items`);

  if (menuItems.length === 0) {
    console.log("Creating sample menu items...");
    await prisma.menuItem.createMany({
      data: [
        { name: "Burger", price: 250, category: "Main", preparationTime: 15, isAvailable: true },
        { name: "Fries", price: 100, category: "Sides", preparationTime: 8, isAvailable: true },
        { name: "Cola", price: 50, category: "Drinks", preparationTime: 2, isAvailable: true },
        { name: "Pizza", price: 400, category: "Main", preparationTime: 20, isAvailable: true },
      ],
    });
    console.log("Created menu items");
  }

  const tables = await prisma.table.findMany();
  console.log(`Found ${tables.length} tables`);

  if (tables.length === 0) {
    console.log("Creating sample tables...");
    await prisma.table.createMany({
      data: [
        { number: 1, capacity: 4, status: "AVAILABLE" },
        { number: 2, capacity: 4, status: "AVAILABLE" },
        { number: 3, capacity: 6, status: "AVAILABLE" },
      ],
    });
    console.log("Created tables");
  }

  console.log("✓ Test data ready!");
}

main().catch(console.error).finally(() => prisma.$disconnect());