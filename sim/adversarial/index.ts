import { scenarios, storeFactories } from "./scenarios.js";
import { assert } from "./runner.js";

async function run() {
  for (const factory of storeFactories) {
    for (const scenario of scenarios) {
      const label = `[${factory.name}] ${scenario.name}`;
      const started = Date.now();
      await scenario.run(factory);
      const elapsed = Date.now() - started;
      assert(elapsed >= 0, "Elapsed time should be non-negative.");
      console.log(`${label} ✅ (${elapsed}ms)`);
    }
  }
}

run().catch((err) => {
  console.error("Adversarial simulations failed.");
  console.error(err);
  process.exit(1);
});
