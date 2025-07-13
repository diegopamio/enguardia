import { PrismaClient, UserRole, Weapon, MembershipType, MembershipStatus, TournamentStatus, CompetitionStatus, PhaseType, PhaseStatus, RegistrationStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding basic tournament database...')

  // Create organizations
  const organization1 = await prisma.organization.upsert({
    where: { id: 'org-spanish-fed' },
    update: {},
    create: {
      id: 'org-spanish-fed',
      name: 'Federación Española de Esgrima',
      displayName: 'Real Fed. Española Esgrima',
      description: 'National federation governing fencing in Spain.',
      city: 'Madrid',
      country: 'Spain',
      website: 'https://esgrima.es',
    },
  })

  console.log('✅ Created organization:', organization1.displayName)

  // Create admin user
  const orgAdmin1 = await prisma.user.upsert({
    where: { email: 'admin@esgrima.es' },
    update: {},
    create: {
      email: 'admin@esgrima.es',
      name: 'María González',
      role: UserRole.ORGANIZATION_ADMIN,
      organizationId: organization1.id,
    },
  })

  console.log('✅ Created admin user')

  // Create some clubs
  const clubs = []
  const clubData = [
    { name: 'Club de Esgrima Chamartín', city: 'Madrid', country: 'ES' },
    { name: 'Club de Esgrima Barcelona', city: 'Barcelona', country: 'ES' },
    { name: 'Club de Esgrima Valencia', city: 'Valencia', country: 'ES' },
    { name: 'Cercle d\'Escrime de Paris', city: 'Paris', country: 'FR' },
    { name: 'Circolo Scherma Roma', city: 'Roma', country: 'IT' },
  ]

  for (let i = 0; i < clubData.length; i++) {
    const clubInfo = clubData[i]
    const club = await prisma.club.upsert({
      where: { id: `club-${i + 1}` },
      update: {},
      create: {
        id: `club-${i + 1}`,
        name: clubInfo.name,
        city: clubInfo.city,
        country: clubInfo.country,
      },
    })
    clubs.push(club)
  }

  console.log('✅ Created', clubs.length, 'clubs')

  // Create athletes
  const athleteData = [
    { firstName: 'Ana', lastName: 'García', nationality: 'ES', dateOfBirth: '1995-03-15', clubIndex: 0 },
    { firstName: 'Carlos', lastName: 'Rodríguez', nationality: 'ES', dateOfBirth: '1993-07-22', clubIndex: 0 },
    { firstName: 'María', lastName: 'López', nationality: 'ES', dateOfBirth: '1996-11-08', clubIndex: 0 },
    { firstName: 'David', lastName: 'Martín', nationality: 'ES', dateOfBirth: '1994-05-12', clubIndex: 1 },
    { firstName: 'Laura', lastName: 'Sánchez', nationality: 'ES', dateOfBirth: '1997-09-30', clubIndex: 1 },
    { firstName: 'Pablo', lastName: 'Fernández', nationality: 'ES', dateOfBirth: '1992-12-03', clubIndex: 1 },
    { firstName: 'Isabel', lastName: 'Ruiz', nationality: 'ES', dateOfBirth: '1995-08-17', clubIndex: 2 },
    { firstName: 'Alejandro', lastName: 'Moreno', nationality: 'ES', dateOfBirth: '1993-04-25', clubIndex: 2 },
    { firstName: 'Marie', lastName: 'Dubois', nationality: 'FR', dateOfBirth: '1998-11-08', clubIndex: 3 },
    { firstName: 'Pierre', lastName: 'Martin', nationality: 'FR', dateOfBirth: '1995-04-15', clubIndex: 3 },
    { firstName: 'Paolo', lastName: 'Rossi', nationality: 'IT', dateOfBirth: '1996-05-12', clubIndex: 4 },
    { firstName: 'Giulia', lastName: 'Bianchi', nationality: 'IT', dateOfBirth: '1994-09-30', clubIndex: 4 },
    { firstName: 'John', lastName: 'Smith', nationality: 'US', dateOfBirth: '1992-07-22', clubIndex: 0 },
    { firstName: 'Sarah', lastName: 'Johnson', nationality: 'US', dateOfBirth: '1995-11-08', clubIndex: 1 },
    { firstName: 'Michael', lastName: 'Williams', nationality: 'US', dateOfBirth: '1993-04-15', clubIndex: 2 },
    { firstName: 'Emily', lastName: 'Brown', nationality: 'US', dateOfBirth: '1996-08-30', clubIndex: 3 },
    { firstName: 'Hans', lastName: 'Müller', nationality: 'DE', dateOfBirth: '1994-03-12', clubIndex: 4 },
    { firstName: 'Anna', lastName: 'Schmidt', nationality: 'DE', dateOfBirth: '1996-07-28', clubIndex: 0 },
    { firstName: 'Klaus', lastName: 'Weber', nationality: 'DE', dateOfBirth: '1993-11-15', clubIndex: 1 },
    { firstName: 'Petra', lastName: 'Wagner', nationality: 'DE', dateOfBirth: '1995-05-03', clubIndex: 2 },
    // Add more athletes for a good test set
    { firstName: 'Sofia', lastName: 'Petrov', nationality: 'RU', dateOfBirth: '1994-09-30', clubIndex: 3 },
    { firstName: 'Dmitri', lastName: 'Volkov', nationality: 'RU', dateOfBirth: '1992-05-18', clubIndex: 4 },
    { firstName: 'James', lastName: 'Thompson', nationality: 'GB', dateOfBirth: '1993-06-15', clubIndex: 0 },
    { firstName: 'Emma', lastName: 'White', nationality: 'GB', dateOfBirth: '1995-10-22', clubIndex: 1 },
    { firstName: 'Zoltán', lastName: 'Nagy', nationality: 'HU', dateOfBirth: '1993-04-12', clubIndex: 2 },
    { firstName: 'Eszter', lastName: 'Kovács', nationality: 'HU', dateOfBirth: '1995-08-29', clubIndex: 3 },
    { firstName: 'Jean', lastName: 'Petit', nationality: 'FR', dateOfBirth: '1996-12-10', clubIndex: 4 },
    { firstName: 'Camille', lastName: 'Robert', nationality: 'FR', dateOfBirth: '1994-06-18', clubIndex: 0 },
    { firstName: 'Marco', lastName: 'Verdi', nationality: 'IT', dateOfBirth: '1995-07-18', clubIndex: 1 },
    { firstName: 'Francesca', lastName: 'Neri', nationality: 'IT', dateOfBirth: '1993-11-25', clubIndex: 2 },
    { firstName: 'Thomas', lastName: 'Becker', nationality: 'DE', dateOfBirth: '1992-09-21', clubIndex: 3 },
    { firstName: 'Sabine', lastName: 'Schulz', nationality: 'DE', dateOfBirth: '1997-01-18', clubIndex: 4 },
    { firstName: 'Robert', lastName: 'Wilson', nationality: 'US', dateOfBirth: '1992-09-12', clubIndex: 0 },
    { firstName: 'Ashley', lastName: 'Moore', nationality: 'US', dateOfBirth: '1995-06-19', clubIndex: 1 },
    { firstName: 'Katarina', lastName: 'Smirnova', nationality: 'RU', dateOfBirth: '1995-12-07', clubIndex: 2 },
    { firstName: 'Alexei', lastName: 'Kozlov', nationality: 'RU', dateOfBirth: '1993-08-14', clubIndex: 3 },
    { firstName: 'William', lastName: 'Harris', nationality: 'GB', dateOfBirth: '1994-02-09', clubIndex: 4 },
    { firstName: 'Charlotte', lastName: 'Martin', nationality: 'GB', dateOfBirth: '1996-07-16', clubIndex: 0 },
    { firstName: 'Gábor', lastName: 'Szabó', nationality: 'HU', dateOfBirth: '1994-12-16', clubIndex: 1 },
    { firstName: 'Petra', lastName: 'Tóth', nationality: 'HU', dateOfBirth: '1996-05-03', clubIndex: 2 },
  ]

  const athletes = []
  for (let i = 0; i < athleteData.length; i++) {
    const athleteInfo = athleteData[i]
    const fieId = `${athleteInfo.nationality}${String(i + 1).padStart(6, '0')}`
    
    const athlete = await prisma.athlete.upsert({
      where: { id: `athlete-${i + 1}` },
      update: {},
      create: {
        id: `athlete-${i + 1}`,
        firstName: athleteInfo.firstName,
        lastName: athleteInfo.lastName,
        dateOfBirth: new Date(athleteInfo.dateOfBirth),
        nationality: athleteInfo.nationality,
        fieId: fieId,
      },
    })
    athletes.push(athlete)

    // Add weapon specialization (épée for all for simplicity)
    await prisma.athleteWeapon.upsert({
      where: { 
        athleteId_weapon: { 
          athleteId: athlete.id, 
          weapon: Weapon.EPEE 
        } 
      },
      update: {},
      create: {
        athleteId: athlete.id,
        weapon: Weapon.EPEE,
      },
    })

    // Associate with club
    const club = clubs[athleteInfo.clubIndex]
    if (club) {
      await prisma.athleteClub.upsert({
        where: { 
          athleteId_clubId: { 
            athleteId: athlete.id, 
            clubId: club.id 
          } 
        },
        update: {},
        create: {
          athleteId: athlete.id,
          clubId: club.id,
          membershipType: MembershipType.REGULAR,
          status: MembershipStatus.ACTIVE,
          isPrimary: true,
          joinedAt: new Date('2020-01-01'),
        },
      })
    }

    // Associate Spanish athletes with the federation
    if (athleteInfo.nationality === 'ES') {
      await prisma.athleteOrganization.upsert({
        where: { 
          athleteId_organizationId: { 
            athleteId: athlete.id, 
            organizationId: organization1.id 
          } 
        },
        update: {},
        create: {
          athleteId: athlete.id,
          organizationId: organization1.id,
          membershipType: MembershipType.REGULAR,
          status: MembershipStatus.ACTIVE,
          joinedAt: new Date('2020-01-01'),
        },
      })
    }
  }

  console.log('✅ Created', athletes.length, 'athletes with club associations')

  // Create a tournament
  const tournament1 = await prisma.tournament.upsert({
    where: { id: 'tournament-test' },
    update: {},
    create: {
      id: 'tournament-test',
      name: 'Test Tournament 2024',
      description: 'Test tournament for formula engine development',
      startDate: new Date('2024-09-15'),
      endDate: new Date('2024-09-17'),
      venue: 'Madrid, Spain',
      status: TournamentStatus.IN_PROGRESS,
      organizationId: organization1.id,
      createdById: orgAdmin1.id, // Required field
      isPublic: true,
      isActive: true,
    },
  })

  console.log('✅ Created tournament:', tournament1.name)

  // Create a competition
  const comp1 = await prisma.competition.upsert({
    where: { id: 'comp-test-epee' },
    update: {},
    create: {
      id: 'comp-test-epee',
      tournamentId: tournament1.id,
      name: 'Test Épée Competition',
      weapon: Weapon.EPEE,
      category: 'Senior',
      maxParticipants: 40,
      status: CompetitionStatus.IN_PROGRESS,
      registrationDeadline: new Date('2024-09-10'),
    },
  })

  console.log('✅ Created competition:', comp1.name)

  // Register athletes to the competition
  for (let i = 0; i < Math.min(40, athletes.length); i++) {
    const athlete = athletes[i]
    await prisma.competitionRegistration.upsert({
      where: { 
        competitionId_athleteId: { 
          competitionId: comp1.id, 
          athleteId: athlete.id 
        } 
      },
      update: {},
      create: {
        competitionId: comp1.id,
        athleteId: athlete.id,
        seedNumber: i + 1,
        isPresent: Math.random() > 0.1, // 90% present
        status: RegistrationStatus.CHECKED_IN,
        registeredAt: new Date('2024-08-15'),
      },
    })
  }

  console.log('✅ Registered 40 athletes to competition')

  // Create phases for multi-round testing
  const phase1 = await prisma.phase.upsert({
    where: { id: 'phase-test-poules1' },
    update: {},
    create: {
      id: 'phase-test-poules1',
      competitionId: comp1.id,
      name: 'Poules Round 1',
      phaseType: PhaseType.POULE,
      sequenceOrder: 1,
      status: PhaseStatus.SCHEDULED,
      qualificationQuota: 24, // Top 24 advance
      pouleSizeVariations: JSON.stringify({
        method: 'variable',
        sizes: [7, 7, 7, 7, 5, 7] // 5 poules of 7, 1 poule of 5
      }),
      separationRules: JSON.stringify({
        club: true,
        country: true,
        maxSameClub: 1,
        maxSameCountry: 2
      }),
    },
  })

  const phase2 = await prisma.phase.upsert({
    where: { id: 'phase-test-poules2' },
    update: {},
    create: {
      id: 'phase-test-poules2',
      competitionId: comp1.id,
      name: 'Poules Round 2',
      phaseType: PhaseType.POULE,
      sequenceOrder: 2,
      status: PhaseStatus.SCHEDULED,
      qualificationQuota: 16, // Top 16 advance to DE
      pouleSizeVariations: JSON.stringify({
        method: 'variable',
        sizes: [6, 6, 6, 6] // 4 poules of 6
      }),
      separationRules: JSON.stringify({
        club: true,
        country: true,
        maxSameClub: 1,
        maxSameCountry: 2
      }),
    },
  })

  const phase3 = await prisma.phase.upsert({
    where: { id: 'phase-test-de' },
    update: {},
    create: {
      id: 'phase-test-de',
      competitionId: comp1.id,
      name: 'Direct Elimination',
      phaseType: PhaseType.DIRECT_ELIMINATION,
      sequenceOrder: 3,
      status: PhaseStatus.SCHEDULED,
      configuration: JSON.stringify({
        tableauSize: 16,
        hasThirdPlace: true
      }),
    },
  })

  console.log('✅ Created 3 phases for multi-round testing')

  console.log('\n🎉 Basic database seeded successfully!')
  console.log('\n📊 Summary:')
  console.log(`- Organizations: 1`)
  console.log(`- Users: 1 admin`)
  console.log(`- Clubs: ${clubs.length}`)
  console.log(`- Athletes: ${athletes.length}`)
  console.log(`- Tournaments: 1`)
  console.log(`- Competitions: 1 (40 registered athletes)`)
  console.log(`- Phases: 3 (2 poule rounds + DE)`)
  
  console.log('\n🏆 Test Competition Available:')
  console.log('- Test Épée Competition (40 athletes, 2 poule rounds + DE)')
  
  console.log('\n✨ Ready to test multi-round tournament formulas!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 