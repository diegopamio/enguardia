import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create demo admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@enguardia.com' },
    update: {},
    create: {
      email: 'admin@enguardia.com',
      name: 'Tournament Director',
      role: UserRole.ADMIN,
    },
  })

  // Create demo referee user  
  const refereeUser = await prisma.user.upsert({
    where: { email: 'referee@enguardia.com' },
    update: {},
    create: {
      email: 'referee@enguardia.com',
      name: 'Head Referee',
      role: UserRole.REFEREE,
    },
  })

  console.log({ adminUser, refereeUser })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 