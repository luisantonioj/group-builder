// Run with: npm run prisma:seed
// Creates the BLD organization, admin user, and sample YE #19 batch.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BLD_ORG_ID = "org-bld";

async function main() {
  console.log("🌱 Seeding database…");

  // Create BLD organization
  const org = await prisma.organization.upsert({
    where: { id: BLD_ORG_ID },
    update: { name: "BLD Youth Ministry", slug: "bld-youth-ministry", isBld: true },
    create: {
      id: BLD_ORG_ID,
      name: "BLD Youth Ministry",
      slug: "bld-youth-ministry",
      isBld: true,
    },
  });
  console.log(`✅ Organization: ${org.name}`);

  // Create BLD org config with full features and BLD terminology
  await prisma.orgConfig.upsert({
    where: { orgId: BLD_ORG_ID },
    update: {},
    create: {
      orgId: BLD_ORG_ID,
      termCandidate: "Lamb",
      termGroup: "Kordero",
      termEvent: "YE Batch",
      termShepherd: "Shepherd",
      termHeadShepherd: "Head Shepherd",
      features: { importExcel: true },
    },
  });
  console.log(`✅ OrgConfig for BLD`);

  // Create admin user
  const passwordHash = await bcrypt.hash("shepherd123", 12);
  const admin = await prisma.user.upsert({
    where: { email_orgId: { email: "admin@bld.ph", orgId: BLD_ORG_ID } },
    update: {},
    create: {
      email: "admin@bld.ph",
      passwordHash,
      name: "Head Shepherd",
      role: "ADMIN",
      orgId: BLD_ORG_ID,
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // Create sample event
  const event = await prisma.event.upsert({
    where: { name_orgId: { name: "YE #19", orgId: BLD_ORG_ID } },
    update: { isActive: true, featureVisualizer: true, featureRoomAssignment: true },
    create: { name: "YE #19", isActive: true, featureVisualizer: true, featureRoomAssignment: true, orgId: BLD_ORG_ID },
  });
  console.log(`✅ Event: ${event.name}`);

  // Create default groups
  const groupNames = ["Kordero 1", "Kordero 2", "Kordero 3", "Kordero 4"];
  for (const name of groupNames) {
    await prisma.group.upsert({
      where: { id: name.toLowerCase().replace(" ", "-") },
      update: {},
      create: {
        id: name.toLowerCase().replace(" ", "-"),
        name,
        capacity: 12,
        eventId: event.id,
      },
    }).catch(() => {});
  }
  console.log(`✅ Created ${groupNames.length} default groups`);

  // Create default rooms
  const roomDefs = [
    { name: "Upper Room A",   floor: "2nd Floor", capacity: 8, bedCount: 8, gender: "MALE" },
    { name: "Upper Room B",   floor: "2nd Floor", capacity: 8, bedCount: 8, gender: "MALE" },
    { name: "Garden Room",    floor: "Ground",    capacity: 6, bedCount: 6, gender: "MALE" },
    { name: "Cana Hall",      floor: "3rd Floor", capacity: 8, bedCount: 8, gender: "FEMALE" },
    { name: "Bethany Hall",   floor: "3rd Floor", capacity: 8, bedCount: 8, gender: "FEMALE" },
    { name: "Magdalene Hall", floor: "4th Floor", capacity: 6, bedCount: 6, gender: "FEMALE" },
  ];
  for (const r of roomDefs) {
    await prisma.room.create({
      data: { ...r, gender: r.gender as "MALE" | "FEMALE", eventId: event.id },
    }).catch(() => {});
  }
  console.log(`✅ Created ${roomDefs.length} default rooms`);

  console.log("\n🎉 Seed complete! Login with admin@bld.ph / shepherd123 (org: bld-youth-ministry)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
