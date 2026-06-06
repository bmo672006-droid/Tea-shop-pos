import prisma from "../lib/prisma";

async function main() {
  console.log("Seeding database...");

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "bmo672006@gmail.com" },
  });

  if (existingAdmin) {
    console.log("Admin user already exists:", existingAdmin.email);
    return;
  }

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: "bmo672006@gmail.com",
      name: "Admin User",
      pin: "1234", // Default PIN, should be changed after first login
      role: "SUPER_ADMIN",
      restaurantId: "default",
      isActive: true,
    },
  });

  console.log("Created admin user:", adminUser.email);
  console.log("✓ Database seeded successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
