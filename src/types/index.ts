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

export interface Item {
  id: string;
  householdId: string;
  name: string;
  category: string | null;
  expiryDate: string; // ISO date (YYYY-MM-DD)
  quantity: number;
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
