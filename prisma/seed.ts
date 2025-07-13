import { PrismaClient, UserRole, Weapon, MembershipType, MembershipStatus, TournamentStatus, CompetitionStatus, PhaseType, PhaseStatus, RegistrationStatus, ClubMembershipType } from '@prisma/client'

const prisma = new PrismaClient()

// Comprehensive athlete data for realistic testing
const athleteData = [
  // Spanish Athletes
  { firstName: 'Ana', lastName: 'García', nationality: 'ES', dateOfBirth: '1995-03-15', fieId: 'ESP001001', club: 'Chamartín' },
  { firstName: 'Carlos', lastName: 'Rodríguez', nationality: 'ES', dateOfBirth: '1993-07-22', fieId: 'ESP001002', club: 'Chamartín' },
  { firstName: 'María', lastName: 'López', nationality: 'ES', dateOfBirth: '1996-11-08', fieId: 'ESP001003', club: 'Chamartín' },
  { firstName: 'David', lastName: 'Martín', nationality: 'ES', dateOfBirth: '1994-05-12', fieId: 'ESP001004', club: 'Chamartín' },
  { firstName: 'Laura', lastName: 'Sánchez', nationality: 'ES', dateOfBirth: '1997-09-30', fieId: 'ESP001005', club: 'Chamartín' },
  { firstName: 'Pablo', lastName: 'Fernández', nationality: 'ES', dateOfBirth: '1992-12-03', fieId: 'ESP001006', club: 'Barcelona' },
  { firstName: 'Isabel', lastName: 'Ruiz', nationality: 'ES', dateOfBirth: '1995-08-17', fieId: 'ESP001007', club: 'Barcelona' },
  { firstName: 'Alejandro', lastName: 'Moreno', nationality: 'ES', dateOfBirth: '1993-04-25', fieId: 'ESP001008', club: 'Barcelona' },
  { firstName: 'Carmen', lastName: 'Jiménez', nationality: 'ES', dateOfBirth: '1996-10-14', fieId: 'ESP001009', club: 'Barcelona' },
  { firstName: 'Javier', lastName: 'Herrera', nationality: 'ES', dateOfBirth: '1994-06-21', fieId: 'ESP001010', club: 'Sevilla' },
  { firstName: 'Cristina', lastName: 'Castillo', nationality: 'ES', dateOfBirth: '1997-02-11', fieId: 'ESP001011', club: 'Sevilla' },
  { firstName: 'Raúl', lastName: 'Vega', nationality: 'ES', dateOfBirth: '1992-09-07', fieId: 'ESP001012', club: 'Sevilla' },
  { firstName: 'Natalia', lastName: 'Ramos', nationality: 'ES', dateOfBirth: '1995-12-19', fieId: 'ESP001013', club: 'Valencia' },
  { firstName: 'Sergio', lastName: 'Torres', nationality: 'ES', dateOfBirth: '1993-03-28', fieId: 'ESP001014', club: 'Valencia' },
  { firstName: 'Elena', lastName: 'Flores', nationality: 'ES', dateOfBirth: '1996-07-05', fieId: 'ESP001015', club: 'Valencia' },

  // French Athletes
  { firstName: 'Marie', lastName: 'Dubois', nationality: 'FR', dateOfBirth: '1998-11-08', fieId: 'FRA002001', club: 'Paris' },
  { firstName: 'Pierre', lastName: 'Martin', nationality: 'FR', dateOfBirth: '1995-04-15', fieId: 'FRA002002', club: 'Paris' },
  { firstName: 'Sophie', lastName: 'Bernard', nationality: 'FR', dateOfBirth: '1993-08-22', fieId: 'FRA002003', club: 'Paris' },
  { firstName: 'Jean', lastName: 'Petit', nationality: 'FR', dateOfBirth: '1996-12-10', fieId: 'FRA002004', club: 'Paris' },
  { firstName: 'Camille', lastName: 'Robert', nationality: 'FR', dateOfBirth: '1994-06-18', fieId: 'FRA002005', club: 'Lyon' },
  { firstName: 'Antoine', lastName: 'Richard', nationality: 'FR', dateOfBirth: '1992-10-25', fieId: 'FRA002006', club: 'Lyon' },
  { firstName: 'Léa', lastName: 'Durand', nationality: 'FR', dateOfBirth: '1997-02-14', fieId: 'FRA002007', club: 'Lyon' },
  { firstName: 'Nicolas', lastName: 'Moreau', nationality: 'FR', dateOfBirth: '1995-09-03', fieId: 'FRA002008', club: 'Marseille' },
  { firstName: 'Amélie', lastName: 'Laurent', nationality: 'FR', dateOfBirth: '1993-05-27', fieId: 'FRA002009', club: 'Marseille' },
  { firstName: 'Julien', lastName: 'Simon', nationality: 'FR', dateOfBirth: '1996-01-12', fieId: 'FRA002010', club: 'Marseille' },

  // Italian Athletes
  { firstName: 'Paolo', lastName: 'Rossi', nationality: 'IT', dateOfBirth: '1996-05-12', fieId: 'ITA22222', club: 'Roma' },
  { firstName: 'Giulia', lastName: 'Bianchi', nationality: 'IT', dateOfBirth: '1994-09-30', fieId: 'ITA22223', club: 'Roma' },
  { firstName: 'Marco', lastName: 'Verdi', nationality: 'IT', dateOfBirth: '1995-07-18', fieId: 'ITA22224', club: 'Roma' },
  { firstName: 'Francesca', lastName: 'Neri', nationality: 'IT', dateOfBirth: '1993-11-25', fieId: 'ITA22225', club: 'Milano' },
  { firstName: 'Alessandro', lastName: 'Conti', nationality: 'IT', dateOfBirth: '1996-03-08', fieId: 'ITA22226', club: 'Milano' },
  { firstName: 'Valentina', lastName: 'Ferrari', nationality: 'IT', dateOfBirth: '1994-12-15', fieId: 'ITA22227', club: 'Milano' },
  { firstName: 'Luca', lastName: 'Gallo', nationality: 'IT', dateOfBirth: '1992-08-02', fieId: 'ITA22228', club: 'Napoli' },
  { firstName: 'Chiara', lastName: 'Ricci', nationality: 'IT', dateOfBirth: '1997-04-20', fieId: 'ITA22229', club: 'Napoli' },
  { firstName: 'Matteo', lastName: 'Marino', nationality: 'IT', dateOfBirth: '1995-10-07', fieId: 'ITA22230', club: 'Torino' },
  { firstName: 'Silvia', lastName: 'Greco', nationality: 'IT', dateOfBirth: '1993-06-14', fieId: 'ITA22231', club: 'Torino' },

  // German Athletes
  { firstName: 'Hans', lastName: 'Müller', nationality: 'DE', dateOfBirth: '1994-03-12', fieId: 'GER33333', club: 'Berlin' },
  { firstName: 'Anna', lastName: 'Schmidt', nationality: 'DE', dateOfBirth: '1996-07-28', fieId: 'GER33334', club: 'Berlin' },
  { firstName: 'Klaus', lastName: 'Weber', nationality: 'DE', dateOfBirth: '1993-11-15', fieId: 'GER33335', club: 'München' },
  { firstName: 'Petra', lastName: 'Wagner', nationality: 'DE', dateOfBirth: '1995-05-03', fieId: 'GER33336', club: 'München' },
  { firstName: 'Thomas', lastName: 'Becker', nationality: 'DE', dateOfBirth: '1992-09-21', fieId: 'GER33337', club: 'Hamburg' },
  { firstName: 'Sabine', lastName: 'Schulz', nationality: 'DE', dateOfBirth: '1997-01-18', fieId: 'GER33338', club: 'Hamburg' },
  { firstName: 'Michael', lastName: 'Hoffmann', nationality: 'DE', dateOfBirth: '1994-08-05', fieId: 'GER33339', club: 'Köln' },
  { firstName: 'Birgit', lastName: 'Schäfer', nationality: 'DE', dateOfBirth: '1996-12-22', fieId: 'GER33340', club: 'Köln' },

  // American Athletes
  { firstName: 'John', lastName: 'Smith', nationality: 'US', dateOfBirth: '1992-07-22', fieId: 'USA67890', club: 'NYC' },
  { firstName: 'Sarah', lastName: 'Johnson', nationality: 'US', dateOfBirth: '1995-11-08', fieId: 'USA67891', club: 'NYC' },
  { firstName: 'Michael', lastName: 'Williams', nationality: 'US', dateOfBirth: '1993-04-15', fieId: 'USA67892', club: 'NYC' },
  { firstName: 'Emily', lastName: 'Brown', nationality: 'US', dateOfBirth: '1996-08-30', fieId: 'USA67893', club: 'LA' },
  { firstName: 'David', lastName: 'Davis', nationality: 'US', dateOfBirth: '1994-12-17', fieId: 'USA67894', club: 'LA' },
  { firstName: 'Jessica', lastName: 'Miller', nationality: 'US', dateOfBirth: '1997-03-25', fieId: 'USA67895', club: 'LA' },
  { firstName: 'Robert', lastName: 'Wilson', nationality: 'US', dateOfBirth: '1992-09-12', fieId: 'USA67896', club: 'Chicago' },
  { firstName: 'Ashley', lastName: 'Moore', nationality: 'US', dateOfBirth: '1995-06-19', fieId: 'USA67897', club: 'Chicago' },
  { firstName: 'Christopher', lastName: 'Taylor', nationality: 'US', dateOfBirth: '1993-10-06', fieId: 'USA67898', club: 'Boston' },
  { firstName: 'Amanda', lastName: 'Anderson', nationality: 'US', dateOfBirth: '1996-02-23', fieId: 'USA67899', club: 'Boston' },

  // Russian Athletes
  { firstName: 'Sofia', lastName: 'Petrov', nationality: 'RU', dateOfBirth: '1994-09-30', fieId: 'RUS33333', club: 'Moscow' },
  { firstName: 'Dmitri', lastName: 'Volkov', nationality: 'RU', dateOfBirth: '1992-05-18', fieId: 'RUS33334', club: 'Moscow' },
  { firstName: 'Katarina', lastName: 'Smirnova', nationality: 'RU', dateOfBirth: '1995-12-07', fieId: 'RUS33335', club: 'Moscow' },
  { firstName: 'Alexei', lastName: 'Kozlov', nationality: 'RU', dateOfBirth: '1993-08-14', fieId: 'RUS33336', club: 'Petersburg' },
  { firstName: 'Yelena', lastName: 'Popova', nationality: 'RU', dateOfBirth: '1996-04-21', fieId: 'RUS33337', club: 'Petersburg' },
  { firstName: 'Viktor', lastName: 'Novikov', nationality: 'RU', dateOfBirth: '1994-11-28', fieId: 'RUS33338', club: 'Petersburg' },

  // British Athletes
  { firstName: 'James', lastName: 'Thompson', nationality: 'GB', dateOfBirth: '1993-06-15', fieId: 'GBR44444', club: 'London' },
  { firstName: 'Emma', lastName: 'White', nationality: 'GB', dateOfBirth: '1995-10-22', fieId: 'GBR44445', club: 'London' },
  { firstName: 'William', lastName: 'Harris', nationality: 'GB', dateOfBirth: '1994-02-09', fieId: 'GBR44446', club: 'London' },
  { firstName: 'Charlotte', lastName: 'Martin', nationality: 'GB', dateOfBirth: '1996-07-16', fieId: 'GBR44447', club: 'Edinburgh' },
  { firstName: 'Oliver', lastName: 'Jackson', nationality: 'GB', dateOfBirth: '1992-11-03', fieId: 'GBR44448', club: 'Edinburgh' },
  { firstName: 'Sophie', lastName: 'Clark', nationality: 'GB', dateOfBirth: '1997-03-20', fieId: 'GBR44449', club: 'Edinburgh' },

  // Hungarian Athletes
  { firstName: 'Zoltán', lastName: 'Nagy', nationality: 'HU', dateOfBirth: '1993-04-12', fieId: 'HUN55555', club: 'Budapest' },
  { firstName: 'Eszter', lastName: 'Kovács', nationality: 'HU', dateOfBirth: '1995-08-29', fieId: 'HUN55556', club: 'Budapest' },
  { firstName: 'Gábor', lastName: 'Szabó', nationality: 'HU', dateOfBirth: '1994-12-16', fieId: 'HUN55557', club: 'Budapest' },
  { firstName: 'Petra', lastName: 'Tóth', nationality: 'HU', dateOfBirth: '1996-05-03', fieId: 'HUN55558', club: 'Debrecen' },
  { firstName: 'András', lastName: 'Varga', nationality: 'HU', dateOfBirth: '1992-09-20', fieId: 'HUN55559', club: 'Debrecen' },
  { firstName: 'Krisztina', lastName: 'Kiss', nationality: 'HU', dateOfBirth: '1997-01-07', fieId: 'HUN55560', club: 'Debrecen' },
]

