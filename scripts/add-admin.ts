import prisma from "../lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  const emailInput = args[0]?.trim().toLowerCase();
  const pinInput = args[1]?.trim() || "5678"; // Use 5678 to avoid conflict with default 1234 if it exists

  if (!emailInput) {
    console.log("\n❌ Error: Please provide an email address.");
    console.log("Usage: npx tsx scripts/add-admin.ts <email> [4-digit-pin]\n");
    
    // Print current users for convenience
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true,
        isActive: true,
        pin: true
      }
    });
    console.log("Current registered users:");
    console.table(users);
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailInput)) {
    console.log(`❌ Error: "${emailInput}" is not a valid email address.`);
    return;
  }

  // Validate PIN
  if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
    console.log(`❌ Error: PIN must be exactly 4 digits. Received: "${pinInput}"`);
    return;
  }

  console.log(`Checking user with email: ${emailInput}...`);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: emailInput }
  });

  if (existingUser) {
    console.log(`User already exists (Role: ${existingUser.role}, Active: ${existingUser.isActive}).`);
    
    // Update existing user to Super Admin and make active
    const updatedUser = await prisma.user.update({
      where: { email: emailInput },
      data: {
        role: "SUPER_ADMIN",
        isActive: true,
        // Update PIN if requested or if there's no conflict
        pin: pinInput
      }
    });
    
    console.log(`\n✅ Successfully updated existing user to an active SUPER_ADMIN!`);
    console.log(`Email: ${updatedUser.email}`);
    console.log(`Name: ${updatedUser.name}`);
    console.log(`PIN: ${updatedUser.pin}`);
    console.log(`Role: ${updatedUser.role}`);
  } else {
    // Check if the pin is already in use
    const pinConflict = await prisma.user.findUnique({
      where: { pin: pinInput }
    });

    let finalPin = pinInput;
    if (pinConflict) {
      // Find a random 4 digit pin that doesn't conflict
      console.log(`⚠️ PIN ${pinInput} is already in use by another user.`);
      let attempts = 0;
      while (attempts < 100) {
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        const conflict = await prisma.user.findUnique({ where: { pin: randomPin } });
        if (!conflict) {
          finalPin = randomPin;
          break;
        }
        attempts++;
      }
      console.log(`Generated a unique PIN for this user: ${finalPin}`);
    }

    // Create a new Super Admin
    const newUser = await prisma.user.create({
      data: {
        email: emailInput,
        name: emailInput.split('@')[0], // Default name from email prefix
        pin: finalPin,
        role: "SUPER_ADMIN",
        restaurantId: "default",
        isActive: true
      }
    });

    console.log(`\n✅ Successfully created a new SUPER_ADMIN user!`);
    console.log(`Email: ${newUser.email}`);
    console.log(`Name: ${newUser.name}`);
    console.log(`PIN: ${newUser.pin}`);
    console.log(`Role: ${newUser.role}`);
  }

  // Ensure AuthUser exists or gets upserted for Better Auth
  await prisma.authUser.upsert({
    where: { email: emailInput },
    update: { emailVerified: true },
    create: {
      email: emailInput,
      name: emailInput.split('@')[0],
      emailVerified: true
    }
  });
  console.log(`✓ Sync'd with Better Auth database successfully!`);
}

main()
  .catch((err) => {
    console.error("\n❌ An error occurred during execution:");
    console.error(err);
  })
  .finally(() => prisma.$disconnect());
