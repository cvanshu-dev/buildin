import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
const secret = process.env.BETTER_AUTH_SECRET;
if (process.env.NODE_ENV === "production" && !secret) {
  throw new Error("BETTER_AUTH_SECRET must be configured in production.");
}
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  appName: "Creator Marketplace",
  baseURL,
  secret: secret || "local-development-only-secret-change-before-production-please",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [baseURL],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    autoSignIn: false,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Creator Marketplace password",
        text: `Hi ${user.name},\n\nUse this link to reset your password. The link is time-limited and can only be used once:\n${url}\n\nIf you did not request this, you can ignore this email.`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your Creator Marketplace email",
        text: `Hi ${user.name},\n\nVerify your email address using this link:\n${url}\n\nThis link expires in one hour.`,
      });
    },
  },
  ...(googleClientId && googleClientSecret
    ? { socialProviders: { google: { clientId: googleClientId, clientSecret: googleClientSecret } } }
    : {}),
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "PENDING", input: false },
      status: { type: "string", required: false, defaultValue: "ACTIVE", input: false },
      onboardingDone: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
});