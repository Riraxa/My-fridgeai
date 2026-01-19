//scripts/migrate-ingredients.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log(
    "Starting migration: Backfill amountLevel for ingredients setup...",
  );

  // 1. Find all ingredients that don't have an amountLevel set (or are null)
  // Note: Since we just added the field, they will all be null.
  // We can also check if 'amount' is present to decide better, but the rule is:
  // "For existing ingredients without amounts, default to amountLevel: '普通' (normal)"
  // If they have 'quantity' (old field) or 'amount' (new field mapped), we might want to infer?
  // But safest is to just set a default level if none exists.

  const ingredients = await prisma.ingredient.findMany({
    where: {
      amountLevel: null,
    },
  });

  console.log(`Found ${ingredients.length} ingredients to migrate.`);

  for (const ingredient of ingredients) {
    // If we wanted to be smart, we could check ingredient.quantity (the old field)
    // But per instructions: "default to amountLevel: '普通'"

    await prisma.ingredient.update({
      where: { id: ingredient.id },
      data: {
        amountLevel: "普通", // Normal
      },
    });
  }

  console.log("Migration completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
