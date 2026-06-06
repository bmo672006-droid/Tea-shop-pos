import prisma from "../lib/prisma";
import { createToken } from "../lib/auth/token";
import { verifyToken } from "../lib/auth/token";

async function main() {
  console.log("Testing auth system...");

  let user = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true, email: true, name: true, role: true, restaurantId: true }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "admin@pos.com",
        name: "Admin User",
        pin: "0000",
        role: "SUPER_ADMIN",
        restaurantId: "default"
      },
      select: { id: true, email: true, name: true, role: true, restaurantId: true }
    });
    console.log("Created user:", user);
  }

  console.log("Found user:", user);

  const { token, expiresAt } = await createToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "SUPER_ADMIN" | "MANAGER" | "COUNTER" | "WAITER",
    restaurantId: user.restaurantId,
  });

  console.log("Token created:", token.substring(0, 20) + "...");
  console.log("Expires:", expiresAt);

  const verified = await verifyToken(token);
  console.log("Token verified:", verified);

  console.log("✓ Auth system working!");
}

main().catch(console.error).finally(() => prisma.$disconnect());