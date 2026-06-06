import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import prisma from "@lib/prisma";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : [],
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  user: {
    modelName: "authUser",
  },
  session: {
    modelName: "authSession",
  },
  account: {
    modelName: "authAccount",
  },
  verification: {
    modelName: "authVerification",
  },
  plugins: [
    emailOTP({
      disableSignUp: true,
      otpLength: 6,
      expiresIn: 5 * 60,
      storeOTP: "hashed",
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in") return;

        if (!resend) {
          console.warn(`=== DEVELOPMENT MODE === OTP for ${email}: ${otp}`);
          throw new Error("RESEND_API_KEY is not configured.");
        }

        const { error } = await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ||
            "POS Admin <onboarding@resend.dev>",
          to: email,
          subject: "Your POS Admin login code",
          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
              <p>Your POS Admin login code is:</p>
              <p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p>
              <p>This code expires in 5 minutes.</p>
            </div>
          `,
          text: `Your POS Admin login code is ${otp}. It expires in 5 minutes.`,
        });

        if (error) {
          console.warn(`=== DEVELOPMENT MODE === OTP for ${email}: ${otp}`);
          throw new Error(`Resend failed to send OTP: ${error.message}`);
        }
      },
    }),
  ],
});
