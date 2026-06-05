import type { Candidate, Connection, Conflict } from "@/types";
import { fuzzyMatchInviter, groupBySharedInviter } from "./fuzzy-match";

// Build an adjacency map from a connection list for O(1) lookup.
// Only confirmed connections count as real edges for conflict detection.
export function buildAdjacencyMap(
  connections: Connection[]
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const conn of connections) {
    if (!conn.confirmed) continue;
    if (!map.has(conn.fromId)) map.set(conn.fromId, new Set());
    if (!map.has(conn.toId)) map.set(conn.toId, new Set());
    map.get(conn.fromId)!.add(conn.toId);
    map.get(conn.toId)!.add(conn.fromId); // bidirectional
  }
  return map;
}

// Check if two candidates are directly connected
export function areConnected(
  a: string,
  b: string,
  adjacency: Map<string, Set<string>>
): boolean {
  return adjacency.get(a)?.has(b) ?? false;
}

// Detect all conflicts in a set of groups
export function detectGroupConflicts(
  groups: { id: string; candidates: Candidate[] }[],
  adjacency: Map<string, Set<string>>
): Omit<Conflict, "id" | "createdAt">[] {
  const conflicts: Omit<Conflict, "id" | "createdAt">[] = [];

  for (const group of groups) {
    const members = group.candidates;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (areConnected(members[i].id, members[j].id, adjacency)) {
          conflicts.push({
            candidateAId: members[i].id,
            candidateBId: members[j].id,
            groupId: group.id,
            roomId: null,
            status: "ACTIVE",
            shepherdNote: null,
            dismissedBy: null,
            dismissedAt: null,
            candidateAName: members[i].fullName,
            candidateBName: members[j].fullName,
            location: group.id,
          });
        }
      }
    }
  }

  return conflicts;
}

// Detect all conflicts in a set of rooms
export function detectRoomConflicts(
  rooms: { id: string; candidates: Candidate[] }[],
  adjacency: Map<string, Set<string>>
): Omit<Conflict, "id" | "createdAt">[] {
  const conflicts: Omit<Conflict, "id" | "createdAt">[] = [];

  for (const room of rooms) {
    const members = room.candidates;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (areConnected(members[i].id, members[j].id, adjacency)) {
          conflicts.push({
            candidateAId: members[i].id,
            candidateBId: members[j].id,
            groupId: null,
            roomId: room.id,
            status: "ACTIVE",
            shepherdNote: null,
            dismissedBy: null,
            dismissedAt: null,
            candidateAName: members[i].fullName,
            candidateBName: members[j].fullName,
            location: room.id,
          });
        }
      }
    }
  }

  return conflicts;
}

// Find all connected components (clusters) via DFS
export function findClusters(
  candidates: Candidate[],
  adjacency: Map<string, Set<string>>
): Candidate[][] {
  const visited = new Set<string>();
  const clusters: Candidate[][] = [];
  const candidateMap = new Map(candidates.map((c) => [c.id, c]));

  function dfs(id: string, cluster: Candidate[]) {
    visited.add(id);
    const candidate = candidateMap.get(id);
    if (candidate) cluster.push(candidate);
    const neighbors = adjacency.get(id);
    if (neighbors) {
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId) && candidateMap.has(neighborId)) {
          dfs(neighborId, cluster);
        }
      }
    }
  }

  for (const candidate of candidates) {
    if (!visited.has(candidate.id)) {
      const cluster: Candidate[] = [];
      dfs(candidate.id, cluster);
      if (cluster.length > 1) {
        // Only return actual clusters (size ≥ 2)
        clusters.push(cluster);
      }
    }
  }

  return clusters.sort((a, b) => b.length - a.length);
}

// Derive AUTO connections from candidates' inviterName fields via fuzzy matching.
// For each candidate whose inviterName fuzzy-matches another candidate, creates a
// bidirectional AUTO connection. Deduplicates so A→B and B→A produce one entry.
export function deriveAutoConnections(candidates: Candidate[]): Connection[] {
  const result: Connection[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate.inviterName) continue;
    const others = candidates.filter((c) => c.id !== candidate.id);
    const match = fuzzyMatchInviter(candidate.inviterName, others, 0.4);
    if (!match) continue;

    const [a, b] = [candidate.id, match.candidate.id].sort();
    const key = `${a}:${b}`;
    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      id: `auto-${a}-${b}`,
      fromId: candidate.id,
      toId: match.candidate.id,
      eventId: candidate.eventId,
      relationshipType: "BARKADA",
      source: "AUTO",
      note: `Invited by "${candidate.inviterName}"`,
      confirmed: true,
      createdAt: candidate.createdAt,
      fromName: candidate.fullName,
      toName: match.candidate.fullName,
    });
  }

  return result;
}

