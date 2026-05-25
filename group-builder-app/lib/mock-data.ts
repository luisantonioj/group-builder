// Mock data matching the mockup's data.js — used when DB is not connected.
// Mirrors the same candidates, connections, groups, rooms as the original mockup.

import type { Candidate, Connection, Group, Room, Activity, Event } from "@/types";

export const MOCK_EVENT: Event = {
  id: "batch-ye19",
  name: "YE #19",
  isActive: true,
  featureVisualizer: true,
  featureRoomAssignment: true,
  createdAt: "2026-04-01T00:00:00.000Z",
};

export const MOCK_CANDIDATES: Candidate[] = [
  // DLSL cluster
  { id: "c01", timestamp: "2026-04-10T08:12:00Z", fullName: "Santos, Patricia", lastName: "Santos", firstName: "Patricia", gender: "FEMALE", age: 18, school: "De La Salle Lipa", inviterName: "Dianne Aquino", howHeard: "Invited by friend", yeBatch: "YE #19", birthday: "2008-03-15", address: "Lipa City, Batangas", facebook: "patricia.santos", contact: "09171234501", fatherName: "Jose Santos", fatherContact: "09171234500", motherName: "Maria Santos", motherContact: "09171234499", allergies: null, shepherdNotes: null, groupId: "g1", roomId: "r4", eventId: "batch-ye19", createdAt: "2026-04-10T08:12:00Z", updatedAt: "2026-04-10T08:12:00Z" },
  { id: "c02", timestamp: "2026-04-10T08:15:00Z", fullName: "Reyes, Joaquin", lastName: "Reyes", firstName: "Joaquin", gender: "MALE", age: 17, school: "De La Salle Lipa", inviterName: "Rafael Cruz", howHeard: "Social media", yeBatch: "YE #19", birthday: "2008-09-22", address: "Malvar, Batangas", facebook: "joaquin.reyes", contact: "09181234502", fatherName: "Pedro Reyes", fatherContact: "09181234501", motherName: "Clara Reyes", motherContact: "09181234500", allergies: "Nuts", shepherdNotes: null, groupId: "g1", roomId: "r1", eventId: "batch-ye19", createdAt: "2026-04-10T08:15:00Z", updatedAt: "2026-04-10T08:15:00Z" },
  { id: "c03", timestamp: "2026-04-10T08:20:00Z", fullName: "Torres, Ana Liza", lastName: "Torres", firstName: "Ana Liza", gender: "FEMALE", age: 18, school: "De La Salle Lipa", inviterName: "Patricia Santos", howHeard: "Classmate", yeBatch: "YE #19", birthday: "2007-11-05", address: "Lipa City, Batangas", facebook: "analiza.torres", contact: "09191234503", fatherName: null, fatherContact: null, motherName: "Linda Torres", motherContact: "09191234502", allergies: null, shepherdNotes: null, groupId: "g2", roomId: "r4", eventId: "batch-ye19", createdAt: "2026-04-10T08:20:00Z", updatedAt: "2026-04-10T08:20:00Z" },
  { id: "c04", timestamp: "2026-04-10T08:25:00Z", fullName: "Cruz, Rafael", lastName: "Cruz", firstName: "Rafael", gender: "MALE", age: 18, school: "De La Salle Lipa", inviterName: "Joaquin Reyes", howHeard: "Classmate", yeBatch: "YE #19", birthday: "2007-06-18", address: "Batangas City", facebook: "rafael.cruz", contact: "09201234504", fatherName: "Ernesto Cruz", fatherContact: "09201234503", motherName: "Nora Cruz", motherContact: "09201234502", allergies: null, shepherdNotes: null, groupId: "g3", roomId: "r1", eventId: "batch-ye19", createdAt: "2026-04-10T08:25:00Z", updatedAt: "2026-04-10T08:25:00Z" },
  // Aquino siblings
  { id: "c05", timestamp: "2026-04-10T09:00:00Z", fullName: "Aquino, Dianne", lastName: "Aquino", firstName: "Dianne", gender: "FEMALE", age: 19, school: "University of Batangas", inviterName: "Mark Aquino", howHeard: "Family", yeBatch: "YE #19", birthday: "2006-12-01", address: "Santo Tomas, Batangas", facebook: "dianne.aquino", contact: "09211234505", fatherName: "Ramon Aquino", fatherContact: "09211234504", motherName: "Tessie Aquino", motherContact: "09211234503", allergies: null, shepherdNotes: null, groupId: "g2", roomId: "r5", eventId: "batch-ye19", createdAt: "2026-04-10T09:00:00Z", updatedAt: "2026-04-10T09:00:00Z" },
  { id: "c47", timestamp: "2026-04-10T09:05:00Z", fullName: "Aquino, Mark", lastName: "Aquino", firstName: "Mark", gender: "MALE", age: 17, school: "University of Batangas", inviterName: "Dianne Aquino", howHeard: "Family", yeBatch: "YE #19", birthday: "2008-07-14", address: "Santo Tomas, Batangas", facebook: "mark.aquino", contact: "09221234547", fatherName: "Ramon Aquino", fatherContact: "09221234504", motherName: "Tessie Aquino", motherContact: "09221234503", allergies: "Seafood", shepherdNotes: "Siblings with Dianne - do not group together", groupId: "g3", roomId: "r2", eventId: "batch-ye19", createdAt: "2026-04-10T09:05:00Z", updatedAt: "2026-04-10T09:05:00Z" },
  // Church choir cluster
  { id: "c06", timestamp: "2026-04-10T09:30:00Z", fullName: "Garcia, Miguel", lastName: "Garcia", firstName: "Miguel", gender: "MALE", age: 18, school: "STI Lipa", inviterName: "BLD Youth Ministry", howHeard: "Church", yeBatch: "YE #19", birthday: "2007-04-20", address: "Lipa City, Batangas", facebook: "miguel.garcia", contact: "09231234506", fatherName: "Andres Garcia", fatherContact: "09231234505", motherName: "Rosario Garcia", motherContact: "09231234504", allergies: null, shepherdNotes: null, groupId: "g1", roomId: "r2", eventId: "batch-ye19", createdAt: "2026-04-10T09:30:00Z", updatedAt: "2026-04-10T09:30:00Z" },
  { id: "c07", timestamp: "2026-04-10T09:35:00Z", fullName: "Mendoza, Lovely", lastName: "Mendoza", firstName: "Lovely", gender: "FEMALE", age: 20, school: "Batangas State University", inviterName: "Miguel Garcia", howHeard: "Church choir", yeBatch: "YE #19", birthday: "2005-08-30", address: "Tanauan, Batangas", facebook: "lovely.mendoza", contact: "09241234507", fatherName: "Ricky Mendoza", fatherContact: "09241234506", motherName: "Grace Mendoza", motherContact: "09241234505", allergies: null, shepherdNotes: null, groupId: "g2", roomId: "r5", eventId: "batch-ye19", createdAt: "2026-04-10T09:35:00Z", updatedAt: "2026-04-10T09:35:00Z" },
  // BPO friends
  { id: "c08", timestamp: "2026-04-10T10:00:00Z", fullName: "Villanueva, Jerome", lastName: "Villanueva", firstName: "Jerome", gender: "MALE", age: 22, school: "Accenture Lipa", inviterName: "Cathleen Ramos", howHeard: "Officemate", yeBatch: "YE #19", birthday: "2003-01-17", address: "Batangas City", facebook: "jerome.villanueva", contact: "09251234508", fatherName: "Bobby Villanueva", fatherContact: "09251234507", motherName: "Cora Villanueva", motherContact: "09251234506", allergies: null, shepherdNotes: null, groupId: "g3", roomId: "r3", eventId: "batch-ye19", createdAt: "2026-04-10T10:00:00Z", updatedAt: "2026-04-10T10:00:00Z" },
  { id: "c09", timestamp: "2026-04-10T10:05:00Z", fullName: "Ramos, Cathleen", lastName: "Ramos", firstName: "Cathleen", gender: "FEMALE", age: 21, school: "Accenture Lipa", inviterName: "Jerome Villanueva", howHeard: "Officemate", yeBatch: "YE #19", birthday: "2004-05-25", address: "Sto. Tomas, Batangas", facebook: "cathleen.ramos", contact: "09261234509", fatherName: "Noel Ramos", fatherContact: "09261234508", motherName: "Mila Ramos", motherContact: "09261234507", allergies: "Shrimp", shepherdNotes: null, groupId: "g4", roomId: "r6", eventId: "batch-ye19", createdAt: "2026-04-10T10:05:00Z", updatedAt: "2026-04-10T10:05:00Z" },
  // Unassigned candidates
  { id: "c10", timestamp: "2026-04-11T08:00:00Z", fullName: "Dela Cruz, Lourdes", lastName: "Dela Cruz", firstName: "Lourdes", gender: "FEMALE", age: 17, school: "Canossa College", inviterName: null, howHeard: "Instagram", yeBatch: "YE #19", birthday: "2008-10-03", address: "Lipa City, Batangas", facebook: null, contact: "09271234510", fatherName: "Manuel Dela Cruz", fatherContact: "09271234509", motherName: "Norma Dela Cruz", motherContact: "09271234508", allergies: null, shepherdNotes: null, groupId: null, roomId: null, eventId: "batch-ye19", createdAt: "2026-04-11T08:00:00Z", updatedAt: "2026-04-11T08:00:00Z" },
  { id: "c11", timestamp: "2026-04-11T08:30:00Z", fullName: "Fernandez, Carlo", lastName: "Fernandez", firstName: "Carlo", gender: "MALE", age: 18, school: "FEU Lipa", inviterName: "Lovely Mendoza", howHeard: "Friend", yeBatch: "YE #19", birthday: "2007-02-28", address: "Lipa City, Batangas", facebook: "carlo.fernandez", contact: "09281234511", fatherName: "Dante Fernandez", fatherContact: "09281234510", motherName: "Celia Fernandez", motherContact: "09281234509", allergies: null, shepherdNotes: null, groupId: null, roomId: null, eventId: "batch-ye19", createdAt: "2026-04-11T08:30:00Z", updatedAt: "2026-04-11T08:30:00Z" },
  { id: "c12", timestamp: "2026-04-11T09:00:00Z", fullName: "Bautista, Nina", lastName: "Bautista", firstName: "Nina", gender: "FEMALE", age: 19, school: "Ateneo de Manila", inviterName: null, howHeard: "YouTube", yeBatch: "YE #19", birthday: "2006-07-11", address: "Calamba, Laguna", facebook: "nina.bautista", contact: "09291234512", fatherName: "Felix Bautista", fatherContact: "09291234511", motherName: "Joy Bautista", motherContact: "09291234510", allergies: "Lactose", shepherdNotes: null, groupId: null, roomId: null, eventId: "batch-ye19", createdAt: "2026-04-11T09:00:00Z", updatedAt: "2026-04-11T09:00:00Z" },
  { id: "c13", timestamp: "2026-04-11T09:30:00Z", fullName: "Ocampo, Ryan", lastName: "Ocampo", firstName: "Ryan", gender: "MALE", age: 20, school: "PUP Sto. Tomas", inviterName: "Carlo Fernandez", howHeard: "Friend", yeBatch: "YE #19", birthday: "2005-12-08", address: "Sto. Tomas, Batangas", facebook: "ryan.ocampo", contact: "09301234513", fatherName: "Ben Ocampo", fatherContact: "09301234512", motherName: "Lydia Ocampo", motherContact: "09301234511", allergies: null, shepherdNotes: null, groupId: null, roomId: null, eventId: "batch-ye19", createdAt: "2026-04-11T09:30:00Z", updatedAt: "2026-04-11T09:30:00Z" },
  { id: "c14", timestamp: "2026-04-11T10:00:00Z", fullName: "Soriano, Alexa", lastName: "Soriano", firstName: "Alexa", gender: "FEMALE", age: 17, school: "De La Salle Lipa", inviterName: "Patricia Santos", howHeard: "Classmate", yeBatch: "YE #19", birthday: "2008-05-19", address: "Lipa City, Batangas", facebook: null, contact: "09311234514", fatherName: "Tony Soriano", fatherContact: "09311234513", motherName: "Edna Soriano", motherContact: "09311234512", allergies: null, shepherdNotes: null, groupId: null, roomId: null, eventId: "batch-ye19", createdAt: "2026-04-11T10:00:00Z", updatedAt: "2026-04-11T10:00:00Z" },
];

