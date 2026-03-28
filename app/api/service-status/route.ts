import { NextResponse } from "next/server";
import { getServiceStatus } from "@/lib/service-status";

export async function GET() {
  return NextResponse.json({ services: getServiceStatus() });
}
