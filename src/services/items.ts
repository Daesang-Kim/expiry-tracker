import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
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

export function subscribeToHouseholdItems(
  householdId: string,
  onChange: (items: Item[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, ITEMS),
    where("householdId", "==", householdId),
    orderBy("expiryDate", "asc")
  );
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
