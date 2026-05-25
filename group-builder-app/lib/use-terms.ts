"use client";

import { useOrg } from "./org-context";

export function useTerms() {
  const { config } = useOrg();
  return {
    candidate:    config.termCandidate,
    group:        config.termGroup,
    event:        config.termEvent,
    shepherd:     config.termShepherd,
    headShepherd: config.termHeadShepherd,
  };
}
