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

    const stats = await getUsageStats("30d", apiKey.key);
    return NextResponse.json({ usage: stats });
  } catch (error) {
    console.error("[keys/usage] Error fetching usage stats:", error);
    return NextResponse.json({ error: "Failed to fetch usage stats" }, { status: 500 });
  }
}
