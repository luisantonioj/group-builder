// ─── Core Domain Types ────────────────────────────────────────────────────────

export type Role = "ADMIN" | "SHEPHERD" | "VIEWER";
export type Gender = "MALE" | "FEMALE";
export type RoomGender = "MALE" | "FEMALE" | "MIXED";
export type RelationshipType =
  | "CLASSMATE"
  | "SIBLING"
  | "FAMILY"
  | "CHURCHMATE"
  | "BARKADA"
  | "OTHER";
export type ConnectionSource = "AUTO" | "MANUAL";
export type ConflictStatus = "ACTIVE" | "DISMISSED";

// ─── Organization ─────────────────────────────────────────────────────────────

export interface OrgFeatures {
  roomAssignment: boolean;
  visualizer: boolean;
  importExcel: boolean;
}

export interface OrgConfig {
  termCandidate: string;
  termGroup: string;
  termEvent: string;
  termShepherd: string;
  termHeadShepherd: string;
  features: OrgFeatures;
  primaryColor: string | null;
  logoUrl: string | null;
}

export interface OrgContext {
  orgId: string;
  orgSlug: string;
  orgName: string;
  isBld: boolean;
  config: OrgConfig;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  orgId: string;
  orgSlug: string;
  orgName: string;
  isBldOrg: boolean;
}

// ─── Event ────────────────────────────────────────────────────────────────────

export interface Event {
  id: string;
  name: string;
  isActive: boolean;
  featureVisualizer: boolean;
  featureRoomAssignment: boolean;
  createdAt: string;
}

// ─── Candidate ────────────────────────────────────────────────────────────────
// When returned from the API, encrypted fields are decrypted server-side.
// The client always works with plain values.

export interface Candidate {
  id: string;
  timestamp: string;
  fullName: string;
  lastName: string;
  firstName: string;
  gender: Gender;
  age: number | null;
  school: string | null;
  inviterName: string | null;
  howHeard: string | null;
  yeBatch: string;
  // Decrypted PII (null = not provided)
  birthday: string | null;
  address: string | null;
  facebook: string | null;
  contact: string | null;
  fatherName: string | null;
  fatherContact: string | null;
  motherName: string | null;
  motherContact: string | null;
  allergies: string | null;
  shepherdNotes: string | null;
  isConfirmed: boolean;
  // Assignments
  groupId: string | null;
  roomId: string | null;
  eventId: string;
  createdAt: string;
  updatedAt: string;
  isPresent: boolean;
}

export type CandidateFormData = Omit<
  Candidate,
  "id" | "timestamp" | "createdAt" | "updatedAt"
>;

// ─── Connection ───────────────────────────────────────────────────────────────

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  eventId: string;
  relationshipType: RelationshipType;
  source: ConnectionSource;
  note: string | null;
  confirmed: boolean;
  createdAt: string;
  // Populated on fetch
  fromName?: string;
  toName?: string;
}

// ─── Group ────────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  label: string | null;
  capacity: number;
  order: number;
  isLocked: boolean;
  eventId: string;
  candidates?: Candidate[];
  conflictCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Room ─────────────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  name: string;
  floor: string | null;
  building: string | null;
  capacity: number;
  bedCount: number;
  gender: RoomGender;
  eventId: string;
  candidates?: Candidate[];
  conflictCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Conflict ─────────────────────────────────────────────────────────────────

export interface Conflict {
  id: string;
  candidateAId: string;
  candidateBId: string;
  groupId: string | null;
  roomId: string | null;
  status: ConflictStatus;
  shepherdNote: string | null;
  dismissedBy: string | null;
  dismissedAt: string | null;
  createdAt: string;
  // Populated
  candidateAName?: string;
  candidateBName?: string;
  relationshipType?: RelationshipType;
  location?: string;
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  createdAt: string;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalCandidates: number;
  maleCount: number;
  femaleCount: number;
  groupsFormed: number;
  totalGroups: number;
  roomsAssigned: number;
  totalRooms: number;
  activeConflicts: number;
  recentActivities: Activity[];
  ageDistribution: { label: string; count: number }[];
}

// ─── Graph / Visualizer ───────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  gender: Gender;
  degree: number; // connection count
  groupId: string | null;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  isConflict: boolean;
}

export interface Cluster {
  id: string;
  members: Candidate[];
  connectionCount: number;
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ImportRow {
  fullName?: string;
  age?: number | string;
  birthday?: string;
  gender?: string;
  contact?: string;
  inviterName?: string;
  school?: string;
  address?: string;
  facebook?: string;
  howHeard?: string;
  fatherName?: string;
  fatherContact?: string;
  motherName?: string;
  motherContact?: string;
  allergies?: string;
  [key: string]: unknown;
}

export interface ColumnMapping {
  [systemField: string]: string; // system field → uploaded column header
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