// A co-invitee connection is "confirmed" when the canonical inviter name is clearly
// a full name: at least 2 words each with ≥ 3 characters (e.g. "Maria Santos").
// Single-word names ("Santos"), initials ("M. Santos"), or short tokens are unconfirmed.
function isInviterNameComplete(name: string): boolean {
  const words = name.trim().split(/\s+/).filter((w) => w.replace(/[^a-zA-Z]/g, "").length >= 3);
  return words.length >= 2;
}

// Derive AUTO connections between candidates who share the same inviter name.
// Uses fuzzy clustering so "Juan Santos" / "Juan Sants" / "J. Santos" are treated as one group.
// Connections from incomplete inviter names (single word / short tokens) are marked confirmed=false
// and require user confirmation before participating in conflict detection.
export function deriveCoInviteeConnections(candidates: Candidate[]): Connection[] {
  const result: Connection[] = [];
  const seen = new Set<string>();

  const groups = groupBySharedInviter(candidates);
  for (const { canonicalName, candidates: group } of groups) {
    const confirmed = isInviterNameComplete(canonicalName);
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const [a, b] = [group[i].id, group[j].id].sort();
        const key = `${a}:${b}`;
        if (seen.has(key)) continue;
        seen.add(key);

        result.push({
          id: `co-invitee-${a}-${b}`,
          fromId: group[i].id,
          toId: group[j].id,
          eventId: group[i].eventId,
          relationshipType: "CHURCHMATE",
          source: "AUTO",
          note: `Shared inviter: "${canonicalName}"`,
          confirmed,
          createdAt: group[i].createdAt,
          fromName: group[i].fullName,
          toName: group[j].fullName,
        });
      }
    }
  }

  return result;
}

// Helper: Shuffle an array in-place (Fisher-Yates)
function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Auto-distribute candidates into groups, minimising conflicts
export function autoDistribute(
  candidates: Candidate[],
  groups: { id: string; capacity: number; candidates: Candidate[] }[],
  adjacency: Map<string, Set<string>>
): Map<string, string> {
  // Returns a Map of candidateId → groupId
  const assignments = new Map<string, string>();

  // Sort candidates by connection degree descending (high-conflict first)
  // For candidates with the same degree, randomize their order.
  const sorted = [...candidates].sort((a, b) => {
    const degreeA = adjacency.get(a.id)?.size ?? 0;
    const degreeB = adjacency.get(b.id)?.size ?? 0;
    if (degreeA !== degreeB) return degreeB - degreeA;
    return Math.random() - 0.5; // Randomise ties
  });

  // Track current member sets for conflict checking
  const groupMembers = new Map<string, Set<string>>(
    groups.map((g) => [g.id, new Set(g.candidates.map((c) => c.id))])
  );

  for (const candidate of sorted) {
    // Find the group with fewest conflicts and most remaining space
    let bestGroupId: string | null = null;
    let bestScore = Infinity;

    // Shuffle groups to randomize tie-breaking when scores are identical
    const shuffledGroups = shuffle([...groups]);

    for (const group of shuffledGroups) {
      const members = groupMembers.get(group.id)!;
      if (members.size >= group.capacity) continue;

      // Count conflicts this candidate would create in this group
      let conflictCount = 0;
      for (const memberId of members) {
        if (areConnected(candidate.id, memberId, adjacency)) conflictCount++;
      }

      // Preference score: conflicts are primary (weight 100), size is secondary.
      const score = conflictCount * 100 + members.size;
      if (score < bestScore) {
        bestScore = score;
        bestGroupId = group.id;
      }
    }

    if (bestGroupId) {
      assignments.set(candidate.id, bestGroupId);
      groupMembers.get(bestGroupId)!.add(candidate.id);
    }
  }

  return assignments;
}
