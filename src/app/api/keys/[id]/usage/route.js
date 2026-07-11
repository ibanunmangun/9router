import { NextResponse } from "next/server";
import { getApiKeyById } from "@/lib/localDb";
import { getUsageStats } from "@/lib/db/repos/usageRepo.js";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const apiKey = await getApiKeyById(id);
    if (!apiKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") || "today";
    const allowedPeriods = ["today", "7d", "30d"];
    const period = allowedPeriods.includes(periodParam) ? periodParam : "today";

    const stats = await getUsageStats(period, apiKey.key);
    return NextResponse.json({ usage: stats });
  } catch (error) {
    console.error("[keys/usage] Error fetching usage stats:", error);
    return NextResponse.json({ error: "Failed to fetch usage stats" }, { status: 500 });
  }
}
