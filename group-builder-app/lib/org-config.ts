import { prisma } from "./prisma";
import { BLD_CONFIG, GENERIC_CONFIG } from "./org-defaults";
import type { OrgConfig } from "@/types";

export { BLD_CONFIG, GENERIC_CONFIG };

// Merge DB overrides on top of the appropriate base config
export function resolveConfig(
  dbConfig: Partial<OrgConfig> | null,
  isBld: boolean
): OrgConfig {
  const base = isBld ? BLD_CONFIG : GENERIC_CONFIG;
  if (!dbConfig) return base;
  return {
    ...base,
    ...dbConfig,
    features: { ...base.features, ...((dbConfig.features as object) ?? {}) },
  };
}

// Fetches org config from DB, falls back to appropriate defaults
export async function getOrgConfig(orgId: string, isBld: boolean): Promise<OrgConfig> {
  try {
    const dbConfig = await prisma.orgConfig.findUnique({ where: { orgId } });
    return resolveConfig(dbConfig as Partial<OrgConfig> | null, isBld);
  } catch {
    return isBld ? BLD_CONFIG : GENERIC_CONFIG;
  }
}
