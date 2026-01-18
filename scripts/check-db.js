// scripts/check-db.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log("User count:", userCount);

    // Check if plan column exists
    const user = await prisma.user.findFirst();
    console.log("User sample:", JSON.stringify(user, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
