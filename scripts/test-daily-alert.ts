// scripts/test-daily-alert.ts
import { prisma } from "../lib/prisma";
import { differenceInDays } from "date-fns";

async function main() {
  console.log("--- Testing Daily Alert Logic (Dry Run) ---");

  // 1. Find users with alerts enabled
  const usersWithAlerts = await prisma.userPreferences.findMany({
    where: { enableExpirationAlert: true },
    select: {
      userId: true,
      alertDaysBefore: true,
      user: { select: { email: true, name: true } },
    },
  });

  console.log(`Found ${usersWithAlerts.length} users with alerts enabled.`);

  for (const pref of usersWithAlerts) {
    const userId = pref.userId;
    const thresholdDays = pref.alertDaysBefore || 3;

    console.log(
      `\nUser: ${pref.user.name} (${pref.user.email}) - Threshold: ${thresholdDays} days`,
    );

    const ingredients = await prisma.ingredient.findMany({
      where: { userId },
    });

    const expiringItems = ingredients.filter((i) => {
      if (!i.expirationDate) return false;
      const days = differenceInDays(i.expirationDate, new Date());
      // Logic same as route.ts
      return days >= 0 && days <= thresholdDays;
    });

    if (expiringItems.length > 0) {
      console.log(`  [ALERT] ${expiringItems.length} items expiring soon:`);
      expiringItems.forEach((i) => {
        const days = differenceInDays(i.expirationDate!, new Date());
        console.log(
          `    - ${i.name}: ${days} days left (${i.expirationDate?.toDateString()})`,
        );
      });
    } else {
      console.log("  No expiring items found.");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
