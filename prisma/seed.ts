import { PrismaClient, UserRole, Weapon, MembershipType, MembershipStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding multi-tenant database...')

  // Create demo organizations (tenants)
  const organization1 = await prisma.organization.upsert({
    where: { id: 'org-demo-1' },
    update: {},
    create: {
      id: 'org-demo-1',
      name: 'Madrid Fencing Club',
      displayName: 'Club de Esgrima Madrid',
      description: 'Premier fencing organization in Madrid, Spain',
      city: 'Madrid',
      country: 'Spain',
      website: 'https://madridfencing.es',
    },
  })

  const organization2 = await prisma.organization.upsert({
    where: { id: 'org-demo-2' },
    update: {},
    create: {
      id: 'org-demo-2',
      name: 'San Francisco Fencing Academy',
      displayName: 'SF Fencing Academy',
      description: 'Elite fencing training in the Bay Area',
      city: 'San Francisco',
      country: 'USA',
      website: 'https://sffencing.com',
    },
  })

  console.log('✅ Created organizations:', organization1.name, organization2.name)

  // Create system admin (no organization)
  const systemAdmin = await prisma.user.upsert({
    where: { email: 'admin@enguardia.com' },
    update: {},
    create: {
      email: 'admin@enguardia.com',
      name: 'System Administrator',
      role: UserRole.SYSTEM_ADMIN,
      organizationId: null, // System admin has no org
    },
  })

  // Create organization admins
  const orgAdmin1 = await prisma.user.upsert({
    where: { email: 'admin@madridfencing.es' },
    update: {},
    create: {
      email: 'admin@madridfencing.es',
      name: 'Carlos Rodriguez',
      role: UserRole.ORGANIZATION_ADMIN,
      organizationId: organization1.id,
    },
  })

  const orgAdmin2 = await prisma.user.upsert({
    where: { email: 'admin@sffencing.com' },
    update: {},
    create: {
      email: 'admin@sffencing.com',
      name: 'Jennifer Smith',
      role: UserRole.ORGANIZATION_ADMIN,
      organizationId: organization2.id,
    },
  })

  // Create referees
  const referee1 = await prisma.user.upsert({
    where: { email: 'referee@madridfencing.es' },
    update: {},
    create: {
      email: 'referee@madridfencing.es',
      name: 'Miguel Torres',
      role: UserRole.REFEREE,
      organizationId: organization1.id,
    },
  })

  const referee2 = await prisma.user.upsert({
    where: { email: 'referee@sffencing.com' },
    update: {},
    create: {
      email: 'referee@sffencing.com',
      name: 'David Chen',
      role: UserRole.REFEREE,
      organizationId: organization2.id,
    },
  })

  console.log('✅ Created users with roles')

  // Create global athletes (shared across organizations)
  const athlete1 = await prisma.athlete.upsert({
    where: { id: 'athlete-1' },
    update: {},
    create: {
      id: 'athlete-1',
      firstName: 'Ana',
      lastName: 'García',
      dateOfBirth: new Date('1995-03-15'),
      nationality: 'ESP',
      fieId: 'ESP12345',
    },
  })

  const athlete2 = await prisma.athlete.upsert({
    where: { id: 'athlete-2' },
    update: {},
    create: {
      id: 'athlete-2',
      firstName: 'John',
      lastName: 'Smith',
      dateOfBirth: new Date('1992-07-22'),
      nationality: 'USA',
      fieId: 'USA67890',
    },
  })

  const athlete3 = await prisma.athlete.upsert({
    where: { id: 'athlete-3' },
    update: {},
    create: {
      id: 'athlete-3',
      firstName: 'Marie',
      lastName: 'Dubois',
      dateOfBirth: new Date('1998-11-08'),
      nationality: 'FRA',
      fieId: 'FRA11111',
    },
  })

  console.log('✅ Created global athletes')

  // Set athlete weapon specializations
  await prisma.athleteWeapon.create({
    data: { athleteId: athlete1.id, weapon: Weapon.EPEE }
  })
  await prisma.athleteWeapon.create({
    data: { athleteId: athlete1.id, weapon: Weapon.FOIL }
  })
  await prisma.athleteWeapon.create({
    data: { athleteId: athlete2.id, weapon: Weapon.SABRE }
  })
  await prisma.athleteWeapon.create({
    data: { athleteId: athlete3.id, weapon: Weapon.EPEE }
  })

  // Create athlete-organization memberships
  await prisma.athleteOrganization.create({
    data: {
      athleteId: athlete1.id,
      organizationId: organization1.id,
      membershipType: MembershipType.MEMBER,
      status: MembershipStatus.ACTIVE,
    },
  })
  await prisma.athleteOrganization.create({
    data: {
      athleteId: athlete2.id,
      organizationId: organization2.id,
      membershipType: MembershipType.MEMBER,
      status: MembershipStatus.ACTIVE,
    },
  })
  await prisma.athleteOrganization.create({
    data: {
      athleteId: athlete3.id,
      organizationId: organization1.id,
      membershipType: MembershipType.GUEST,
      status: MembershipStatus.ACTIVE,
    },
  })
  await prisma.athleteOrganization.create({
    data: {
      athleteId: athlete3.id,
      organizationId: organization2.id,
      membershipType: MembershipType.VISITING_ATHLETE,
      status: MembershipStatus.ACTIVE,
    },
  })

  console.log('✅ Created athlete-organization memberships')

  // Create clubs within organizations
  const club1 = await prisma.club.create({
    data: {
      name: 'Club Esgrima Chamartín',
      city: 'Madrid',
      country: 'Spain',
      organizationId: organization1.id,
    },
  })

  const club2 = await prisma.club.create({
    data: {
      name: 'Golden Gate Fencing Club',
      city: 'San Francisco',
      country: 'USA',
      organizationId: organization2.id,
    },
  })

  console.log('✅ Created clubs')

  // Create demo events (private to each organization)
  const event1 = await prisma.event.create({
    data: {
      name: 'Madrid Open 2024',
      description: 'Annual open tournament in Madrid',
      weapon: Weapon.EPEE,
      category: 'Senior Mixed',
      startDate: new Date('2024-09-15'),
      endDate: new Date('2024-09-15'),
      venue: 'Polideportivo Municipal Madrid',
      organizationId: organization1.id,
      createdById: orgAdmin1.id,
      isPublic: true, // Other orgs can see results
    },
  })

  const event2 = await prisma.event.create({
    data: {
      name: 'Bay Area Championship',
      description: 'Regional sabre championship',
      weapon: Weapon.SABRE,
      category: 'Senior Men',
      startDate: new Date('2024-10-20'),
      endDate: new Date('2024-10-20'),
      venue: 'SF Olympic Club',
      organizationId: organization2.id,
      createdById: orgAdmin2.id,
      isPublic: false, // Private event
    },
  })

  console.log('✅ Created events')

  // Create translations for organizations
  await prisma.organizationTranslation.createMany({
    data: [
      // Madrid Fencing Club translations
      {
        organizationId: organization1.id,
        locale: 'en',
        name: 'Madrid Fencing Club',
        displayName: 'Madrid Fencing Club',
        description: 'Premier fencing organization in Madrid, Spain'
      },
      {
        organizationId: organization1.id,
        locale: 'es',
        name: 'Club de Esgrima Madrid',
        displayName: 'Club de Esgrima Madrid',
        description: 'Organización de esgrima premier en Madrid, España'
      },
      {
        organizationId: organization1.id,
        locale: 'fr',
        name: 'Club d\'Escrime de Madrid',
        displayName: 'Club d\'Escrime de Madrid',
        description: 'Organisation d\'escrime de premier plan à Madrid, Espagne'
      },
      // San Francisco Fencing Academy translations
      {
        organizationId: organization2.id,
        locale: 'en',
        name: 'San Francisco Fencing Academy',
        displayName: 'SF Fencing Academy',
        description: 'Elite fencing training in the Bay Area'
      },
      {
        organizationId: organization2.id,
        locale: 'es',
        name: 'Academia de Esgrima de San Francisco',
        displayName: 'Academia de Esgrima SF',
        description: 'Entrenamiento de esgrima de élite en el Área de la Bahía'
      },
      {
        organizationId: organization2.id,
        locale: 'fr',
        name: 'Académie d\'Escrime de San Francisco',
        displayName: 'Académie d\'Escrime SF',
        description: 'Formation d\'escrime d\'élite dans la région de la baie'
      }
    ]
  })

  // Create translations for clubs
  await prisma.clubTranslation.createMany({
    data: [
      // Club Esgrima Chamartín translations
      { clubId: club1.id, locale: 'en', name: 'Chamartín Fencing Club' },
      { clubId: club1.id, locale: 'es', name: 'Club Esgrima Chamartín' },
      { clubId: club1.id, locale: 'fr', name: 'Club d\'Escrime Chamartín' },
      // Golden Gate Fencing Club translations
      { clubId: club2.id, locale: 'en', name: 'Golden Gate Fencing Club' },
      { clubId: club2.id, locale: 'es', name: 'Club de Esgrima Golden Gate' },
      { clubId: club2.id, locale: 'fr', name: 'Club d\'Escrime Golden Gate' }
    ]
  })

  // Create translations for events
  await prisma.eventTranslation.createMany({
    data: [
      // Madrid Open 2024 translations
      {
        eventId: event1.id,
        locale: 'en',
        name: 'Madrid Open 2024',
        description: 'Annual open tournament in Madrid'
      },
      {
        eventId: event1.id,
        locale: 'es',
        name: 'Abierto de Madrid 2024',
        description: 'Torneo abierto anual en Madrid'
      },
      {
        eventId: event1.id,
        locale: 'fr',
        name: 'Open de Madrid 2024',
        description: 'Tournoi ouvert annuel à Madrid'
      },
      // Bay Area Championship translations
      {
        eventId: event2.id,
        locale: 'en',
        name: 'Bay Area Championship',
        description: 'Regional sabre championship'
      },
      {
        eventId: event2.id,
        locale: 'es',
        name: 'Campeonato del Área de la Bahía',
        description: 'Campeonato regional de sable'
      },
      {
        eventId: event2.id,
        locale: 'fr',
        name: 'Championnat de la région de la baie',
        description: 'Championnat régional de sabre'
      }
    ]
  })

  // Create audit log translations for common actions
  await prisma.auditLogTranslation.createMany({
    data: [
      // Score update translations
      { actionKey: 'SCORE_UPDATE', locale: 'en', description: 'Score updated' },
      { actionKey: 'SCORE_UPDATE', locale: 'es', description: 'Puntuación actualizada' },
      { actionKey: 'SCORE_UPDATE', locale: 'fr', description: 'Score mis à jour' },
      // Match start translations
      { actionKey: 'MATCH_START', locale: 'en', description: 'Match started' },
      { actionKey: 'MATCH_START', locale: 'es', description: 'Combate iniciado' },
      { actionKey: 'MATCH_START', locale: 'fr', description: 'Match commencé' },
      // Match end translations
      { actionKey: 'MATCH_END', locale: 'en', description: 'Match ended' },
      { actionKey: 'MATCH_END', locale: 'es', description: 'Combate finalizado' },
      { actionKey: 'MATCH_END', locale: 'fr', description: 'Match terminé' },
      // Athlete withdrawal translations
      { actionKey: 'ATHLETE_WITHDRAWAL', locale: 'en', description: 'Athlete withdrew from event' },
      { actionKey: 'ATHLETE_WITHDRAWAL', locale: 'es', description: 'Atleta se retiró del evento' },
      { actionKey: 'ATHLETE_WITHDRAWAL', locale: 'fr', description: 'Athlète s\'est retiré de l\'événement' },
      // Event creation translations
      { actionKey: 'EVENT_CREATED', locale: 'en', description: 'Event created' },
      { actionKey: 'EVENT_CREATED', locale: 'es', description: 'Evento creado' },
      { actionKey: 'EVENT_CREATED', locale: 'fr', description: 'Événement créé' },
      // User registration translations
      { actionKey: 'USER_REGISTERED', locale: 'en', description: 'User registered' },
      { actionKey: 'USER_REGISTERED', locale: 'es', description: 'Usuario registrado' },
      { actionKey: 'USER_REGISTERED', locale: 'fr', description: 'Utilisateur enregistré' }
    ]
  })

  console.log('✅ Created translations for organizations, clubs, events, and audit actions')

  // Create global rankings
  await prisma.globalRanking.create({
    data: {
      athleteId: athlete1.id,
      weapon: Weapon.EPEE,
      category: 'Senior Women',
      rank: 1,
      points: 1250,
      victories: 45,
      matches: 52,
      touchesScored: 234,
      touchesReceived: 198,
      indicator: 36,
      season: '2024-2025',
    },
  })
  
  await prisma.globalRanking.create({
    data: {
      athleteId: athlete2.id,
      weapon: Weapon.SABRE,
      category: 'Senior Men',
      rank: 3,
      points: 980,
      victories: 38,
      matches: 48,
      touchesScored: 201,
      touchesReceived: 165,
      indicator: 36,
      season: '2024-2025',
    },
  })

  console.log('✅ Created global rankings')

  console.log('🎉 Multi-tenant seeding completed!')
  console.log('\n📋 Demo Users:')
  console.log('System Admin: admin@enguardia.com')
  console.log('Madrid Admin: admin@madridfencing.es')
  console.log('SF Admin: admin@sffencing.com')
  console.log('Madrid Referee: referee@madridfencing.es')
  console.log('SF Referee: referee@sffencing.com')
  console.log('\n🏢 Organizations:')
  console.log('1. Madrid Fencing Club (org-demo-1)')
  console.log('2. San Francisco Fencing Academy (org-demo-2)')
  console.log('\n🤺 Athletes:')
  console.log('Ana García (ESP) - Member of Madrid')
  console.log('John Smith (USA) - Member of SF')  
  console.log('Marie Dubois (FRA) - Guest in Madrid, Visiting in SF')
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
 