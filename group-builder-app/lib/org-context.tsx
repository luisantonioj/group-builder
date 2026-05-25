"use client";

import { createContext, useContext } from "react";
import type { OrgContext } from "@/types";
import { GENERIC_CONFIG } from "./org-defaults";

const defaultContext: OrgContext = {
  orgId:   "org-bld",
  orgSlug: "bld-youth-ministry",
  orgName: "BLD Youth Ministry",
  isBld:   true,
  config:  GENERIC_CONFIG,
};

const OrgContextObj = createContext<OrgContext>(defaultContext);

export function OrgProvider({
  org,
  children,
}: {
  org: OrgContext;
  children: React.ReactNode;
}) {
  return <OrgContextObj.Provider value={org}>{children}</OrgContextObj.Provider>;
}

export function useOrg(): OrgContext {
  return useContext(OrgContextObj);
}
