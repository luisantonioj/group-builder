import test, { describe, it } from "node:test";
import assert from "node:assert";
import {
  buildAdjacencyMap,
  areConnected,
  detectGroupConflicts,
  findClusters,
  deriveAutoConnections,
  deriveCoInviteeConnections,
} from "./conflict-detection";
import type { Candidate, Connection } from "../types";

const MOCK_EVENT_ID = "evt-ye19";

const candidates = [
  {
    id: "c1",
    fullName: "Juan Cruz",
    lastName: "Cruz",
    firstName: "Juan",
    gender: "MALE",
    age: 20,
    school: "UP",
    inviterName: "Maria Santos",
    yeBatch: "YE #19",
    eventId: MOCK_EVENT_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isConfirmed: true,
    isPresent: true,
    groupId: null,
    roomId: null,
  },
  {
    id: "c2",
    fullName: "Maria Santos",
    lastName: "Santos",
    firstName: "Maria",
    gender: "FEMALE",
    age: 21,
    school: "UP",
    inviterName: null,
    yeBatch: "YE #19",
    eventId: MOCK_EVENT_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isConfirmed: true,
    isPresent: true,
    groupId: null,
    roomId: null,
  },
  {
    id: "c3",
    fullName: "Pedro Cruz",
    lastName: "Cruz",
    firstName: "Pedro",
    gender: "MALE",
    age: 18,
    school: "UST",
    inviterName: "Maria Santos",
    yeBatch: "YE #19",
    eventId: MOCK_EVENT_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isConfirmed: true,
    isPresent: true,
    groupId: null,
    roomId: null,
  },
] as unknown as Candidate[];

describe("Graph and Conflict Detection Algorithms", () => {
  it("should build correct adjacency map from connections list", () => {
    const connections = [
      {
        id: "conn-1",
        fromId: "c1",
        toId: "c2",
        eventId: MOCK_EVENT_ID,
        relationshipType: "BARKADA",
        source: "MANUAL",
        confirmed: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: "conn-2",
        fromId: "c2",
        toId: "c3",
        eventId: MOCK_EVENT_ID,
        relationshipType: "SIBLING",
        source: "MANUAL",
        confirmed: false, // Should be ignored since confirmed = false
        createdAt: new Date().toISOString(),
      },
    ] as unknown as Connection[];

    const map = buildAdjacencyMap(connections);
    assert.strictEqual(map.get("c1")?.has("c2"), true);
    assert.strictEqual(map.get("c2")?.has("c1"), true);
    assert.strictEqual(map.get("c2")?.has("c3"), false); // Not confirmed
  });

  it("should check if two candidates are directly connected", () => {
    const map = new Map<string, Set<string>>();
    map.set("c1", new Set(["c2"]));
    map.set("c2", new Set(["c1"]));

    assert.strictEqual(areConnected("c1", "c2", map), true);
    assert.strictEqual(areConnected("c2", "c1", map), true);
    assert.strictEqual(areConnected("c1", "c3", map), false);
  });

  it("should detect conflicts in groups", () => {
    const map = new Map<string, Set<string>>();
    map.set("c1", new Set(["c2"]));
    map.set("c2", new Set(["c1"]));

    const groups = [
      {
        id: "grp-1",
        candidates: [candidates[0], candidates[1]], // c1 and c2 (connected)
      },
    ];

    const conflicts = detectGroupConflicts(groups, map);
    assert.strictEqual(conflicts.length, 1);
    assert.strictEqual(conflicts[0].candidateAId, "c1");
    assert.strictEqual(conflicts[0].candidateBId, "c2");
  });

  it("should find connected components (clusters)", () => {
    const map = new Map<string, Set<string>>();
    map.set("c1", new Set(["c2"]));
    map.set("c2", new Set(["c1"]));

    const clusters = findClusters(candidates, map);
    assert.strictEqual(clusters.length, 1);
    assert.strictEqual(clusters[0].length, 2);
    assert.deepStrictEqual(
      clusters[0].map((c) => c.id).sort(),
      ["c1", "c2"]
    );
  });

  it("should derive auto-connections from inviter field", () => {
    // c1 invites c2 ("Maria Santos"), c3 invites c2 ("Maria Santos")
    const autoConns = deriveAutoConnections(candidates);
    assert.strictEqual(autoConns.length, 2);
    assert.strictEqual(autoConns[0].fromId, "c1");
    assert.strictEqual(autoConns[0].toId, "c2");
  });

  it("should derive co-invitee connections for candidates with shared inviter", () => {
    // c1 invites Maria Santos, c3 invites Maria Santos
    // Both share "Maria Santos" as inviter, so they are co-invitees
    const coConns = deriveCoInviteeConnections(candidates);
    assert.strictEqual(coConns.length, 1);
    assert.strictEqual(coConns[0].fromId, "c1");
    assert.strictEqual(coConns[0].toId, "c3");
  });
});