// Club data with realistic information
const clubData = [
  // Spanish Clubs
  { name: 'Club de Esgrima Chamartín', city: 'Madrid', country: 'ES', shortName: 'Chamartín' },
  { name: 'Club de Esgrima Barcelona', city: 'Barcelona', country: 'ES', shortName: 'Barcelona' },
  { name: 'Club de Esgrima Sevilla', city: 'Sevilla', country: 'ES', shortName: 'Sevilla' },
  { name: 'Club de Esgrima Valencia', city: 'Valencia', country: 'ES', shortName: 'Valencia' },
  
  // French Clubs
  { name: 'Cercle d\'Escrime de Paris', city: 'Paris', country: 'FR', shortName: 'Paris' },
  { name: 'Club d\'Escrime de Lyon', city: 'Lyon', country: 'FR', shortName: 'Lyon' },
  { name: 'Cercle d\'Escrime de Marseille', city: 'Marseille', country: 'FR', shortName: 'Marseille' },
  
  // Italian Clubs
  { name: 'Circolo Scherma Roma', city: 'Roma', country: 'IT', shortName: 'Roma' },
  { name: 'Circolo Scherma Milano', city: 'Milano', country: 'IT', shortName: 'Milano' },
  { name: 'Circolo Scherma Napoli', city: 'Napoli', country: 'IT', shortName: 'Napoli' },
  { name: 'Circolo Scherma Torino', city: 'Torino', country: 'IT', shortName: 'Torino' },
  
  // German Clubs
  { name: 'Fechtclub Berlin', city: 'Berlin', country: 'DE', shortName: 'Berlin' },
  { name: 'Fechtclub München', city: 'München', country: 'DE', shortName: 'München' },
  { name: 'Fechtclub Hamburg', city: 'Hamburg', country: 'DE', shortName: 'Hamburg' },
  { name: 'Fechtclub Köln', city: 'Köln', country: 'DE', shortName: 'Köln' },
  
  // American Clubs
  { name: 'New York Fencing Club', city: 'New York', country: 'US', shortName: 'NYC' },
  { name: 'Los Angeles Fencing Club', city: 'Los Angeles', country: 'US', shortName: 'LA' },
  { name: 'Chicago Fencing Club', city: 'Chicago', country: 'US', shortName: 'Chicago' },
  { name: 'Boston Fencing Club', city: 'Boston', country: 'US', shortName: 'Boston' },
  
  // Russian Clubs
  { name: 'Moscow Fencing Club', city: 'Moscow', country: 'RU', shortName: 'Moscow' },
  { name: 'St. Petersburg Fencing Club', city: 'St. Petersburg', country: 'RU', shortName: 'Petersburg' },
  
  // British Clubs
  { name: 'London Fencing Club', city: 'London', country: 'GB', shortName: 'London' },
  { name: 'Edinburgh Fencing Club', city: 'Edinburgh', country: 'GB', shortName: 'Edinburgh' },
  
  // Hungarian Clubs
  { name: 'Budapest Fencing Club', city: 'Budapest', country: 'HU', shortName: 'Budapest' },
  { name: 'Debrecen Fencing Club', city: 'Debrecen', country: 'HU', shortName: 'Debrecen' },
]

