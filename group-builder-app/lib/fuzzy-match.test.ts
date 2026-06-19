import test, { describe, it } from "node:test";
import assert from "node:assert";
import Fuse from "fuse.js";
import {
  fuzzyMatchInviter,
  normalizeName,
  groupBySharedInviter,
} from "./fuzzy-match";
import type { Candidate } from "../types";

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
] as unknown as Candidate[];

describe("Fuzzy Match Algorithms", () => {
  it("should normalize names correctly by stripping accents and symbols", () => {
    assert.strictEqual(normalizeName("Jérôme O'Connor!"), "jerome oconnor");
    assert.strictEqual(normalizeName("  Maria  Santos  "), "maria santos");
  });

  it("should fuzzy match an inviter name using candidate array", () => {
    const match = fuzzyMatchInviter("Juan C.", candidates, 0.4);
    assert.ok(match);
    assert.strictEqual(match.candidate.id, "c1");
    assert.ok(match.score > 0.5);
  });

  it("should fuzzy match using a pre-configured Fuse index", () => {
    const fuse = new Fuse(candidates, {
      keys: ["fullName", "firstName", "lastName"],
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true,
    });
    const match = fuzzyMatchInviter("Maria S.", fuse, 0.4);
    assert.ok(match);
    assert.strictEqual(match.candidate.id, "c2");
  });

  it("should return null for N/A or empty inviter values", () => {
    assert.strictEqual(fuzzyMatchInviter("N/A", candidates), null);
    assert.strictEqual(fuzzyMatchInviter("", candidates), null);
  });
});
