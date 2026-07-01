import { NextResponse } from "next/server";
import { deleteApiKey, getApiKeyById, updateApiKey } from "@/lib/localDb";

// GET /api/keys/[id] - Get single key
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const key = await getApiKeyById(id);
    if (!key) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }
    return NextResponse.json({ key });
  } catch (error) {
    console.log("Error fetching key:", error);
    return NextResponse.json({ error: "Failed to fetch key" }, { status: 500 });
  }
}

// PATCH /api/keys/[id] - Update key (partial)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await getApiKeyById(id);
    if (!existing) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    // Build update payload — only include explicitly provided fields
    const updateData = {};
    const updatableFields = [
      "name", "isActive", "allowedModels", "blockedModels",
      "allowedCombos", "scopes", "expiresAt",
      "maxRequestsPerDay", "maxSpendUsdPerDay",
    ];
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await updateApiKey(id, updateData);
    return NextResponse.json({ key: updated });
  } catch (error) {
    console.log("Error updating key:", error);
    return NextResponse.json({ error: "Failed to update key" }, { status: 500 });
  }
}

// PUT /api/keys/[id] - Update key (full replace, backward compat)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await getApiKeyById(id);
    if (!existing) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    const updateData = {};
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.allowedModels !== undefined) updateData.allowedModels = body.allowedModels;
    if (body.blockedModels !== undefined) updateData.blockedModels = body.blockedModels;
    if (body.allowedCombos !== undefined) updateData.allowedCombos = body.allowedCombos;
    if (body.scopes !== undefined) updateData.scopes = body.scopes;
    if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt;
    if (body.maxRequestsPerDay !== undefined) updateData.maxRequestsPerDay = body.maxRequestsPerDay;
    if (body.maxSpendUsdPerDay !== undefined) updateData.maxSpendUsdPerDay = body.maxSpendUsdPerDay;

    const updated = await updateApiKey(id, updateData);
    return NextResponse.json({ key: updated });
  } catch (error) {
    console.log("Error updating key:", error);
    return NextResponse.json({ error: "Failed to update key" }, { status: 500 });
  }
}

// DELETE /api/keys/[id] - Delete API key
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const deleted = await deleteApiKey(id);
    if (!deleted) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Key deleted successfully" });
  } catch (error) {
    console.log("Error deleting key:", error);
    return NextResponse.json({ error: "Failed to delete key" }, { status: 500 });
  }
}
