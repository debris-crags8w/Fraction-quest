/* One learner's progress can be saved from two devices (a phone and a tablet). Each save says which version of the saved
   copy it was made from. A save from an older version would replace lessons the other device finished, so it is
   refused, and the device merges the current copy into its own and saves again (see account.tsx in the web app). */

export type StoredVersion = {
  /** Goes up by one with every save or clear. */
  version: number;
  /** The version the progress was last cleared at (0: never). */
  resetVersion: number;
};

export type SaveDecision =
  | { kind: "save"; nextVersion: number }
  | { kind: "conflict"; clearedSince: boolean };

/** `sent` is the version the device last loaded or saved; an older app sends none and is saved as before. */
export function decideProgressSave(stored: StoredVersion, sent: number | undefined): SaveDecision {
  if (sent === undefined || sent === stored.version) return { kind: "save", nextVersion: stored.version + 1 };
  return { kind: "conflict", clearedSince: stored.resetVersion > sent };
}