async function main() {
  console.log('🌱 Seeding comprehensive tournament database...')

  // Create organizations
  const organization1 = await prisma.organization.upsert({
    where: { id: 'org-spanish-fed' },
    update: {},
    create: {
      id: 'org-spanish-fed',
      name: 'Federación Española de Esgrima',
      displayName: 'Real Fed. Española Esgrima',
      description: 'National federation governing fencing in Spain. Organizes national championships and international competitions.',
      city: 'Madrid',
      country: 'Spain',
      website: 'https://esgrima.es',
    },
  })

  const organization2 = await prisma.organization.upsert({
    where: { id: 'org-international' },
    update: {},
    create: {
      id: 'org-international',
      name: 'International Fencing Federation',
      displayName: 'FIE',
      description: 'International governing body for fencing. Organizes World Championships and Olympic competitions.',
      city: 'Lausanne',
      country: 'Switzerland',
      website: 'https://fie.org',
    },
  })

  const organization3 = await prisma.organization.upsert({
    where: { id: 'org-chamartin' },
    update: {},
    create: {
      id: 'org-chamartin',
      name: 'Club de Esgrima Chamartín',
      displayName: 'CE Chamartín',
      description: 'Historic fencing club in Madrid, founded in 1952. Specializing in épée and foil training.',
      city: 'Madrid',
      country: 'Spain',
      website: 'https://escrimachamartin.es',
    },
  })

  console.log('✅ Created organizations')

  // Create users
  const systemAdmin = await prisma.user.upsert({
    where: { email: 'admin@enguardia.com' },
    update: {},
    create: {
      email: 'admin@enguardia.com',
      name: 'System Administrator',
      role: UserRole.SYSTEM_ADMIN,
      organizationId: null,
    },
  })

  const orgAdmin1 = await prisma.user.upsert({
    where: { email: 'admin@esgrima.es' },
    update: {},
    create: {
      email: 'admin@esgrima.es',
      name: 'José María Rodríguez',
      role: UserRole.ADMIN,
      organizationId: organization1.id,
    },
  })

  const orgAdmin2 = await prisma.user.upsert({
    where: { email: 'admin@fie.org' },
    update: {},
    create: {
      email: 'admin@fie.org',
      name: 'Emmanuel Katsiadakis',
      role: UserRole.ADMIN,
      organizationId: organization2.id,
    },
  })

  const orgAdmin3 = await prisma.user.upsert({
    where: { email: 'admin@chamartin.es' },
    update: {},
    create: {
      email: 'admin@chamartin.es',
      name: 'Carlos Fernández',
      role: UserRole.ADMIN,
      organizationId: organization3.id,
    },
  })

  console.log('✅ Created users')

  // Create clubs
  const clubs = []
  for (const clubInfo of clubData) {
    const club = await prisma.club.upsert({
      where: { id: `club-${clubInfo.shortName.toLowerCase()}` },
      update: {},
      create: {
        id: `club-${clubInfo.shortName.toLowerCase()}`,
        name: clubInfo.name,
        city: clubInfo.city,
        country: clubInfo.country,
        imageUrl: null,
      },
    })
    clubs.push({ ...club, shortName: clubInfo.shortName })
  }

  console.log(`✅ Created ${clubs.length} clubs`)

  // Create athletes
  const athletes = []
  for (const athleteInfo of athleteData) {
    const club = clubs.find(c => c.shortName === athleteInfo.club)
    if (!club) continue

    const athlete = await prisma.athlete.upsert({
      where: { fieId: athleteInfo.fieId },
      update: {},
      create: {
        firstName: athleteInfo.firstName,
        lastName: athleteInfo.lastName,
        nationality: athleteInfo.nationality,
        dateOfBirth: new Date(athleteInfo.dateOfBirth),
        fieId: athleteInfo.fieId,
        isActive: true,
      },
    })
    athletes.push(athlete)

    // Create athlete weapon specialization
    await prisma.athleteWeapon.upsert({
      where: {
        athleteId_weapon: {
          athleteId: athlete.id,
          weapon: Weapon.EPEE,
        },
      },
      update: {},
      create: {
        athleteId: athlete.id,
        weapon: Weapon.EPEE,
      },
    })

    // Create club membership
    await prisma.athleteClub.upsert({
      where: {
        athleteId_clubId: {
          athleteId: athlete.id,
          clubId: club.id,
        },
      },
      update: {},
      create: {
        athleteId: athlete.id,
        clubId: club.id,
        membershipType: ClubMembershipType.MEMBER,
        status: MembershipStatus.ACTIVE,
        isPrimary: true,
      },
    })
  }

  console.log(`✅ Created ${athletes.length} athletes`)

  // Create tournaments with different states
  const now = new Date()
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  const nearFutureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

  // Tournament 1: COMPLETED - Spanish National Championships
  const tournament1 = await prisma.tournament.upsert({
    where: { id: 'spanish-nationals-2024' },
    update: {},
    create: {
      id: 'spanish-nationals-2024',
      name: 'Campeonato Nacional de España 2024',
      description: 'Annual Spanish National Fencing Championships featuring all weapons and categories.',
      startDate: new Date('2024-06-15'),
      endDate: new Date('2024-06-17'),
      venue: 'Palacio de Deportes de Madrid',
      status: TournamentStatus.COMPLETED,
      isPublic: true,
      isActive: false,
      organizationId: organization1.id,
      createdById: orgAdmin1.id,
    },
  })

  // Tournament 2: IN_PROGRESS - International Open
  const tournament2 = await prisma.tournament.upsert({
    where: { id: 'madrid-international-open' },
    update: {},
    create: {
      id: 'madrid-international-open',
      name: 'Madrid International Open',
      description: 'International fencing tournament open to all FIE-licensed athletes. Features épée and foil competitions.',
      startDate: nearFutureDate,
      endDate: new Date(nearFutureDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      venue: 'Centro Deportivo Municipal Chamartín',
      status: TournamentStatus.IN_PROGRESS,
      isPublic: true,
      isActive: true,
      organizationId: organization2.id,
      createdById: orgAdmin2.id,
    },
  })

  // Tournament 3: REGISTRATION_OPEN - Club Championship
  const tournament3 = await prisma.tournament.upsert({
    where: { id: 'chamartin-club-championship' },
    update: {},
    create: {
      id: 'chamartin-club-championship',
      name: 'Campeonato del Club Chamartín',
      description: 'Annual club championship for Chamartín members. All weapons and age categories welcome.',
      startDate: futureDate,
      endDate: new Date(futureDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      venue: 'Instalaciones Club Chamartín',
      status: TournamentStatus.REGISTRATION_OPEN,
      isPublic: false,
      isActive: true,
      organizationId: organization3.id,
      createdById: orgAdmin3.id,
    },
  })

  // Tournament 4: DRAFT - World Championships
  const tournament4 = await prisma.tournament.upsert({
    where: { id: 'world-championships-2025' },
    update: {},
    create: {
      id: 'world-championships-2025',
      name: 'World Fencing Championships 2025',
      description: 'The premier international fencing competition featuring individual and team events in all three weapons.',
      startDate: new Date('2025-07-15'),
      endDate: new Date('2025-07-25'),
      venue: 'Palau de la Música Catalana, Barcelona',
      status: TournamentStatus.DRAFT,
      isPublic: true,
      isActive: true,
      organizationId: organization2.id,
      createdById: orgAdmin2.id,
    },
  })

  // Tournament 5: CANCELLED - Regional Championship
  const tournament5 = await prisma.tournament.upsert({
    where: { id: 'madrid-regional-cancelled' },
    update: {},
    create: {
      id: 'madrid-regional-cancelled',
      name: 'Campeonato Regional de Madrid',
      description: 'Regional championship that was cancelled due to venue issues.',
      startDate: new Date('2024-05-20'),
      endDate: new Date('2024-05-22'),
      venue: 'Polideportivo Municipal',
      status: TournamentStatus.CANCELLED,
      isPublic: true,
      isActive: false,
      organizationId: organization1.id,
      createdById: orgAdmin1.id,
    },
  })

  console.log('✅ Created tournaments')

  // Create competitions for each tournament
  const competitions = []

  // Tournament 1 competitions (COMPLETED)
  const comp1_1 = await prisma.competition.create({
    data: {
      id: 'spanish-nationals-epee-men',
      name: 'Épée Masculino Absoluto',
      weapon: Weapon.EPEE,
      category: 'Senior Men',
      maxParticipants: 64,
      registrationDeadline: new Date('2024-06-10'),
      status: CompetitionStatus.COMPLETED,
      tournamentId: tournament1.id,
    },
  })

  const comp1_2 = await prisma.competition.create({
    data: {
      id: 'spanish-nationals-epee-women',
      name: 'Épée Femenino Absoluto',
      weapon: Weapon.EPEE,
      category: 'Senior Women',
      maxParticipants: 48,
      registrationDeadline: new Date('2024-06-10'),
      status: CompetitionStatus.COMPLETED,
      tournamentId: tournament1.id,
    },
  })

  const comp1_3 = await prisma.competition.create({
    data: {
      id: 'spanish-nationals-foil-men',
      name: 'Florete Masculino Absoluto',
      weapon: Weapon.FOIL,
      category: 'Senior Men',
      maxParticipants: 56,
      registrationDeadline: new Date('2024-06-10'),
      status: CompetitionStatus.COMPLETED,
      tournamentId: tournament1.id,
    },
  })

  // Tournament 2 competitions (IN_PROGRESS)
  const comp2_1 = await prisma.competition.create({
    data: {
      id: 'madrid-open-epee-open',
      name: 'Épée Open',
      weapon: Weapon.EPEE,
      category: 'Open',
      maxParticipants: 80,
      registrationDeadline: new Date(nearFutureDate.getTime() - 2 * 24 * 60 * 60 * 1000),
      status: CompetitionStatus.IN_PROGRESS,
      tournamentId: tournament2.id,
    },
  })

  const comp2_2 = await prisma.competition.create({
    data: {
      id: 'madrid-open-foil-open',
      name: 'Florete Open',
      weapon: Weapon.FOIL,
      category: 'Open',
      maxParticipants: 64,
      registrationDeadline: new Date(nearFutureDate.getTime() - 2 * 24 * 60 * 60 * 1000),
      status: CompetitionStatus.IN_PROGRESS,
      tournamentId: tournament2.id,
    },
  })

  const comp2_3 = await prisma.competition.create({
    data: {
      id: 'madrid-open-epee-veterans',
      name: 'Épée Veteranos',
      weapon: Weapon.EPEE,
      category: 'Veterans',
      maxParticipants: 32,
      registrationDeadline: new Date(nearFutureDate.getTime() - 2 * 24 * 60 * 60 * 1000),
      status: CompetitionStatus.REGISTRATION_OPEN,
      tournamentId: tournament2.id,
    },
  })

  // Tournament 3 competitions (REGISTRATION_OPEN)
  const comp3_1 = await prisma.competition.create({
    data: {
      id: 'chamartin-club-epee',
      name: 'Épée Club Championship',
      weapon: Weapon.EPEE,
      category: 'Club Members',
      maxParticipants: 40,
      registrationDeadline: new Date(futureDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      status: CompetitionStatus.REGISTRATION_OPEN,
      tournamentId: tournament3.id,
    },
  })

  const comp3_2 = await prisma.competition.create({
    data: {
      id: 'chamartin-club-foil',
      name: 'Florete Club Championship',
      weapon: Weapon.FOIL,
      category: 'Club Members',
      maxParticipants: 32,
      registrationDeadline: new Date(futureDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      status: CompetitionStatus.REGISTRATION_OPEN,
      tournamentId: tournament3.id,
    },
  })

  const comp3_3 = await prisma.competition.create({
    data: {
      id: 'chamartin-club-sabre',
      name: 'Sable Club Championship',
      weapon: Weapon.SABRE,
      category: 'Club Members',
      maxParticipants: 24,
      registrationDeadline: new Date(futureDate.getTime() - 7 * 24 * 60 * 60 * 1000),
      status: CompetitionStatus.REGISTRATION_OPEN,
      tournamentId: tournament3.id,
    },
  })

  // Tournament 4 competitions (DRAFT)
  const comp4_1 = await prisma.competition.create({
    data: {
      id: 'worlds-2025-epee-men',
      name: 'Men\'s Épée Individual',
      weapon: Weapon.EPEE,
      category: 'Senior Men',
      maxParticipants: 200,
      registrationDeadline: new Date('2025-06-15'),
      status: CompetitionStatus.DRAFT,
      tournamentId: tournament4.id,
    },
  })

  const comp4_2 = await prisma.competition.create({
    data: {
      id: 'worlds-2025-epee-women',
      name: 'Women\'s Épée Individual',
      weapon: Weapon.EPEE,
      category: 'Senior Women',
      maxParticipants: 180,
      registrationDeadline: new Date('2025-06-15'),
      status: CompetitionStatus.DRAFT,
      tournamentId: tournament4.id,
    },
  })

  const comp4_3 = await prisma.competition.create({
    data: {
      id: 'worlds-2025-foil-men',
      name: 'Men\'s Foil Individual',
      weapon: Weapon.FOIL,
      category: 'Senior Men',
      maxParticipants: 200,
      registrationDeadline: new Date('2025-06-15'),
      status: CompetitionStatus.DRAFT,
      tournamentId: tournament4.id,
    },
  })

  const comp4_4 = await prisma.competition.create({
    data: {
      id: 'worlds-2025-foil-women',
      name: 'Women\'s Foil Individual',
      weapon: Weapon.FOIL,
      category: 'Senior Women',
      maxParticipants: 180,
      registrationDeadline: new Date('2025-06-15'),
      status: CompetitionStatus.DRAFT,
      tournamentId: tournament4.id,
    },
  })

  const comp4_5 = await prisma.competition.create({
    data: {
      id: 'worlds-2025-sabre-men',
      name: 'Men\'s Sabre Individual',
      weapon: Weapon.SABRE,
      category: 'Senior Men',
      maxParticipants: 200,
      registrationDeadline: new Date('2025-06-15'),
      status: CompetitionStatus.DRAFT,
      tournamentId: tournament4.id,
    },
  })

  const comp4_6 = await prisma.competition.create({
    data: {
      id: 'worlds-2025-sabre-women',
      name: 'Women\'s Sabre Individual',
      weapon: Weapon.SABRE,
      category: 'Senior Women',
      maxParticipants: 180,
      registrationDeadline: new Date('2025-06-15'),
      status: CompetitionStatus.DRAFT,
      tournamentId: tournament4.id,
    },
  })

  // Tournament 5 competitions (CANCELLED)
  const comp5_1 = await prisma.competition.create({
    data: {
      id: 'madrid-regional-cancelled-epee',
      name: 'Épée Regional',
      weapon: Weapon.EPEE,
      category: 'Regional',
      maxParticipants: 50,
      registrationDeadline: new Date('2024-05-15'),
      status: CompetitionStatus.CANCELLED,
      tournamentId: tournament5.id,
    },
  })

  competitions.push(comp1_1, comp1_2, comp1_3, comp2_1, comp2_2, comp2_3, comp3_1, comp3_2, comp3_3, comp4_1, comp4_2, comp4_3, comp4_4, comp4_5, comp4_6, comp5_1)

  console.log(`✅ Created ${competitions.length} competitions`)

  // Create registrations for active competitions
  const registrations = []

  // Register athletes for Madrid Open competitions (active tournament)
  const madridOpenCompetitions = [comp2_1, comp2_2, comp2_3]
  for (const competition of madridOpenCompetitions) {
    const maxRegistrations = Math.min(competition.maxParticipants || 32, athletes.length)
    const registrationCount = Math.floor(maxRegistrations * 0.8) // 80% registration rate
    
    for (let i = 0; i < registrationCount; i++) {
      const athlete = athletes[i]
      const registration = await prisma.competitionRegistration.create({
        data: {
          competitionId: competition.id,
          athleteId: athlete.id,
          seedNumber: i + 1,
          isPresent: Math.random() > 0.1, // 90% presence rate
          status: RegistrationStatus.CONFIRMED,
          registeredAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random registration within last week
        },
      })
      registrations.push(registration)
    }
  }

  // Register some athletes for club championships (registration open)
  const clubCompetitions = [comp3_1, comp3_2, comp3_3]
  for (const competition of clubCompetitions) {
    const maxRegistrations = Math.min(competition.maxParticipants || 24, 15) // Limit to Chamartín athletes
    const chamartinAthletes = athletes.filter(a => a.firstName === 'Ana' || a.firstName === 'Carlos' || a.firstName === 'María' || a.firstName === 'David' || a.firstName === 'Laura')
    
    for (let i = 0; i < Math.min(maxRegistrations, chamartinAthletes.length); i++) {
      const athlete = chamartinAthletes[i]
      const registration = await prisma.competitionRegistration.create({
        data: {
          competitionId: competition.id,
          athleteId: athlete.id,
          seedNumber: i + 1,
          isPresent: false, // Future tournament
          status: RegistrationStatus.CONFIRMED,
          registeredAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000), // Random registration within last 2 weeks
        },
      })
      registrations.push(registration)
    }
  }

  console.log(`✅ Created ${registrations.length} registrations`)

  // Create phases for some competitions
  const phases = []

  // Create phases for the active Madrid Open Épée competition
  const phase1 = await prisma.phase.create({
    data: {
      name: 'Poules Qualification',
      phaseType: PhaseType.POULE,
      status: PhaseStatus.ACTIVE,
      sequenceOrder: 1,
      competitionId: comp2_1.id,
      qualificationQuota: 24,
      qualificationPercentage: 60,
      pouleSizeVariations: JSON.stringify([
        { size: 7, count: 5 },
        { size: 5, count: 1 }
      ]),
      separationRules: JSON.stringify({
        byClub: true,
        byNationality: true,
        priority: ['club', 'nationality']
      }),
      configuration: JSON.stringify({
        touchLimit: 5,
        timeLimit: 180,
        doubleHitsAllowed: true
      }),
    },
  })

  const phase2 = await prisma.phase.create({
    data: {
      name: 'Direct Elimination',
      phaseType: PhaseType.DIRECT_ELIMINATION,
      status: PhaseStatus.PENDING,
      sequenceOrder: 2,
      competitionId: comp2_1.id,
      qualificationQuota: 1,
      qualificationPercentage: null,
      configuration: JSON.stringify({
        touchLimit: 15,
        timeLimit: 540,
        doubleHitsAllowed: false,
        format: 'single_elimination',
        thirdPlaceMatch: true
      }),
    },
  })

  phases.push(phase1, phase2)

  console.log(`✅ Created ${phases.length} phases`)

  console.log('🎉 Database seeding completed successfully!')
  console.log(`
  📊 Summary:
  - ${clubData.length} clubs created
  - ${athleteData.length} athletes created
  - 5 tournaments created (different statuses)
  - ${competitions.length} competitions created
  - ${registrations.length} registrations created
  - ${phases.length} phases created
  
  🏆 Tournaments created:
  1. Spanish Nationals 2024 (COMPLETED) - 3 competitions
  2. Madrid International Open (IN_PROGRESS) - 3 competitions
  3. Chamartín Club Championship (REGISTRATION_OPEN) - 3 competitions
  4. World Championships 2025 (DRAFT) - 6 competitions
  5. Madrid Regional (CANCELLED) - 1 competition
  `)
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
 