import prisma from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany();
  console.log("USERS:", JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
