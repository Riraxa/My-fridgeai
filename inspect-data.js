const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const history = await prisma.cookingHistory.findFirst({
    orderBy: { cookedAt: "desc" },
  });
  console.log(JSON.stringify(history, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
