export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  householdId: string | null;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  memberIds: string[];
  createdAt: number;
}

export type NotificationOffset = 3 | 1 | 0; // days before expiry (0 = D-day)

export const ITEM_CATEGORIES = ["식품", "생활용품", "화장품", "의약품", "기타"] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export interface Item {
  id: string;
  householdId: string;
  name: string;
  category: string | null;
  /** ISO date (YYYY-MM-DD). Optional — some items (toilet paper, detergent) are tracked by quantity only. */
  expiryDate: string | null;
  quantity: number;
  /** Quantity at or below which the item counts as low stock. Null means quantity isn't tracked as a signal. */
  lowStockThreshold: number | null;
  /** Set once a low-stock push has gone out, so the daily check doesn't repeat it every day. Cleared when restocked. */
  lowStockNotified: boolean;
  /** Download URL of the compressed thumbnail, if the user chose to keep one. */
  photoUrl: string | null;
  /** Storage path for the thumbnail — needed to delete it later. */
  photoPath: string | null;
  /** Thumbnail size in bytes, recorded at upload time for storage-usage reporting. */
  photoSizeBytes: number | null;
  notifyOffsets: NotificationOffset[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}
