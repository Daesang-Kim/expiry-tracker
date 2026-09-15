import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { deleteItemThumbnail } from "./storage";
import { daysUntilExpiry } from "./items";
import type { Item } from "../types";

export const DEFAULT_PHOTO_RETENTION_DAYS = 30;

export interface StorageUsage {
  photoCount: number;
  totalBytes: number;
  /** Thumbnails already past the retention window — ready to be purged. */
  staleCount: number;
  staleBytes: number;
}

export async function getHouseholdStorageUsage(
  householdId: string,
  retentionDays = DEFAULT_PHOTO_RETENTION_DAYS
): Promise<StorageUsage> {
  const items = await getItemsWithPhotos(householdId);
  const usage: StorageUsage = { photoCount: 0, totalBytes: 0, staleCount: 0, staleBytes: 0 };

  for (const item of items) {
    const size = item.photoSizeBytes ?? 0;
    usage.photoCount += 1;
    usage.totalBytes += size;
    if (-daysUntilExpiry(item.expiryDate) >= retentionDays) {
      usage.staleCount += 1;
      usage.staleBytes += size;
    }
  }
  return usage;
}

/** Deletes thumbnails for items whose expiry date is older than the retention window. */
export async function purgeExpiredPhotos(
  householdId: string,
  retentionDays = DEFAULT_PHOTO_RETENTION_DAYS
): Promise<number> {
  const items = await getItemsWithPhotos(householdId);
  let purged = 0;

  for (const item of items) {
    if (-daysUntilExpiry(item.expiryDate) < retentionDays) continue;
    if (!item.photoPath) continue;
    await deleteItemThumbnail(item.photoPath);
    await updateDoc(doc(db, "items", item.id), {
      photoUrl: null,
      photoPath: null,
      photoSizeBytes: null,
    });
    purged += 1;
  }
  return purged;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function getItemsWithPhotos(householdId: string): Promise<Item[]> {
  const q = query(
    collection(db, "items"),
    where("householdId", "==", householdId),
    where("photoPath", "!=", null)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
}
