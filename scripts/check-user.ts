import prisma from "../lib/prisma";

async function main() {
  const user = await prisma.user.findFirst({ 
    select: { id: true, email: true, pin: true, role: true, isActive: true } 
  });
  console.log(JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());