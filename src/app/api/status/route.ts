import { NextResponse } from "next/server";
import { getConnectorStatus } from "@/lib/supabase";

export async function GET() {
  return NextResponse.json(getConnectorStatus());
}
