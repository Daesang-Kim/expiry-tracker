import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Household } from "../types";

const HOUSEHOLDS = "households";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createHousehold(ownerUid: string, name: string): Promise<Household> {
  const ref = doc(collection(db, HOUSEHOLDS));
  const household: Household = {
    id: ref.id,
    name,
    inviteCode: generateInviteCode(),
    memberIds: [ownerUid],
    createdAt: Date.now(),
  };
  await setDoc(ref, { ...household, createdAt: serverTimestamp() });
  return household;
}

export async function joinHouseholdByInviteCode(uid: string, inviteCode: string): Promise<Household> {
  const q = query(collection(db, HOUSEHOLDS), where("inviteCode", "==", inviteCode.toUpperCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    throw new Error("유효하지 않은 초대 코드예요.");
  }
  const householdDoc = snapshot.docs[0];
  await updateDoc(householdDoc.ref, { memberIds: arrayUnion(uid) });
  const data = householdDoc.data();
  return {
    id: householdDoc.id,
    name: data.name,
    inviteCode: data.inviteCode,
    memberIds: [...data.memberIds, uid],
    createdAt: data.createdAt,
  };
}

export async function getHousehold(householdId: string): Promise<Household | null> {
  const snap = await getDoc(doc(db, HOUSEHOLDS, householdId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    inviteCode: data.inviteCode,
    memberIds: data.memberIds,
    createdAt: data.createdAt,
  };
}
