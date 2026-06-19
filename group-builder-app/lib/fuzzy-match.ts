import Fuse from "fuse.js";
import type { Candidate } from "@/types";

export interface MatchResult {
  candidate: Candidate;
  score: number;
}

// Fuzzy-match an inviter name string against a list of existing candidates or a pre-configured Fuse index.
// Returns the best match above the threshold, or null if none found.
export function fuzzyMatchInviter(
  inviterName: string,
  candidatesOrFuse: Candidate[] | Fuse<Candidate>,
  threshold = 0.4
): MatchResult | null {
  if (!inviterName || inviterName.trim().toLowerCase() === "n/a") return null;

  let results;
  if (candidatesOrFuse instanceof Fuse) {
    results = candidatesOrFuse.search(inviterName);
  } else {
    const fuse = new Fuse(candidatesOrFuse, {
      keys: ["fullName", "firstName", "lastName"],
      includeScore: true,
      threshold,
      ignoreLocation: true,
    });
    results = fuse.search(inviterName);
  }

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
    .replace(/\s+/g, " ")
    .trim();
}

// Returns true if all words of the shorter name appear in the longer name's word set.
// Requires ≥ 2 words in the shorter to avoid single-word last-name false positives.
// This catches middle-name insertions: "Ariane Cauyan" ↔ "Ariane Mae Cauyan".
function wordsContained(a: string, b: string): boolean {
  const toWords = (s: string) =>
    normalizeName(s).split(/\s+/).filter((w) => w.replace(/[^a-z]/g, "").length >= 2);
  const wa = toWords(a);
  const wb = toWords(b);
  const [smaller, larger] = wa.length <= wb.length ? [wa, new Set(wb)] : [wb, new Set(wa)];
  if (smaller.length < 2) return false;
  return smaller.every((w) => (larger as Set<string>).has(w));
}

// Group candidates by shared inviter name, clustering fuzzy-similar inviter strings together.
// Returns only groups with ≥ 2 candidates (i.e., actual co-invitee pairs/sets).
export function groupBySharedInviter(
  candidates: Candidate[],
  threshold = 0.7
): { canonicalName: string; candidates: Candidate[] }[] {
  const withInviter = candidates.filter(
    (c) => c.inviterName && c.inviterName.trim().toLowerCase() !== "n/a"
  );
  if (withInviter.length < 2) return [];

  const uniqueNames = [...new Set(withInviter.map((c) => c.inviterName!))];
  if (uniqueNames.length === 1) {
    return [{ canonicalName: uniqueNames[0], candidates: withInviter }];
  }

  // Union-Find over inviter name strings
  const parent = new Map<string, string>(uniqueNames.map((n) => [n, n]));
  function find(x: string): string {
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  }
  function union(a: string, b: string) {
    parent.set(find(a), find(b));
  }

  // Pass 1: word-containment — catches middle-name variants without edit-distance penalty
  for (let i = 0; i < uniqueNames.length; i++) {
    for (let j = i + 1; j < uniqueNames.length; j++) {
      if (wordsContained(uniqueNames[i], uniqueNames[j])) {
        union(uniqueNames[i], uniqueNames[j]);
      }
    }
  }

  // Pass 2: fuzzy similarity — catches typos and diacritic/spelling variants
  const fuseNames = uniqueNames.map((n) => ({ name: n }));
  const fuse = new Fuse(fuseNames, {
    keys: ["name"],
    includeScore: true,
    threshold: 1 - threshold, // Fuse: 0 = perfect match; invert our threshold
    ignoreLocation: true,
  });

  for (const name of uniqueNames) {
    const results = fuse.search(name);
    for (const r of results) {
      const score = 1 - (r.score ?? 1);
      if (score >= threshold && r.item.name !== name) {
        union(name, r.item.name);
      }
    }
  }

  // Group candidates by cluster root
  const clusters = new Map<string, { names: Set<string>; candidates: Candidate[] }>();
  for (const c of withInviter) {
    const root = find(c.inviterName!);
    if (!clusters.has(root)) clusters.set(root, { names: new Set(), candidates: [] });
    const cluster = clusters.get(root)!;
    cluster.names.add(c.inviterName!);
    cluster.candidates.push(c);
  }

  // Pick the most complete (most words, then most frequent) name as canonical
  return [...clusters.values()]
    .filter((v) => v.candidates.length >= 2)
    .map((v) => {
      const freq = new Map<string, number>();
      for (const n of v.names) freq.set(n, 0);
      for (const c of v.candidates) freq.set(c.inviterName!, (freq.get(c.inviterName!) ?? 0) + 1);
      // Prefer longer (more complete) names; break ties by frequency
      const canonicalName = [...freq.entries()].sort((a, b) => {
        const wordDiff = b[0].split(/\s+/).length - a[0].split(/\s+/).length;
        return wordDiff !== 0 ? wordDiff : b[1] - a[1];
      })[0][0];
      return { canonicalName, candidates: v.candidates };
    });
}