export const MOCK_CONNECTIONS: Connection[] = [
  // c01 ↔ c47 (siblings: Patricia Santos & Mark Aquino via Dianne)
  { id: "conn1", fromId: "c01", toId: "c47", relationshipType: "BARKADA", source: "AUTO", note: "Same inviter chain", createdAt: "2026-04-10T08:12:00Z", fromName: "Santos, Patricia", toName: "Aquino, Mark" },
  // c02 ↔ c04 (classmates DLSL)
  { id: "conn2", fromId: "c02", toId: "c04", relationshipType: "CLASSMATE", source: "AUTO", note: "Both invited each other", createdAt: "2026-04-10T08:15:00Z", fromName: "Reyes, Joaquin", toName: "Cruz, Rafael" },
  // c01 ↔ c03 (classmates DLSL)
  { id: "conn3", fromId: "c01", toId: "c03", relationshipType: "CLASSMATE", source: "AUTO", note: "Classmates at DLSL", createdAt: "2026-04-10T08:20:00Z", fromName: "Santos, Patricia", toName: "Torres, Ana Liza" },
  // c01 ↔ c14 (classmates via Patricia's inviter)
  { id: "conn4", fromId: "c01", toId: "c14", relationshipType: "CLASSMATE", source: "AUTO", note: "Alexa was invited by Patricia", createdAt: "2026-04-11T10:00:00Z", fromName: "Santos, Patricia", toName: "Soriano, Alexa" },
  // c05 ↔ c47 (siblings)
  { id: "conn5", fromId: "c05", toId: "c47", relationshipType: "SIBLING", source: "MANUAL", note: "Confirmed siblings", createdAt: "2026-04-10T09:00:00Z", fromName: "Aquino, Dianne", toName: "Aquino, Mark" },
  // c06 ↔ c07 (churchmates, choir)
  { id: "conn6", fromId: "c06", toId: "c07", relationshipType: "CHURCHMATE", source: "AUTO", note: "Choir bandmates at BLD Lipa", createdAt: "2026-04-10T09:30:00Z", fromName: "Garcia, Miguel", toName: "Mendoza, Lovely" },
  // c08 ↔ c09 (workmates BPO)
  { id: "conn7", fromId: "c08", toId: "c09", relationshipType: "BARKADA", source: "AUTO", note: "Colleagues at Accenture", createdAt: "2026-04-10T10:00:00Z", fromName: "Villanueva, Jerome", toName: "Ramos, Cathleen" },
  // c07 ↔ c11 (Lovely invited Carlo)
  { id: "conn8", fromId: "c07", toId: "c11", relationshipType: "BARKADA", source: "AUTO", note: "Carlo invited by Lovely", createdAt: "2026-04-11T08:30:00Z", fromName: "Mendoza, Lovely", toName: "Fernandez, Carlo" },
  // c11 ↔ c13 (Carlo invited Ryan)
  { id: "conn9", fromId: "c11", toId: "c13", relationshipType: "BARKADA", source: "AUTO", note: "Ryan invited by Carlo", createdAt: "2026-04-11T09:30:00Z", fromName: "Fernandez, Carlo", toName: "Ocampo, Ryan" },
];

