import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const orgs = await prisma.organization.count()
  const events = await prisma.event.count()
  const users = await prisma.user.count()
  const candidates = await prisma.candidate.count()
  console.log({ orgs, events, users, candidates })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
