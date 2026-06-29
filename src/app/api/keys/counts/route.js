import { NextResponse } from "next/server";
import { getRequestCountsByApiKey } from "@/lib/db/index.js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const counts = getRequestCountsByApiKey();
    return NextResponse.json({ counts });
  } catch (error) {
    console.log("Error fetching key counts:", error);
    return NextResponse.json({ error: "Failed to fetch counts" }, { status: 500 });
  }
}