export const MOCK_GROUPS: Group[] = [
  { id: "g1", name: "Kordero 1", label: null, capacity: 12, isLocked: false, eventId: "batch-ye19", createdAt: "2026-04-15T10:00:00Z", updatedAt: "2026-04-15T10:00:00Z" },
  { id: "g2", name: "Kordero 2", label: null, capacity: 12, isLocked: false, eventId: "batch-ye19", createdAt: "2026-04-15T10:00:00Z", updatedAt: "2026-04-15T10:00:00Z" },
  { id: "g3", name: "Kordero 3", label: null, capacity: 12, isLocked: false, eventId: "batch-ye19", createdAt: "2026-04-15T10:00:00Z", updatedAt: "2026-04-15T10:00:00Z" },
  { id: "g4", name: "Kordero 4", label: null, capacity: 12, isLocked: false, eventId: "batch-ye19", createdAt: "2026-04-15T10:00:00Z", updatedAt: "2026-04-15T10:00:00Z" },
];

export const MOCK_ROOMS: Room[] = [
  { id: "r1", name: "Upper Room A", floor: "2nd Floor", building: "Main Building", capacity: 8, bedCount: 8, gender: "MALE", eventId: "batch-ye19", createdAt: "2026-04-15T10:00:00Z", updatedAt: "2026-04-15T10:00:00Z" },
  { id: "r2", name: "Upper Room B", floor: "2nd Floor", building: "Main Building", capacity: 8, bedCount: 8, gender: "MALE", eventId: "batch-ye19", createdAt: "2026-04-15T10:00:00Z", updatedAt: "2026-04-15T10:00:00Z" },
  { id: "r3", name: "Garden Room", floor: "Ground Floor", building: "Annex", capacity: 6, bedCount: 6, gender: "MALE", eventId: "batch-ye19", createdAt: "2026-04-15T10:00:00Z", updatedAt: "2026-04-15T10:00:00Z" },
  { id: "r4", name: "Cana Hall", floor: "3rd Floor", building: "Main Building", capacity: 8, bedCount: 8, gender: "FEMALE", eventId: "batch-ye19", createdAt: "2026-04-15T10:00:00Z", updatedAt: "2026-04-15T10:00:00Z" },
  { id: "r5", name: "Bethany Hall", floor: "3rd Floor", building: "Main Building", capacity: 8, bedCount: 8, gender: "FEMALE", eventId: "batch-ye19", createdAt: "2026-04-15T10:00:00Z", updatedAt: "2026-04-15T10:00:00Z" },
  { id: "r6", name: "Magdalene Hall", floor: "4th Floor", building: "Main Building", capacity: 6, bedCount: 6, gender: "FEMALE", eventId: "batch-ye19", createdAt: "2026-04-15T10:00:00Z", updatedAt: "2026-04-15T10:00:00Z" },
];

