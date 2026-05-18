// Run with: npm run prisma:seed
// Creates an initial admin user and a sample YE #19 batch.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  // Create admin user
  const passwordHash = await bcrypt.hash("shepherd123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@bld.ph" },
    update: {},
    create: {
      email: "admin@bld.ph",
      passwordHash,
      name: "Head Shepherd",
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // Create sample batch
  const batch = await prisma.batch.upsert({
    where: { name: "YE #19" },
    update: { isActive: true },
    create: { name: "YE #19", isActive: true },
  });
  console.log(`✅ Batch: ${batch.name}`);

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
        batchId: batch.id,
      },
    }).catch(() => {}); // ignore if already exists with different id
  }
  console.log(`✅ Created ${groupNames.length} default groups`);

  // Create default rooms
  const roomDefs = [
    { name: "Upper Room A", floor: "2nd Floor", capacity: 8, bedCount: 8, gender: "MALE" },
    { name: "Upper Room B", floor: "2nd Floor", capacity: 8, bedCount: 8, gender: "MALE" },
    { name: "Garden Room",  floor: "Ground",    capacity: 6, bedCount: 6, gender: "MALE" },
    { name: "Cana Hall",    floor: "3rd Floor", capacity: 8, bedCount: 8, gender: "FEMALE" },
    { name: "Bethany Hall", floor: "3rd Floor", capacity: 8, bedCount: 8, gender: "FEMALE" },
    { name: "Magdalene Hall", floor: "4th Floor", capacity: 6, bedCount: 6, gender: "FEMALE" },
  ];
  for (const r of roomDefs) {
    await prisma.room.create({
      data: { ...r, gender: r.gender as "MALE" | "FEMALE", batchId: batch.id },
    }).catch(() => {});
  }
  console.log(`✅ Created ${roomDefs.length} default rooms`);

  console.log("\n🎉 Seed complete! Login with admin@bld.ph / shepherd123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
