import { NextRequest, NextResponse } from "next/server";
import { auth } from "@lib/auth/better-auth";
import prisma from "@lib/prisma";

interface RequestOtpBody {
  email?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestOtpBody = await req.json();
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const admin = await prisma.user.findFirst({
      where: {
        email,
        role: { in: ["SUPER_ADMIN", "MANAGER", "COUNTER"] },
        isActive: true,
      },
      select: {
        email: true,
        name: true,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "No active admin account found for that email" },
        { status: 403 }
      );
    }

    await prisma.authUser.upsert({
      where: { email },
      update: { name: admin.name },
      create: {
        email,
        name: admin.name,
        emailVerified: false,
      },
    });

    await auth.api.sendVerificationOTP({
      body: {
        email,
        type: "sign-in",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OTP request error:", error);
    return NextResponse.json(
      { error: "Unable to send OTP. Check server terminal for OTP code in dev mode." },
      { status: 500 }
    );
  }
}
