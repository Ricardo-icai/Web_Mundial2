import { createHash } from "node:crypto";
import prisma from "../config/prisma.js";

function parseDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function summarizeFavorite({ profile, plan }) {
  const snapshotProfile = profile || plan?.profile || {};
  const snapshotPlan = plan || {};
  return {
    mode: snapshotProfile.mode || null,
    originCity: snapshotProfile.originCity || null,
    destinationCity: snapshotProfile.destinationCity || snapshotPlan?.profile?.destinationCity || null,
    departureDate: parseDateOrNull(snapshotProfile.departureDate || snapshotPlan?.profile?.departureDate || null),
    endDate: parseDateOrNull(snapshotProfile.endDate || snapshotPlan?.profile?.endDate || null)
  };
}

function sanitizeFavoriteRecord(record) {
  return {
    id: record.id,
    title: record.title,
    mode: record.mode,
    originCity: record.originCity,
    destinationCity: record.destinationCity,
    departureDate: record.departureDate,
    endDate: record.endDate,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    payload: record.payload
  };
}

export async function upsertFavorite(req, res) {
  const userId = req.auth?.userId;
  const { profile, plan, title = null } = req.body || {};

  if (!userId) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  if (!profile || !plan) {
    return res.status(400).json({ ok: false, error: "profile and plan are required" });
  }

  const payload = { profile, plan };
  const fingerprint = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const summary = summarizeFavorite({ profile, plan });
  const normalizedTitle = (title || "").toString().trim() || `${summary.originCity || "Origen"} a ${summary.destinationCity || "Destino"}`;

  const favorite = await prisma.favoriteItinerary.upsert({
    where: {
      userId_fingerprint: {
        userId,
        fingerprint
      }
    },
    update: {
      title: normalizedTitle,
      payload,
      ...summary
    },
    create: {
      userId,
      fingerprint,
      title: normalizedTitle,
      payload,
      ...summary
    }
  });

  return res.status(201).json({
    ok: true,
    favorite: sanitizeFavoriteRecord(favorite)
  });
}

export async function listFavorites(req, res) {
  const userId = req.auth?.userId;
  if (!userId) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const favorites = await prisma.favoriteItinerary.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });

  return res.json({
    ok: true,
    favorites: favorites.map(sanitizeFavoriteRecord)
  });
}

export async function deleteFavorite(req, res) {
  const userId = req.auth?.userId;
  const { id } = req.params;
  if (!userId) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  if (!id) {
    return res.status(400).json({ ok: false, error: "favorite id is required" });
  }

  const favorite = await prisma.favoriteItinerary.findUnique({ where: { id } });
  if (!favorite || favorite.userId !== userId) {
    return res.status(404).json({ ok: false, error: "favorite not found" });
  }

  await prisma.favoriteItinerary.delete({ where: { id } });
  return res.json({ ok: true });
}
