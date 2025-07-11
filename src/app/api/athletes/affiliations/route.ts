import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for bulk affiliation operations
const bulkAffiliationSchema = z.object({
  athleteIds: z.array(z.string()).min(1, 'At least one athlete ID is required'),
  operation: z.enum(['add', 'remove', 'update']),
  type: z.enum(['organization', 'club']),
  targetId: z.string().min(1, 'Target ID is required'),
  membershipType: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
  isPrimary: z.boolean().optional(), // Only for club affiliations
});

const transferAthleteSchema = z.object({
  athleteId: z.string(),
  fromOrganizationId: z.string(),
  toOrganizationId: z.string(),
  membershipType: z.enum(['MEMBER', 'GUEST', 'VISITING_ATHLETE']).default('MEMBER'),
  transferClubs: z.boolean().default(false),
});

// POST /api/athletes/affiliations - Bulk affiliation management
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!['SYSTEM_ADMIN', 'ORGANIZATION_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'transfer') {
      return handleAthleteTransfer(body, session);
    } else {
      return handleBulkAffiliation(body, session);
    }

  } catch (error) {
    console.error('Error in affiliation management:', error);
    return NextResponse.json(
      { error: 'Failed to manage affiliations' },
      { status: 500 }
    );
  }
}

async function handleBulkAffiliation(body: any, session: any) {
  const validatedData = bulkAffiliationSchema.parse(body);
  const { athleteIds, operation, type, targetId, membershipType, status, isPrimary } = validatedData;

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const athleteId of athleteIds) {
    try {
      // Verify athlete exists and user has access
      const athlete = await prisma.athlete.findFirst({
        where: {
          id: athleteId,
          // Restrict to organization athletes for org admins
          ...(session.user.role !== 'SYSTEM_ADMIN' && session.user.organizationId && {
            organizations: {
              some: {
                organizationId: session.user.organizationId,
                status: 'ACTIVE',
              },
            },
          }),
        },
      });

      if (!athlete) {
        results.errors.push(`Athlete ${athleteId} not found or access denied`);
        results.failed++;
        continue;
      }

      if (type === 'organization') {
        await handleOrganizationAffiliation(athleteId, targetId, operation, membershipType, status);
      } else if (type === 'club') {
        await handleClubAffiliation(athleteId, targetId, operation, membershipType, status, isPrimary);
      }

      results.success++;
    } catch (error) {
      results.errors.push(`Failed to process athlete ${athleteId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.failed++;
    }
  }

  return NextResponse.json({
    message: `Bulk affiliation operation completed. ${results.success} successful, ${results.failed} failed.`,
    results,
  });
}

async function handleOrganizationAffiliation(
  athleteId: string,
  organizationId: string,
  operation: string,
  membershipType?: string,
  status?: string
) {
  switch (operation) {
    case 'add':
      await prisma.athleteOrganization.upsert({
        where: {
          athleteId_organizationId: { athleteId, organizationId },
        },
        create: {
          athleteId,
          organizationId,
          membershipType: (membershipType || 'MEMBER') as any,
          status: (status || 'ACTIVE') as any,
        },
        update: {
          status: (status || 'ACTIVE') as any,
          membershipType: (membershipType || 'MEMBER') as any,
        },
      });
      break;

    case 'remove':
      await prisma.athleteOrganization.deleteMany({
        where: { athleteId, organizationId },
      });
      break;

    case 'update':
      await prisma.athleteOrganization.updateMany({
        where: { athleteId, organizationId },
        data: {
          ...(membershipType && { membershipType: membershipType as any }),
          ...(status && { status: status as any }),
        },
      });
      break;
  }
}

async function handleClubAffiliation(
  athleteId: string,
  clubId: string,
  operation: string,
  membershipType?: string,
  status?: string,
  isPrimary?: boolean
) {
  switch (operation) {
    case 'add':
      // If setting as primary, remove primary status from other clubs
      if (isPrimary) {
        await prisma.athleteClub.updateMany({
          where: { athleteId },
          data: { isPrimary: false },
        });
      }

      await prisma.athleteClub.upsert({
        where: {
          athleteId_clubId: { athleteId, clubId },
        },
        create: {
          athleteId,
          clubId,
          membershipType: (membershipType || 'MEMBER') as any,
          status: (status || 'ACTIVE') as any,
          isPrimary: isPrimary || false,
        },
        update: {
          status: (status || 'ACTIVE') as any,
          membershipType: (membershipType || 'MEMBER') as any,
          isPrimary: isPrimary || false,
        },
      });
      break;

    case 'remove':
      await prisma.athleteClub.deleteMany({
        where: { athleteId, clubId },
      });
      break;

    case 'update':
      // If setting as primary, remove primary status from other clubs
      if (isPrimary) {
        await prisma.athleteClub.updateMany({
          where: { athleteId, clubId: { not: clubId } },
          data: { isPrimary: false },
        });
      }

      await prisma.athleteClub.updateMany({
        where: { athleteId, clubId },
        data: {
          ...(membershipType && { membershipType: membershipType as any }),
          ...(status && { status: status as any }),
          ...(isPrimary !== undefined && { isPrimary }),
        },
      });
      break;
  }
}

async function handleAthleteTransfer(body: any, session: any) {
  const validatedData = transferAthleteSchema.parse(body);
  const { athleteId, fromOrganizationId, toOrganizationId, membershipType, transferClubs } = validatedData;

  // Verify user has access to both organizations (system admin) or at least the source org
  if (session.user.role !== 'SYSTEM_ADMIN') {
    if (session.user.organizationId !== fromOrganizationId) {
      return NextResponse.json({ error: 'Cannot transfer from an organization you do not manage' }, { status: 403 });
    }
  }

  return await prisma.$transaction(async (tx) => {
    // Verify athlete exists and has affiliation with source organization
    const athlete = await tx.athlete.findFirst({
      where: {
        id: athleteId,
        organizations: {
          some: {
            organizationId: fromOrganizationId,
            status: 'ACTIVE',
          },
        },
      },
      include: {
        clubs: {
          include: {
            club: {
              include: {
                organizations: {
                  where: { organizationId: fromOrganizationId },
                },
              },
            },
          },
        },
      },
    });

    if (!athlete) {
      throw new Error('Athlete not found or not affiliated with source organization');
    }

    // Remove from source organization
    await tx.athleteOrganization.updateMany({
      where: { athleteId, organizationId: fromOrganizationId },
      data: { status: 'INACTIVE', leftAt: new Date() },
    });

    // Add to target organization
    await tx.athleteOrganization.upsert({
      where: {
        athleteId_organizationId: { athleteId, organizationId: toOrganizationId },
      },
      create: {
        athleteId,
        organizationId: toOrganizationId,
        membershipType,
        status: 'ACTIVE',
      },
      update: {
        status: 'ACTIVE',
        membershipType,
        leftAt: null,
      },
    });

    // Handle club transfers if requested
    if (transferClubs) {
      // Find clubs affiliated with source organization
      const sourceOrgClubs = athlete.clubs
        .filter(ac => ac.club.organizations.length > 0)
        .map(ac => ac.club.id);

      // Deactivate club affiliations for source org clubs
      if (sourceOrgClubs.length > 0) {
        await tx.athleteClub.updateMany({
          where: {
            athleteId,
            clubId: { in: sourceOrgClubs },
          },
          data: { status: 'INACTIVE', leftAt: new Date() },
        });
      }
    }

    return NextResponse.json({
      message: `Athlete transferred successfully from ${fromOrganizationId} to ${toOrganizationId}`,
      athleteId,
      transferredClubs: transferClubs ? athlete.clubs.length : 0,
    });
  });
}

// GET /api/athletes/affiliations - Get affiliation history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const athleteId = searchParams.get('athleteId');

    if (!athleteId) {
      return NextResponse.json({ error: 'Athlete ID is required' }, { status: 400 });
    }

    // Get complete affiliation history
    const [organizationHistory, clubHistory] = await Promise.all([
      prisma.athleteOrganization.findMany({
        where: { athleteId },
        include: {
          organization: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.athleteClub.findMany({
        where: { athleteId },
        include: {
          club: {
            select: { id: true, name: true, city: true, country: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      organizations: organizationHistory,
      clubs: clubHistory,
    });

  } catch (error) {
    console.error('Error fetching affiliation history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch affiliation history' },
      { status: 500 }
    );
  }
} 