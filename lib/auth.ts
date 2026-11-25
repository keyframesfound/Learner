import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./auth-schema";

const ORIGIN = process.env.BETTER_AUTH_URL ?? "https://ai.ssc.edu.hk";
/* Next strips the app's basePath before the route handler runs, so this process
   sees /api/auth/*. The public URL keeps /learner, hence the explicit redirectURI. */
export const PUBLIC_AUTH = ORIGIN + "/learner/api/auth";

export const auth = betterAuth({
  appName: "Learner",
  basePath: "/api/auth",
  baseURL: ORIGIN,
  secret: process.env.AUTH_SECRET,
  trustedOrigins: [ORIGIN],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
      redirectURI: PUBLIC_AUTH + "/callback/google",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
});
