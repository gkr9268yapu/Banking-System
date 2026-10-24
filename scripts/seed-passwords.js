// Gives every existing user a real bcrypt password hash, so you can log in
// with the test accounts. It only changes users.password_hash. Nothing else.
//
// Run:  npm run seed
// Needs DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME and SEED_PASSWORD
// in .env.local (npm run seed loads that file for you).
//
// Careful: running it again resets EVERY user's password to SEED_PASSWORD.

const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing environment variable ${name}. Check your .env.local file.`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const seedPassword = requireEnv("SEED_PASSWORD");
  if (seedPassword.length < 8 || Buffer.byteLength(seedPassword) > 72) {
    console.error("SEED_PASSWORD must be 8 to 72 characters long.");
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: requireEnv("DB_HOST"),
    port: Number(process.env.DB_PORT) || 4000,
    user: requireEnv("DB_USER"),
    password: requireEnv("DB_PASSWORD"),
    database: process.env.DB_NAME || "bank",
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });

  try {
    const [users] = await connection.execute("SELECT user_id, email FROM users");
    console.log(`Connected. Found ${users.length} users.`);

    for (const user of users) {
      // Each user gets their own hash (bcrypt adds a different random salt each time).
      const hash = await bcrypt.hash(seedPassword, 10);
      await connection.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", [
        hash,
        user.user_id,
      ]);
      console.log(`  password set for ${user.email}`);
    }

    console.log("Done. You can now log in with SEED_PASSWORD.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
