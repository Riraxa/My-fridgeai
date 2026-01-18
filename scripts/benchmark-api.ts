const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_USER_ID = "benchmark-user"; // You might need a valid session token

async function benchmark(name: string, fn: () => Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const duration = performance.now() - start;
    console.log(`✅ ${name}: ${duration.toFixed(2)}ms`);
  } catch (e: any) {
    console.error(`❌ ${name}: Failed - ${e.message}`);
  }
}

async function main() {
  console.log(`🚀 Starting Benchmark against ${BASE_URL}`);
  console.log("Ensure your Next.js server is running!");

  // 1. Health/Public endpoint (if any) or just a simple page fetch
  await benchmark("GET / (Home Page)", async () => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // 2. Ingredients List (Simulate load)
  // Note: This requires authentication in a real scenario.
  // If you want to test protected routes, you'll need to disable auth temporarily for testing
  // or grab a valid cookie/token and add it to headers.
  console.log(
    "\n⚠️  Authenticated endpoints skipped (requires session cookie).",
  );
  console.log(
    "To benchmark API routes specifically, use a tool like Postman or run internal function tests.",
  );

  // We can test the internal logic if we import it, but Next.js context makes it hard.
  // Instead, let's suggest the user uses the browser dev tools or a dedicated load tester.
}

main();
