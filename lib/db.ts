import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./auth-schema";

const globalForDb = globalThis as unknown as { __learnerPool?: Pool };

/* constructed lazily: importing this module must not open a socket at build time */
const pool =
  globalForDb.__learnerPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL ?? "postgres://learner@localhost:5432/learner",
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__learnerPool = pool;

export const db = drizzle(pool, { schema });
