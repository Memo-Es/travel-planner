// Applies database migrations during `npm run build`.
//
// Preview builds skip them. Previews on Vercel use the same database as
// production, so a migration on a branch that hasn't been merged would change
// the real database, and one that fails blocks every production deploy after
// it. That happened with feature/quien-pago on 6 Oct 2026. A preview that
// needs a schema change needs its own database first.
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.VERCEL_ENV === "preview") {
  console.log(
    "Preview build: skipping database migrations, previews share the production database.",
  );
  process.exit(0);
}

run("prisma db execute --file prisma/repair.sql --schema prisma/schema.prisma");
run("prisma migrate deploy");
