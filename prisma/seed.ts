import { PrismaClient, UserRole, Weapon, MembershipType, MembershipStatus, TournamentStatus, CompetitionStatus, PhaseType, PhaseStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding multi-tenant database...')

  // Create organizations - mix of clubs and federations
  const organization1 = await prisma.organization.upsert({
    where: { id: 'org-demo-1' },
    update: {},
    create: {
      id: 'org-demo-1',
      name: 'Club de Esgrima Chamartín',
      displayName: 'CE Chamartín',
      description: 'Historic fencing club in Madrid, founded in 1952. Specializing in épée and foil training.',
      city: 'Madrid',
      country: 'Spain',
      website: 'https://escrimachamartin.es',
    },
  })

  const organization2 = await prisma.organization.upsert({
    where: { id: 'org-demo-2' },
    update: {},
    create: {
      id: 'org-demo-2',
      name: 'Federación Española de Esgrima',
      displayName: 'Real Fed. Española Esgrima',
      description: 'National federation governing fencing in Spain. Organizes national championships and international competitions.',
      city: 'Madrid',
      country: 'Spain',
      website: 'https://esgrima.es',
    },
  })

  // Add a third organization - regional federation
  const organization3 = await prisma.organization.upsert({
    where: { id: 'org-demo-3' },
    update: {},
    create: {
      id: 'org-demo-3',
      name: 'USA Fencing',
      displayName: 'USA Fencing',
      description: 'National governing body for fencing in the United States. Promotes Olympic and Paralympic fencing.',
      city: 'Colorado Springs',
      country: 'USA',
      website: 'https://usafencing.org',
    },
  })

  console.log('✅ Created organizations:', organization1.displayName, organization2.displayName, organization3.displayName)

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
    where: { email: 'admin@escrimachamartin.es' },
    update: {},
    create: {
      email: 'admin@escrimachamartin.es',
      name: 'Carlos Rodriguez',
      role: UserRole.ORGANIZATION_ADMIN,
      organizationId: organization1.id,
    },
  })

  const orgAdmin2 = await prisma.user.upsert({
    where: { email: 'admin@esgrima.es' },
    update: {},
    create: {
      email: 'admin@esgrima.es',
      name: 'María González',
      role: UserRole.ORGANIZATION_ADMIN,
      organizationId: organization2.id,
    },
  })

  const orgAdmin3 = await prisma.user.upsert({
    where: { email: 'admin@usafencing.org' },
    update: {},
    create: {
      email: 'admin@usafencing.org',
      name: 'Jennifer Smith',
      role: UserRole.ORGANIZATION_ADMIN,
      organizationId: organization3.id,
    },
  })

  // Create referees
  const referee1 = await prisma.user.upsert({
    where: { email: 'referee@escrimachamartin.es' },
    update: {},
    create: {
      email: 'referee@escrimachamartin.es',
      name: 'Miguel Torres',
      role: UserRole.REFEREE,
      organizationId: organization1.id,
    },
  })

  const referee2 = await prisma.user.upsert({
    where: { email: 'referee@esgrima.es' },
    update: {},
    create: {
      email: 'referee@esgrima.es',
      name: 'Antonio Serrano',
      role: UserRole.REFEREE,
      organizationId: organization2.id,
    },
  })

  const referee3 = await prisma.user.upsert({
    where: { email: 'referee@usafencing.org' },
    update: {},
    create: {
      email: 'referee@usafencing.org',
      name: 'David Chen',
      role: UserRole.REFEREE,
      organizationId: organization3.id,
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
      nationality: 'ES', // Spain
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
      nationality: 'US', // United States
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
      nationality: 'FR', // France
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
      nationality: 'IT', // Italy
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
      nationality: 'RU', // Russia
      fieId: 'RUS33333',
    },
  })

  // Add more athletes with diverse nationalities
  const athlete6 = await prisma.athlete.upsert({
    where: { id: 'athlete-6' },
    update: {},
    create: {
      id: 'athlete-6',
      firstName: 'Hiroshi',
      lastName: 'Tanaka',
      dateOfBirth: new Date('1997-01-20'),
      nationality: 'JP', // Japan
      fieId: 'JPN44444',
    },
  })

  const athlete7 = await prisma.athlete.upsert({
    where: { id: 'athlete-7' },
    update: {},
    create: {
      id: 'athlete-7',
      firstName: 'Emma',
      lastName: 'Johnson',
      dateOfBirth: new Date('1999-04-08'),
      nationality: 'CA', // Canada
      fieId: 'CAN55555',
    },
  })

  const athlete8 = await prisma.athlete.upsert({
    where: { id: 'athlete-8' },
    update: {},
    create: {
      id: 'athlete-8',
      firstName: 'Klaus',
      lastName: 'Mueller',
      dateOfBirth: new Date('1993-12-03'),
      nationality: 'DE', // Germany
      fieId: 'GER66666',
    },
  })

  const athlete9 = await prisma.athlete.upsert({
    where: { id: 'athlete-9' },
    update: {},
    create: {
      id: 'athlete-9',
      firstName: 'Liam',
      lastName: 'O\'Connor',
      dateOfBirth: new Date('2000-06-15'),
      nationality: 'GB', // United Kingdom
      fieId: 'GBR77777',
    },
  })

  const athlete10 = await prisma.athlete.upsert({
    where: { id: 'athlete-10' },
    update: {},
    create: {
      id: 'athlete-10',
      firstName: 'Lucas',
      lastName: 'Silva',
      dateOfBirth: new Date('1991-08-25'),
      nationality: 'BR', // Brazil
      fieId: 'BRA88888',
    },
  })

  console.log('✅ Created global athletes with diverse nationalities')

  // Set athlete weapon specializations (using upsert to handle duplicates)
  const weaponData = [
    { athleteId: athlete1.id, weapon: Weapon.EPEE },
    { athleteId: athlete1.id, weapon: Weapon.FOIL },
    { athleteId: athlete2.id, weapon: Weapon.SABRE },
    { athleteId: athlete3.id, weapon: Weapon.EPEE },
    { athleteId: athlete4.id, weapon: Weapon.FOIL },
    { athleteId: athlete5.id, weapon: Weapon.SABRE },
    { athleteId: athlete6.id, weapon: Weapon.EPEE },
    { athleteId: athlete6.id, weapon: Weapon.SABRE },
    { athleteId: athlete7.id, weapon: Weapon.FOIL },
    { athleteId: athlete8.id, weapon: Weapon.EPEE },
    { athleteId: athlete9.id, weapon: Weapon.SABRE },
    { athleteId: athlete9.id, weapon: Weapon.FOIL },
    { athleteId: athlete10.id, weapon: Weapon.EPEE },
  ]

  for (const data of weaponData) {
    await prisma.athleteWeapon.upsert({
      where: {
        athleteId_weapon: {
          athleteId: data.athleteId,
          weapon: data.weapon
        }
      },
      update: {},
      create: data
    })
  }

  console.log('✅ Created athlete weapon specializations')

  // Create athlete-organization memberships (using upsert to handle duplicates)
  const membershipData = [
    // Spanish athletes - Ana García and Paolo Rossi - members of the club
    {
      athleteId: athlete1.id, // Ana García (ESP)
      organizationId: organization1.id, // Club de Esgrima Chamartín
      membershipType: MembershipType.MEMBER,
      status: MembershipStatus.ACTIVE,
    },
    {
      athleteId: athlete1.id, // Ana García (ESP)
      organizationId: organization2.id, // Federación Española de Esgrima
      membershipType: MembershipType.MEMBER,
      status: MembershipStatus.ACTIVE,
    },
    {
      athleteId: athlete4.id, // Paolo Rossi (ITA)
      organizationId: organization1.id, // Club de Esgrima Chamartín
      membershipType: MembershipType.MEMBER,
      status: MembershipStatus.ACTIVE,
    },
    // American athletes - John Smith - member of USA Fencing
    {
      athleteId: athlete2.id, // John Smith (USA)
      organizationId: organization3.id, // USA Fencing
      membershipType: MembershipType.MEMBER,
      status: MembershipStatus.ACTIVE,
    },
    {
      athleteId: athlete7.id, // Emma Johnson (CAN)
      organizationId: organization3.id, // USA Fencing - visiting from Canada
      membershipType: MembershipType.VISITING_ATHLETE,
      status: MembershipStatus.ACTIVE,
    },
    // European athletes - visiting/guest relationships
    {
      athleteId: athlete3.id, // Marie Dubois (FRA)
      organizationId: organization1.id, // Club de Esgrima Chamartín
      membershipType: MembershipType.GUEST,
      status: MembershipStatus.ACTIVE,
    },
    {
      athleteId: athlete3.id, // Marie Dubois (FRA)
      organizationId: organization2.id, // Federación Española de Esgrima
      membershipType: MembershipType.VISITING_ATHLETE,
      status: MembershipStatus.ACTIVE,
    },
    {
      athleteId: athlete8.id, // Klaus Mueller (GER)
      organizationId: organization1.id, // Club de Esgrima Chamartín
      membershipType: MembershipType.VISITING_ATHLETE,
      status: MembershipStatus.ACTIVE,
    },
    {
      athleteId: athlete8.id, // Klaus Mueller (GER)
      organizationId: organization2.id, // Federación Española de Esgrima
      membershipType: MembershipType.GUEST,
      status: MembershipStatus.ACTIVE,
    },
    // Other international athletes
    {
      athleteId: athlete5.id, // Sofia Petrov (RUS)
      organizationId: organization2.id, // Federación Española de Esgrima
      membershipType: MembershipType.VISITING_ATHLETE,
      status: MembershipStatus.ACTIVE,
    },
    {
      athleteId: athlete6.id, // Hiroshi Tanaka (JPN)
      organizationId: organization3.id, // USA Fencing
      membershipType: MembershipType.GUEST,
      status: MembershipStatus.ACTIVE,
    },
    {
      athleteId: athlete9.id, // Liam O'Connor (GBR)
      organizationId: organization1.id, // Club de Esgrima Chamartín
      membershipType: MembershipType.GUEST,
      status: MembershipStatus.ACTIVE,
    },
    {
      athleteId: athlete10.id, // Carolina Silva (BRA)
      organizationId: organization3.id, // USA Fencing
      membershipType: MembershipType.VISITING_ATHLETE,
      status: MembershipStatus.ACTIVE,
    },
  ]

  for (const data of membershipData) {
    await prisma.athleteOrganization.upsert({
      where: {
        athleteId_organizationId: {
          athleteId: data.athleteId,
          organizationId: data.organizationId
        }
      },
      update: {
        membershipType: data.membershipType,
        status: data.status,
      },
      create: data
    })
  }

  console.log('✅ Created athlete-organization memberships')

  // Create clubs (using upsert to handle duplicates)
  const club1 = await prisma.club.upsert({
    where: {
      name_city_country: {
        name: 'Club Esgrima Chamartín',
        city: 'Madrid',
        country: 'ES'
      }
    },
    update: {},
    create: {
      name: 'Club Esgrima Chamartín',
      city: 'Madrid',
      country: 'ES',
      imageUrl: 'https://pbs.twimg.com/profile_images/1118084799/cech_400x400.png',
    },
  })

  const club2 = await prisma.club.upsert({
    where: {
      name_city_country: {
        name: 'Golden Gate Fencing Club',
        city: 'San Francisco',
        country: 'US'
      }
    },
    update: {},
    create: {
      name: 'Golden Gate Fencing Club',
      city: 'San Francisco',
      country: 'US',
      imageUrl: 'https://ggfc.org/images/logo-red.png',
    },
  })

  const club3 = await prisma.club.upsert({
    where: {
      name_city_country: {
        name: 'Paris Escrime Club',
        city: 'Paris',
        country: 'FR'
      }
    },
    update: {},
    create: {
      name: 'Paris Escrime Club',
      city: 'Paris',
      country: 'FR',
      imageUrl: 'https://www.paris-cep.fr/wp-content/uploads/2018/09/logo-cep.png',
    },
  })

  console.log('✅ Created clubs')

  // Create athlete-club memberships (using upsert to handle duplicates)
  const athleteClubData = [
    // Spanish athletes - Ana García and others in Spanish club
    {
      athleteId: athlete1.id, // Ana García (ESP)
      clubId: club1.id, // Club Esgrima Chamartín
      membershipType: 'MEMBER',
      status: 'ACTIVE',
      isPrimary: true,
    },
    // American athletes - John Smith in Golden Gate
    {
      athleteId: athlete2.id, // John Smith (USA)
      clubId: club2.id, // Golden Gate Fencing Club
      membershipType: 'MEMBER',
      status: 'ACTIVE',
      isPrimary: true,
    },
    // French athlete - Marie Dubois in Paris club
    {
      athleteId: athlete3.id, // Marie Dubois (FRA)
      clubId: club3.id, // Paris Escrime Club
      membershipType: 'MEMBER',
      status: 'ACTIVE',
      isPrimary: true,
    },
    // Italian athlete - Paolo Rossi as guest in Spanish club
    {
      athleteId: athlete4.id, // Paolo Rossi (ITA)
      clubId: club1.id, // Club Esgrima Chamartín
      membershipType: 'GUEST',
      status: 'ACTIVE',
      isPrimary: true,
    },
    // Russian athlete - Sofia Petrov as guest in Paris
    {
      athleteId: athlete5.id, // Sofia Petrov (RUS)
      clubId: club3.id, // Paris Escrime Club
      membershipType: 'GUEST',
      status: 'ACTIVE',
      isPrimary: true,
    },
    // German athlete - Hans Mueller as guest in Spanish club
    {
      athleteId: athlete6.id, // Hans Mueller (DE)
      clubId: club1.id, // Club Esgrima Chamartín
      membershipType: 'GUEST',
      status: 'ACTIVE',
      isPrimary: true,
    },
    // Japanese athlete - Yuki Tanaka as guest in American club
    {
      athleteId: athlete7.id, // Yuki Tanaka (JP)
      clubId: club2.id, // Golden Gate Fencing Club
      membershipType: 'GUEST',
      status: 'ACTIVE',
      isPrimary: true,
    },
    // Brazilian athlete - Carlos Silva as guest in Spanish club
    {
      athleteId: athlete8.id, // Carlos Silva (BR)
      clubId: club1.id, // Club Esgrima Chamartín
      membershipType: 'GUEST',
      status: 'ACTIVE',
      isPrimary: true,
    },
    // Canadian athlete - Emma Thompson in American club
    {
      athleteId: athlete9.id, // Emma Thompson (CA)
      clubId: club2.id, // Golden Gate Fencing Club
      membershipType: 'MEMBER',
      status: 'ACTIVE',
      isPrimary: true,
    },
    // Australian athlete - James Wilson as guest in Paris club
    {
      athleteId: athlete10.id, // James Wilson (AU)
      clubId: club3.id, // Paris Escrime Club
      membershipType: 'GUEST',
      status: 'ACTIVE',
      isPrimary: true,
    },
  ]

  for (const data of athleteClubData) {
    await prisma.athleteClub.upsert({
      where: {
        athleteId_clubId: {
          athleteId: data.athleteId,
          clubId: data.clubId
        }
      },
      update: {
        membershipType: data.membershipType,
        status: data.status,
        isPrimary: data.isPrimary,
      },
      create: data
    })
  }

  console.log('✅ Created athlete-club memberships')

  // Create club-organization affiliations (using upsert to handle duplicates)
  await prisma.clubOrganization.upsert({
    where: {
      clubId_organizationId: {
        clubId: club1.id,
        organizationId: organization1.id
      }
    },
    update: {
      affiliationType: 'MEMBER',
      status: 'ACTIVE',
    },
    create: {
      clubId: club1.id, // Club Esgrima Chamartín
      organizationId: organization1.id, // Club de Esgrima Chamartín (same club)
      affiliationType: 'MEMBER',
      status: 'ACTIVE',
    },
  })

  await prisma.clubOrganization.upsert({
    where: {
      clubId_organizationId: {
        clubId: club1.id,
        organizationId: organization2.id
      }
    },
    update: {
      affiliationType: 'MEMBER',
      status: 'ACTIVE',
    },
    create: {
      clubId: club1.id, // Club Esgrima Chamartín
      organizationId: organization2.id, // Federación Española de Esgrima
      affiliationType: 'MEMBER',
      status: 'ACTIVE',
    },
  })

  await prisma.clubOrganization.upsert({
    where: {
      clubId_organizationId: {
        clubId: club2.id,
        organizationId: organization3.id
      }
    },
    update: {
      affiliationType: 'MEMBER',
      status: 'ACTIVE',
    },
    create: {
      clubId: club2.id, // Golden Gate Fencing Club
      organizationId: organization3.id, // USA Fencing
      affiliationType: 'MEMBER',
      status: 'ACTIVE',
    },
  })

  // Make Paris club available to Spanish federation as international partner
  await prisma.clubOrganization.upsert({
    where: {
      clubId_organizationId: {
        clubId: club3.id,
        organizationId: organization2.id
      }
    },
    update: {
      affiliationType: 'PARTNER',
      status: 'ACTIVE',
    },
    create: {
      clubId: club3.id, // Paris Escrime Club
      organizationId: organization2.id, // Federación Española de Esgrima
      affiliationType: 'PARTNER',
      status: 'ACTIVE',
    },
  })

  console.log('✅ Created club-organization affiliations')

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
      organizationId: organization1.id, // Club de Esgrima Chamartín
      createdById: orgAdmin1.id,
    },
  })

  const tournament2 = await prisma.tournament.create({
    data: {
      name: 'Campeonato Nacional de España',
      description: 'Spanish National Championship - all weapons and categories',
      startDate: new Date('2024-11-20T08:00:00.000Z'),
      endDate: new Date('2024-11-22T18:00:00.000Z'),
      venue: 'Centro Nacional de Esgrima, Madrid',
      status: TournamentStatus.IN_PROGRESS,
      isActive: false,
      isPublic: true,
      organizationId: organization2.id, // Federación Española de Esgrima
      createdById: orgAdmin2.id,
    },
  })

  const tournament3 = await prisma.tournament.create({
    data: {
      name: 'USA National Championships',
      description: 'Annual USA Fencing National Championships',
      startDate: new Date('2024-07-01T08:00:00.000Z'),
      endDate: new Date('2024-07-07T20:00:00.000Z'),
      venue: 'Salt Palace Convention Center, Salt Lake City',
      status: TournamentStatus.COMPLETED,
      isActive: false,
      isPublic: true,
      organizationId: organization3.id, // USA Fencing
      createdById: orgAdmin3.id,
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
  console.log('Club Admin: admin@escrimachamartin.es')
  console.log('Spanish Fed Admin: admin@esgrima.es')
  console.log('USA Fed Admin: admin@usafencing.org')
  console.log('Club Referee: referee@escrimachamartin.es')
  console.log('Spanish Fed Referee: referee@esgrima.es')
  console.log('USA Fed Referee: referee@usafencing.org')
  console.log('\n🏢 Organizations:')
  console.log('1. Club de Esgrima Chamartín (org-demo-1) - Local fencing club')
  console.log('2. Federación Española de Esgrima (org-demo-2) - Spanish national federation')
  console.log('3. USA Fencing (org-demo-3) - USA national federation')
  console.log('\n🏆 Tournaments:')
  console.log('1. Copa de Navidad 2024 (Club Chamartín) - ACTIVE, Registration Open')
  console.log('   ├─ Epee Senior Men (32 max)')
  console.log('   ├─ Epee Senior Women (24 max)')
  console.log('   └─ Foil Senior Mixed (40 max)')
  console.log('2. Campeonato Nacional de España (Spanish Fed) - In Progress')
  console.log('   ├─ Sabre Senior Men (28 max)')
  console.log('   └─ Sabre Senior Women (20 max)')
  console.log('3. USA National Championships (USA Fed) - COMPLETED')
  console.log('   ├─ Foil U17 Men (16 max)')
  console.log('   └─ Epee U20 Women (12 max)')
  console.log('\n🤺 Athletes (with realistic federation/club relationships):')
  console.log('Ana García (ESP) 🇪🇸 - Epee/Foil - Member of Club Chamartín & Spanish Fed')
  console.log('John Smith (USA) 🇺🇸 - Sabre - Member of USA Fencing')  
  console.log('Marie Dubois (FRA) 🇫🇷 - Epee - Guest at Club Chamartín, Visiting Spanish Fed')
  console.log('Paolo Rossi (ITA) 🇮🇹 - Foil - Member of Club Chamartín')
  console.log('Sofia Petrov (RUS) 🇷🇺 - Sabre - Visiting Spanish Fed')
  console.log('+ 5 more international athletes with diverse affiliations')
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
 