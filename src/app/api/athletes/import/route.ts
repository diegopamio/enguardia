import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseCSVFile, parseXMLFile, ParsedAthlete } from '@/lib/roster-parser';
import { z } from 'zod';

const importRequestSchema = z.object({
  fileType: z.enum(['csv', 'xml']),
  fileContent: z.string(),
  organizationId: z.string().optional(),
  duplicateStrategy: z.enum(['skip', 'update', 'error']).default('skip'),
  createAffiliations: z.boolean().default(true),
});

// POST /api/athletes/import - Import athletes from FIE XML/CSV
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only admins can import
    if (!['ORGANIZATION_ADMIN', 'SYSTEM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { fileType, fileContent, organizationId, duplicateStrategy, createAffiliations } = 
      importRequestSchema.parse(body);

    // Parse the file based on type
    let parsedAthletes: ParsedAthlete[];
    
    try {
      if (fileType === 'csv') {
        parsedAthletes = await parseCSVFile(fileContent);
      } else {
        parsedAthletes = await parseXMLFile(fileContent);
      }
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Failed to parse file', details: parseError instanceof Error ? parseError.message : 'Unknown parse error' },
        { status: 400 }
      );
    }

    if (parsedAthletes.length === 0) {
      return NextResponse.json(
        { error: 'No valid athletes found in file' },
        { status: 400 }
      );
    }

    // Process athletes with duplicate detection
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      athletes: [] as any[],
    };

    for (const parsedAthlete of parsedAthletes) {
      try {
        // Find potential duplicates
        const existingAthlete = await findDuplicate(parsedAthlete);

        if (existingAthlete) {
          switch (duplicateStrategy) {
            case 'error':
              results.errors.push(`Duplicate athlete found: ${parsedAthlete.firstName} ${parsedAthlete.lastName}`);
              continue;
              
            case 'skip':
              results.skipped++;
              
              // Still create affiliation if requested and doesn't exist
              if (createAffiliations && organizationId) {
                await createOrganizationAffiliation(existingAthlete.id, organizationId);
              }
              continue;
              
            case 'update':
              const updatedAthlete = await updateAthlete(existingAthlete.id, parsedAthlete, organizationId, createAffiliations);
              results.updated++;
              results.athletes.push(updatedAthlete);
              continue;
          }
        } else {
          // Create new athlete
          const newAthlete = await createAthlete(parsedAthlete, organizationId, createAffiliations);
          results.created++;
          results.athletes.push(newAthlete);
        }
      } catch (error) {
        results.errors.push(`Error processing ${parsedAthlete.firstName} ${parsedAthlete.lastName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
      results,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to find duplicate athletes
async function findDuplicate(athlete: ParsedAthlete) {
  // First try FIE ID (most reliable)
  if (athlete.fieId) {
    const byFieId = await prisma.athlete.findUnique({
      where: { fieId: athlete.fieId },
    });
    if (byFieId) return byFieId;
  }

  // Then try name + date of birth combination
  if (athlete.dateOfBirth) {
    const byNameAndBirth = await prisma.athlete.findFirst({
      where: {
        firstName: { equals: athlete.firstName, mode: 'insensitive' },
        lastName: { equals: athlete.lastName, mode: 'insensitive' },
        dateOfBirth: athlete.dateOfBirth,
      },
    });
    if (byNameAndBirth) return byNameAndBirth;
  }

  // Finally try exact name match (less reliable)
  const byName = await prisma.athlete.findFirst({
    where: {
      firstName: { equals: athlete.firstName, mode: 'insensitive' },
      lastName: { equals: athlete.lastName, mode: 'insensitive' },
    },
  });

  return byName;
}

// Helper function to create organization affiliation
async function createOrganizationAffiliation(athleteId: string, organizationId: string) {
  try {
    await prisma.athleteOrganization.upsert({
      where: {
        athleteId_organizationId: {
          athleteId,
          organizationId,
        },
      },
      create: {
        athleteId,
        organizationId,
        membershipType: 'MEMBER',
        status: 'ACTIVE',
      },
      update: {
        status: 'ACTIVE', // Reactivate if previously inactive
      },
    });
  } catch (error) {
    // Ignore if affiliation already exists or organization doesn't exist
    console.warn(`Could not create affiliation for athlete ${athleteId} in org ${organizationId}`);
  }
}

// Helper function to update existing athlete
async function updateAthlete(athleteId: string, parsedAthlete: ParsedAthlete, organizationId?: string, createAffiliations = true) {
  const updatedAthlete = await prisma.athlete.update({
    where: { id: athleteId },
    data: {
      // Update fields that might have changed
      nationality: parsedAthlete.nationality || undefined,
      fieId: parsedAthlete.fieId || undefined,
      dateOfBirth: parsedAthlete.dateOfBirth || undefined,
      isActive: true, // Reactivate if importing
    },
    include: {
      weapons: true,
      organizations: {
        include: {
          organization: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  // Create weapon specializations if provided
  if (parsedAthlete.weapons && parsedAthlete.weapons.length > 0) {
    for (const weapon of parsedAthlete.weapons) {
      await prisma.athleteWeapon.upsert({
        where: {
          athleteId_weapon: {
            athleteId,
            weapon,
          },
        },
        create: {
          athleteId,
          weapon,
        },
        update: {}, // No updates needed
      });
    }
  }

  // Create organization affiliation if requested
  if (createAffiliations && organizationId) {
    await createOrganizationAffiliation(athleteId, organizationId);
  }

  return updatedAthlete;
}

// Helper function to create new athlete
async function createAthlete(parsedAthlete: ParsedAthlete, organizationId?: string, createAffiliations = true) {
  const newAthlete = await prisma.athlete.create({
    data: {
      firstName: parsedAthlete.firstName,
      lastName: parsedAthlete.lastName,
      dateOfBirth: parsedAthlete.dateOfBirth,
      nationality: parsedAthlete.nationality,
      fieId: parsedAthlete.fieId,
      isActive: true,
      // Create weapon specializations
      weapons: {
        create: parsedAthlete.weapons?.map(weapon => ({ weapon })) || [],
      },
      // Create organizational affiliation if specified
      ...(createAffiliations && organizationId && {
        organizations: {
          create: {
            organizationId,
            membershipType: 'MEMBER',
            status: 'ACTIVE',
          },
        },
      }),
    },
    include: {
      weapons: true,
      organizations: {
        include: {
          organization: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return newAthlete;
} 