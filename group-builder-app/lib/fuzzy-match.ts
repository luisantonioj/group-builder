import Fuse from "fuse.js";
import type { Candidate } from "@/types";

export interface MatchResult {
  candidate: Candidate;
  score: number;
}

// Fuzzy-match an inviter name string against a list of existing candidates.
// Returns the best match above the threshold, or null if none found.
export function fuzzyMatchInviter(
  inviterName: string,
  candidates: Candidate[],
  threshold = 0.4
): MatchResult | null {
  if (!inviterName || inviterName.trim().toLowerCase() === "n/a") return null;

  const fuse = new Fuse(candidates, {
    keys: ["fullName", "firstName", "lastName"],
    includeScore: true,
    threshold,
    ignoreLocation: true,
  });

  const results = fuse.search(inviterName);
  if (results.length === 0) return null;

  const best = results[0];
  return {
    candidate: best.item,
    score: 1 - (best.score ?? 1), // Fuse score is 0 = perfect, invert for clarity
  };
}

// Simple name normalisation for comparison
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}
