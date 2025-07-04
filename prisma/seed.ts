import { PrismaClient, UserRole, Weapon, MembershipType, MembershipStatus, TournamentStatus, CompetitionStatus, PhaseType, PhaseStatus } from '@prisma/client'

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

  const athlete4 = await prisma.athlete.upsert({
    where: { id: 'athlete-4' },
    update: {},
    create: {
      id: 'athlete-4',
      firstName: 'Paolo',
      lastName: 'Rossi',
      dateOfBirth: new Date('1996-05-12'),
      nationality: 'ITA',
      fieId: 'ITA22222',
    },
  })

  const athlete5 = await prisma.athlete.upsert({
    where: { id: 'athlete-5' },
    update: {},
    create: {
      id: 'athlete-5',
      firstName: 'Sofia',
      lastName: 'Petrov',
      dateOfBirth: new Date('1994-09-30'),
      nationality: 'RUS',
      fieId: 'RUS33333',
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
  await prisma.athleteWeapon.create({
    data: { athleteId: athlete4.id, weapon: Weapon.FOIL }
  })
  await prisma.athleteWeapon.create({
    data: { athleteId: athlete5.id, weapon: Weapon.SABRE }
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
  await prisma.athleteOrganization.create({
    data: {
      athleteId: athlete4.id,
      organizationId: organization1.id,
      membershipType: MembershipType.MEMBER,
      status: MembershipStatus.ACTIVE,
    },
  })
  await prisma.athleteOrganization.create({
    data: {
      athleteId: athlete5.id,
      organizationId: organization2.id,
      membershipType: MembershipType.MEMBER,
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

  // Create demo tournaments (new architecture)
  const tournament1 = await prisma.tournament.create({
    data: {
      name: 'Copa de Navidad 2024',
      description: 'Annual Christmas tournament featuring multiple weapon competitions',
      startDate: new Date('2024-12-15T09:00:00.000Z'),
      endDate: new Date('2024-12-15T20:00:00.000Z'),
      venue: 'Polideportivo Municipal Madrid',
      status: TournamentStatus.REGISTRATION_OPEN,
      isActive: true,
      isPublic: true,
      organizationId: organization1.id,
      createdById: orgAdmin1.id,
    },
  })

  const tournament2 = await prisma.tournament.create({
    data: {
      name: 'Bay Area Regional Championship',
      description: 'Regional championship for senior fencers in the San Francisco Bay Area',
      startDate: new Date('2024-11-20T08:00:00.000Z'),
      endDate: new Date('2024-11-20T18:00:00.000Z'),
      venue: 'SF Olympic Club',
      status: TournamentStatus.IN_PROGRESS,
      isActive: false,
      isPublic: false,
      organizationId: organization2.id,
      createdById: orgAdmin2.id,
    },
  })

  const tournament3 = await prisma.tournament.create({
    data: {
      name: 'Madrid Youth Open 2024',
      description: 'Open tournament for youth fencers (U17 and U20 categories)',
      startDate: new Date('2024-10-05T09:00:00.000Z'),
      endDate: new Date('2024-10-05T17:00:00.000Z'),
      venue: 'Centro Deportivo La Elipa',
      status: TournamentStatus.COMPLETED,
      isActive: false,
      isPublic: true,
      organizationId: organization1.id,
      createdById: orgAdmin1.id,
    },
  })

  console.log('✅ Created tournaments')

  // Create competitions within tournaments
  const competition1 = await prisma.competition.create({
    data: {
      tournamentId: tournament1.id,
      name: 'Epee Senior Men',
      weapon: Weapon.EPEE,
      category: 'Senior Men',
      status: CompetitionStatus.REGISTRATION_OPEN,
      maxParticipants: 32,
    },
  })

  const competition2 = await prisma.competition.create({
    data: {
      tournamentId: tournament1.id,
      name: 'Epee Senior Women',
      weapon: Weapon.EPEE,
      category: 'Senior Women',
      status: CompetitionStatus.REGISTRATION_OPEN,
      maxParticipants: 24,
    },
  })

  const competition3 = await prisma.competition.create({
    data: {
      tournamentId: tournament1.id,
      name: 'Foil Senior Mixed',
      weapon: Weapon.FOIL,
      category: 'Senior Mixed',
      status: CompetitionStatus.REGISTRATION_OPEN,
      maxParticipants: 40,
    },
  })

  const competition4 = await prisma.competition.create({
    data: {
      tournamentId: tournament2.id,
      name: 'Sabre Senior Men',
      weapon: Weapon.SABRE,
      category: 'Senior Men',
      status: CompetitionStatus.IN_PROGRESS,
      maxParticipants: 28,
    },
  })

  const competition5 = await prisma.competition.create({
    data: {
      tournamentId: tournament2.id,
      name: 'Sabre Senior Women',
      weapon: Weapon.SABRE,
      category: 'Senior Women',
      status: CompetitionStatus.IN_PROGRESS,
      maxParticipants: 20,
    },
  })

  const competition6 = await prisma.competition.create({
    data: {
      tournamentId: tournament3.id,
      name: 'Foil U17 Men',
      weapon: Weapon.FOIL,
      category: 'U17 Men',
      status: CompetitionStatus.COMPLETED,
      maxParticipants: 16,
    },
  })

  const competition7 = await prisma.competition.create({
    data: {
      tournamentId: tournament3.id,
      name: 'Epee U20 Women',
      weapon: Weapon.EPEE,
      category: 'U20 Women',
      status: CompetitionStatus.COMPLETED,
      maxParticipants: 12,
    },
  })

  console.log('✅ Created competitions')

  // Create phases for competitions
  const phase1 = await prisma.phase.create({
    data: {
      competitionId: competition1.id,
      name: 'Poules',
      phaseType: PhaseType.POULE,
      sequenceOrder: 1,
      status: PhaseStatus.SCHEDULED,
    },
  })

  const phase2 = await prisma.phase.create({
    data: {
      competitionId: competition1.id,
      name: 'Direct Elimination',
      phaseType: PhaseType.DIRECT_ELIMINATION,
      sequenceOrder: 2,
      status: PhaseStatus.SCHEDULED,
    },
  })

  const phase3 = await prisma.phase.create({
    data: {
      competitionId: competition4.id,
      name: 'Poules',
      phaseType: PhaseType.POULE,
      sequenceOrder: 1,
      status: PhaseStatus.IN_PROGRESS,
    },
  })

  const phase4 = await prisma.phase.create({
    data: {
      competitionId: competition4.id,
      name: 'Classification',
      phaseType: PhaseType.CLASSIFICATION,
      sequenceOrder: 2,
      status: PhaseStatus.SCHEDULED,
    },
  })

  console.log('✅ Created phases')

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

  // Create translations for tournaments
  await prisma.tournamentTranslation.createMany({
    data: [
      // Copa de Navidad 2024 translations
      {
        tournamentId: tournament1.id,
        locale: 'en',
        name: 'Christmas Cup 2024',
        description: 'Annual Christmas tournament featuring multiple weapon competitions'
      },
      {
        tournamentId: tournament1.id,
        locale: 'es',
        name: 'Copa de Navidad 2024',
        description: 'Torneo anual de Navidad con competiciones de múltiples armas'
      },
      {
        tournamentId: tournament1.id,
        locale: 'fr',
        name: 'Coupe de Noël 2024',
        description: 'Tournoi annuel de Noël avec des compétitions d\'armes multiples'
      },
      // Bay Area Regional Championship translations
      {
        tournamentId: tournament2.id,
        locale: 'en',
        name: 'Bay Area Regional Championship',
        description: 'Regional championship for senior fencers in the San Francisco Bay Area'
      },
      {
        tournamentId: tournament2.id,
        locale: 'es',
        name: 'Campeonato Regional del Área de la Bahía',
        description: 'Campeonato regional para esgrimistas senior en el Área de la Bahía de San Francisco'
      },
      {
        tournamentId: tournament2.id,
        locale: 'fr',
        name: 'Championnat Régional de la Baie',
        description: 'Championnat régional pour les escrimeurs seniors de la région de la baie de San Francisco'
      },
      // Madrid Youth Open 2024 translations
      {
        tournamentId: tournament3.id,
        locale: 'en',
        name: 'Madrid Youth Open 2024',
        description: 'Open tournament for youth fencers (U17 and U20 categories)'
      },
      {
        tournamentId: tournament3.id,
        locale: 'es',
        name: 'Abierto Juvenil de Madrid 2024',
        description: 'Torneo abierto para esgrimistas jóvenes (categorías U17 y U20)'
      },
      {
        tournamentId: tournament3.id,
        locale: 'fr',
        name: 'Open Jeunesse de Madrid 2024',
        description: 'Tournoi ouvert pour les jeunes escrimeurs (catégories U17 et U20)'
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
      // Tournament creation translations
      { actionKey: 'TOURNAMENT_CREATED', locale: 'en', description: 'Tournament created' },
      { actionKey: 'TOURNAMENT_CREATED', locale: 'es', description: 'Torneo creado' },
      { actionKey: 'TOURNAMENT_CREATED', locale: 'fr', description: 'Tournoi créé' },
      // User registration translations
      { actionKey: 'USER_REGISTERED', locale: 'en', description: 'User registered' },
      { actionKey: 'USER_REGISTERED', locale: 'es', description: 'Usuario registrado' },
      { actionKey: 'USER_REGISTERED', locale: 'fr', description: 'Utilisateur enregistré' }
    ]
  })

  console.log('✅ Created translations for organizations, clubs, tournaments, and audit actions')

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

  await prisma.globalRanking.create({
    data: {
      athleteId: athlete4.id,
      weapon: Weapon.FOIL,
      category: 'Senior Men',
      rank: 5,
      points: 875,
      victories: 42,
      matches: 50,
      touchesScored: 189,
      touchesReceived: 142,
      indicator: 47,
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
  console.log('\n🏆 Tournaments:')
  console.log('1. Copa de Navidad 2024 (Madrid) - ACTIVE, Registration Open')
  console.log('   ├─ Epee Senior Men (32 max)')
  console.log('   ├─ Epee Senior Women (24 max)')
  console.log('   └─ Foil Senior Mixed (40 max)')
  console.log('2. Bay Area Regional Championship (SF) - In Progress')
  console.log('   ├─ Sabre Senior Men (28 max)')
  console.log('   └─ Sabre Senior Women (20 max)')
  console.log('3. Madrid Youth Open 2024 (Madrid) - COMPLETED')
  console.log('   ├─ Foil U17 Men (16 max)')
  console.log('   └─ Epee U20 Women (12 max)')
  console.log('\n🤺 Athletes:')
  console.log('Ana García (ESP) - Epee/Foil - Member of Madrid')
  console.log('John Smith (USA) - Sabre - Member of SF')  
  console.log('Marie Dubois (FRA) - Epee - Guest in Madrid, Visiting in SF')
  console.log('Paolo Rossi (ITA) - Foil - Member of Madrid')
  console.log('Sofia Petrov (RUS) - Sabre - Member of SF')
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
 