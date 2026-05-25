"use client";

import { useOrg } from "./org-context";

export function useTerms() {
  const { config } = useOrg();
  return {
    candidate:    config.termCandidate,
    group:        config.termGroup,
    batch:        config.termBatch,
    shepherd:     config.termShepherd,
    headShepherd: config.termHeadShepherd,
  };
}
