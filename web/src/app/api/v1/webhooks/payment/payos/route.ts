import { NextRequest, NextResponse } from "next/server";
import { handlePayOSWebhook } from "@/services/payment.service";
import type { PayOSWebhookBody } from "@/lib/payments/payos";

export async function POST(req: NextRequest) {
  let body: PayOSWebhookBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: "99", desc: "Invalid JSON" }, { status: 400 });
  }

  try {
    await handlePayOSWebhook(body);
    return NextResponse.json({ code: "00", desc: "success" });
  } catch (e) {
    console.error("[PayOS webhook]", e);
    return NextResponse.json({ code: "99", desc: "Error" }, { status: 500 });
  }
}
