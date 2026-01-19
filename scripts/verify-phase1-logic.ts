//scripts/verify-phase1-logic.ts
import { PrismaClient } from "@prisma/client";
import { calculateInventoryUpdates } from "../lib/inventory";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 Starting Phase 1 Logic Verification...");

  // 1. Create a Test User
  const testEmail = "test-verification-user@example.com";
  let user = await prisma.user.findUnique({ where: { email: testEmail } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Verification User",
        plan: "FREE",
      },
    });
    console.log("✅ Created test user:", user.id);
  } else {
    console.log("ℹ️ Using existing test user:", user.id);
    // Cleanup inventory
    await prisma.ingredient.deleteMany({ where: { userId: user.id } });
    console.log("🧹 Cleared user inventory");
  }

  // 2. Add Ingredients
  // Case A: Exact Match, Sufficient Amount
  // Case B: Partial Match, Exact Amount
  // Case C: New Ingredient (should ignore or error? Logic says ignore if not in inventory generally, or mark missing, but cook api only deducts what we have)

  await prisma.ingredient.createMany({
    data: [
      {
        userId: user.id,
        name: "醤油",
        amount: 100,
        unit: "ml",
        amountLevel: "普通",
        createdAt: new Date(),
      }, // 100ml
      {
        userId: user.id,
        name: "鶏肉",
        amount: 300,
        unit: "g",
        amountLevel: "普通",
        createdAt: new Date(),
      }, // 300g
      {
        userId: user.id,
        name: "キャベツ",
        amount: 0,
        unit: null,
        amountLevel: "半分",
        createdAt: new Date(),
      }, // Rough amount
    ],
  });
  console.log(
    "✅ Added test ingredients: 醤油(100ml), 鶏肉(300g), キャベツ(半分)",
  );

  // 3. Mock a "Cook" Request (Ingredients Used)
  const usedIngredients = [
    { name: "醤油", amount: 15, unit: "ml" }, // Use 15ml (leaving 85ml)
    { name: "鶏肉", amount: 400, unit: "g" }, // Use 400g (Deficit! Should consume all 300g? Or error? API logic usually deducts available. `calculateInventoryUpdates` handles this.)
    // Note: The logic in calculateInventoryUpdates:
    // If stock >= required, deduct.
    // If stock < required, set to 0? Or keep negative?
    // Let's check logic expectation: Usually we consume what we have.
    { name: "キャベツ", amount: 0, unit: "1/4個" }, // Use logic decrementAmountLevel?
  ];

  console.log("🍳 Simulating Cooking:", JSON.stringify(usedIngredients));

  // Fetch current inventory
  const inventory = await prisma.ingredient.findMany({
    where: { userId: user.id },
  });

  // 4. Calculate Updates
  // We need to verify `calculateInventoryUpdates` works as expected
  // But wait, `calculateInventoryUpdates` logic is complex. Let's run it.

  // Note: We need to mock "decreaseAmountLevel" logic if it's inside or imported?
  // It is imported in the route, but the function `calculateInventoryUpdates` is in `lib/inventory.ts`.
  // Let's assume we are testing `calculateInventoryUpdates` behavior.

  const { update: updates, delete: deletes } = calculateInventoryUpdates(
    usedIngredients,
    inventory,
  );

  console.log("📊 Update Plan:", JSON.stringify({ updates, deletes }, null, 2));

  // 5. Verify Expectations
  // Soy Sauce: 100 - 15 = 85. Should be an update.
  const soyUpdate = updates.find(
    (u) =>
      u.data.amount !== undefined &&
      inventory.find((i) => i.id === u.id)?.name === "醤油",
  );
  if (soyUpdate && soyUpdate.data.amount === 85) {
    console.log("✅ PASS: Soy Sauce reduced correctly (100 -> 85).");
  } else {
    console.error("❌ FAIL: Soy Sauce update incorrect.", soyUpdate);
  }

  // Chicken: 300 - 400 = -100? Or 0?
  // Let's see `lib/inventory.ts` logic.
  // It does `stockNormalized - usedNormalized`.
  // If result <= 0, it likely pushes to `deletes` or sets amount to 0.
  // We need to check the logic.
  // If it goes to 0 or less, it might be in `deletes`.
  const chickenDelete = deletes.find(
    (d) => inventory.find((i) => i.id === d.id)?.name === "鶏肉",
  );
  const chickenUpdate = updates.find(
    (u) => inventory.find((i) => i.id === u.id)?.name === "鶏肉",
  );

  // Logic check reading:
  // if (remaining <= 0) deletes.push(...)
  // else updates.push(...)

  if (chickenDelete || (chickenUpdate && chickenUpdate.data.amount <= 0)) {
    console.log(
      "✅ PASS: Chicken consumed completely (300 used for 400 request).",
    );
  } else {
    console.error("❌ FAIL: Chicken not handled correctly.", {
      chickenDelete,
      chickenUpdate,
    });
  }

  // Cabbage: "半分" -> used "1/4"?
  // Rough amount logic is tricky. "decreaseAmountLevel" logic is:
  // 'Full' -> 'Much', 'Much' -> 'Half', 'Half' -> 'Little', 'Little' -> delete.
  // Does our logic handle arbitrary strings?
  // Current `lib/inventory.ts` might fallback or handle specific levels.
  // If it fails to match levels, it might default to delete or specific decrement.
  // Let's observe output.

  // 6. Cleanup
  await prisma.ingredient.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log("🧹 Cleanup complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
