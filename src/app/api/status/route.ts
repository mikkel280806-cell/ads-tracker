import { connection, NextResponse } from "next/server";
import { getConnectorStatus } from "@/lib/supabase";

export async function GET() {
  await connection();
  return NextResponse.json(getConnectorStatus());
}
