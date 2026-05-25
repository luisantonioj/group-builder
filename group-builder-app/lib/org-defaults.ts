import type { OrgConfig } from "@/types";

export const BLD_CONFIG: OrgConfig = {
  termCandidate:    "Lamb",
  termGroup:        "Kordero",
  termEvent:        "YE Batch",
  termShepherd:     "Shepherd",
  termHeadShepherd: "Head Shepherd",
  features: {
    roomAssignment: true,
    visualizer:     true,
    importExcel:    true,
  },
  primaryColor: null,
  logoUrl:      null,
};

export const GENERIC_CONFIG: OrgConfig = {
  termCandidate:    "Participant",
  termGroup:        "Group",
  termEvent:        "Event",
  termShepherd:     "Facilitator",
  termHeadShepherd: "Admin",
  features: {
    roomAssignment: true,
    visualizer:     true,
    importExcel:    true,
  },
  primaryColor: null,
  logoUrl:      null,
};
