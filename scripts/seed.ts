// Initialize the SQLite database and seed the question bank.
// Run: npm run db:seed
import { getDb } from "../src/lib/db";

const db = getDb();
const { n } = db.prepare("SELECT COUNT(*) AS n FROM questions").get() as { n: number };
console.log(`✅ Database ready. ${n} questions in the bank.`);