export const MOCK_ACTIVITIES: Activity[] = [
  { id: "act1", userId: "demo-admin", userName: "Ate Joan Reyes", action: "imported", entityType: "candidate", entityId: null, description: "Imported 15 candidates from YE #19 registration sheet", createdAt: "2026-05-10T09:00:00Z" },
  { id: "act2", userId: "demo-admin", userName: "Ate Joan Reyes", action: "created", entityType: "connection", entityId: "conn5", description: "Manually added sibling connection: Dianne ↔ Mark Aquino", createdAt: "2026-05-10T09:30:00Z" },
  { id: "act3", userId: "demo-admin", userName: "Ate Joan Reyes", action: "assigned", entityType: "group", entityId: "g1", description: "Assigned Patricia Santos, Joaquin Reyes, Miguel Garcia to Kordero 1", createdAt: "2026-05-11T10:00:00Z" },
  { id: "act4", userId: "demo-admin", userName: "Bro. Ramon Cruz", action: "assigned", entityType: "room", entityId: "r1", description: "Assigned Joaquin Reyes and Rafael Cruz to Upper Room A", createdAt: "2026-05-11T10:30:00Z" },
  { id: "act5", userId: "demo-admin", userName: "Ate Joan Reyes", action: "updated", entityType: "candidate", entityId: "c47", description: "Added shepherd note: siblings with Dianne — separate from group", createdAt: "2026-05-12T14:00:00Z" },
];

// Factory: returns initial state for BLD dev demo
export function getMockInitialState() {
  return {
    event:       MOCK_EVENT,
    candidates:  MOCK_CANDIDATES,
    connections: MOCK_CONNECTIONS.filter((c) => c.source === "MANUAL"),
    groups:      MOCK_GROUPS,
    rooms:       MOCK_ROOMS,
    activities:  MOCK_ACTIVITIES,
  };
}

// Helper: get candidates for a group
export function getCandidatesForGroup(
  groupId: string,
  candidates: Candidate[]
): Candidate[] {
  return candidates.filter((c) => c.groupId === groupId);
}

// Helper: get candidates for a room
export function getCandidatesForRoom(
  roomId: string,
  rooms: Room[],
  candidates: Candidate[]
): Room & { candidates: Candidate[] } {
  const room = rooms.find((r) => r.id === roomId)!;
  return { ...room, candidates: candidates.filter((c) => c.roomId === roomId) };
}
