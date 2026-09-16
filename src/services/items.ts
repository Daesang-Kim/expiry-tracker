import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Item, NotificationOffset } from "../types";

const ITEMS = "items";

export const DEFAULT_NOTIFY_OFFSETS: NotificationOffset[] = [3, 1, 0];

export type NewItem = Omit<Item, "id" | "createdAt" | "updatedAt">;

export async function addItem(item: NewItem): Promise<string> {
  const ref = await addDoc(collection(db, ITEMS), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateItem(itemId: string, changes: Partial<NewItem>): Promise<void> {
  await updateDoc(doc(db, ITEMS, itemId), { ...changes, updatedAt: serverTimestamp() });
}

export async function deleteItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, ITEMS, itemId));
}

/**
 * No `orderBy` here on purpose: expiryDate is optional now, and Firestore's
 * `orderBy` silently drops documents missing that field from the results —
 * quantity-only items (toilet paper, detergent) would vanish from the list.
 * Sorting happens client-side instead, in `compareItemUrgency`.
 */
export function subscribeToHouseholdItems(
  householdId: string,
  onChange: (items: Item[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(collection(db, ITEMS), where("householdId", "==", householdId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Item));
      onChange(items);
    },
    (error) => onError?.(error)
  );
}

export function daysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isLowStock(item: Pick<Item, "quantity" | "lowStockThreshold">): boolean {
  return item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold;
}

/**
 * Low-stock items float to the top (most depleted first), then items with an
 * expiry date sort soonest-first, then everything else (no date, not low) by
 * name. Date-urgency and stock-urgency are different units — rather than
 * merge them into one score, low stock always wins the top slot since running
 * out is usually more time-critical than a later expiry date.
 */
export function compareItemUrgency(a: Item, b: Item): number {
  const aLow = isLowStock(a);
  const bLow = isLowStock(b);
  if (aLow !== bLow) return aLow ? -1 : 1;

  if (aLow && bLow) {
    const aDeficit = a.lowStockThreshold! - a.quantity;
    const bDeficit = b.lowStockThreshold! - b.quantity;
    if (aDeficit !== bDeficit) return bDeficit - aDeficit;
  }

  if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
  if (a.expiryDate) return -1;
  if (b.expiryDate) return 1;
  return a.name.localeCompare(b.name);
}
