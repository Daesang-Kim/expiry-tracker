import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import * as ImageManipulator from "expo-image-manipulator";
import { storage } from "../lib/firebase";

const THUMBNAIL_MAX_WIDTH = 480;
const THUMBNAIL_COMPRESS = 0.5;

export interface UploadedThumbnail {
  url: string;
  path: string;
  sizeBytes: number;
}

/** Resizes/compresses a captured photo into a small thumbnail and uploads it. */
export async function uploadItemThumbnail(
  householdId: string,
  itemId: string,
  photoUri: string
): Promise<UploadedThumbnail> {
  const manipulated = await ImageManipulator.manipulateAsync(
    photoUri,
    [{ resize: { width: THUMBNAIL_MAX_WIDTH } }],
    { compress: THUMBNAIL_COMPRESS, format: ImageManipulator.SaveFormat.JPEG }
  );

  const response = await fetch(manipulated.uri);
  const blob = await response.blob();

  const path = `households/${householdId}/items/${itemId}/thumbnail.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  const url = await getDownloadURL(storageRef);

  return { url, path, sizeBytes: blob.size };
}

export async function deleteItemThumbnail(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage, path));
  } catch (err: any) {
    // Already gone — fine to ignore.
    if (err?.code !== "storage/object-not-found") throw err;
  }
}
