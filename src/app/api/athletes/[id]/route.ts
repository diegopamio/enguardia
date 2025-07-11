import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating/updating athletes
const athleteSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  fieId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  weapons: z.array(z.enum(['EPEE', 'FOIL', 'SABRE'])).optional().default([]),
  organizationId: z.string().optional().nullable(),
  clubId: z.string().optional().nullable(),
});

// PUT /api/athletes/[id] - Update an athlete
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const validatedData = athleteSchema.parse(body);

    // Check if user has permission to update athletes
    if (session.user.role !== 'SYSTEM_ADMIN' && session.user.role !== 'ORGANIZATION_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify athlete exists and user has access
    const existingAthlete = await prisma.athlete.findFirst({
      where: {
        id: id,
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

    if (!existingAthlete) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    // Check for existing athlete with same FIE ID (excluding current athlete)
    if (validatedData.fieId && validatedData.fieId !== existingAthlete.fieId) {
      const athleteWithSameFieId = await prisma.athlete.findUnique({
        where: { fieId: validatedData.fieId },
      });
      if (athleteWithSameFieId) {
        return NextResponse.json(
          { error: 'Another athlete with this FIE ID already exists' },
          { status: 409 }
        );
      }
    }

    // Verify club belongs to the organization if both are specified
    if (validatedData.clubId && validatedData.organizationId) {
      const club = await prisma.club.findFirst({
        where: {
          id: validatedData.clubId,
          organizations: {
            some: {
              organizationId: validatedData.organizationId,
              status: 'ACTIVE',
            },
          },
        },
      });
      if (!club) {
        return NextResponse.json(
          { error: 'Club does not belong to the specified organization' },
          { status: 400 }
        );
      }
    }

    const updatedAthlete = await prisma.$transaction(async (tx) => {
      // Update basic athlete info
      const athlete = await tx.athlete.update({
        where: { id },
        data: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
          nationality: validatedData.nationality,
          fieId: validatedData.fieId,
          isActive: validatedData.isActive,
        },
      });

      // Update weapons - delete existing and recreate
      await tx.athleteWeapon.deleteMany({
        where: { athleteId: id },
      });

      if (validatedData.weapons && validatedData.weapons.length > 0) {
        await tx.athleteWeapon.createMany({
          data: validatedData.weapons.map(weapon => ({
            athleteId: id,
            weapon,
          })),
        });
      }

      // Update organization affiliation if specified
      if (validatedData.organizationId) {
        // Check if affiliation already exists
        const existingOrgAffiliation = await tx.athleteOrganization.findFirst({
          where: {
            athleteId: id,
            organizationId: validatedData.organizationId,
          },
        });

        if (!existingOrgAffiliation) {
          // Remove other organization affiliations and add new one
          await tx.athleteOrganization.deleteMany({
            where: { athleteId: id },
          });

          await tx.athleteOrganization.create({
            data: {
              athleteId: id,
              organizationId: validatedData.organizationId,
              membershipType: 'MEMBER',
              status: 'ACTIVE',
            },
          });
        }
      }

      // Update club affiliation if specified
      if (validatedData.clubId) {
        // Check if affiliation already exists
        const existingClubAffiliation = await tx.athleteClub.findFirst({
          where: {
            athleteId: id,
            clubId: validatedData.clubId,
          },
        });

        if (!existingClubAffiliation) {
          // Set all existing clubs as non-primary
          await tx.athleteClub.updateMany({
            where: { athleteId: id },
            data: { isPrimary: false },
          });

          await tx.athleteClub.create({
            data: {
              athleteId: id,
              clubId: validatedData.clubId,
              membershipType: 'MEMBER',
              status: 'ACTIVE',
              isPrimary: true,
            },
          });
        }
      }

      return athlete;
    });

    // Fetch the complete updated athlete with all relations
    const completeAthlete = await prisma.athlete.findUnique({
      where: { id },
      include: {
        weapons: true,
        organizations: {
          include: {
            organization: {
              select: { id: true, name: true },
            },
          },
        },
        clubs: {
          include: {
            club: {
              select: { id: true, name: true, city: true, country: true, imageUrl: true },
            },
          },
        },
      },
    });

    return NextResponse.json(completeAthlete);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating athlete:', error);
    return NextResponse.json(
      { error: 'Failed to update athlete' },
      { status: 500 }
    );
  }
}

// DELETE /api/athletes/[id] - Delete an athlete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if user has permission to delete athletes
    if (session.user.role !== 'SYSTEM_ADMIN' && session.user.role !== 'ORGANIZATION_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify athlete exists and user has access
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: id,
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
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
    }

    // Check if athlete has any competition registrations
    const competitionCount = await prisma.competitionRegistration.count({
      where: { athleteId: id },
    });

    if (competitionCount > 0) {
      // Instead of hard delete, mark as inactive if they have competition history
      await prisma.athlete.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({ 
        message: 'Athlete marked as inactive due to existing competition history',
        deactivated: true 
      });
    }

    // Safe to delete - remove all related records first
    await prisma.$transaction(async (tx) => {
      // Delete athlete weapons
      await tx.athleteWeapon.deleteMany({
        where: { athleteId: id },
      });

      // Delete athlete organization relationships
      await tx.athleteOrganization.deleteMany({
        where: { athleteId: id },
      });

      // Delete athlete club relationships
      await tx.athleteClub.deleteMany({
        where: { athleteId: id },
      });

      // Delete global rankings
      await tx.globalRanking.deleteMany({
        where: { athleteId: id },
      });

      // Finally delete the athlete
      await tx.athlete.delete({
        where: { id },
      });
    });

    return NextResponse.json({ 
      message: 'Athlete deleted successfully',
      deleted: true 
    });

  } catch (error) {
    console.error('Error deleting athlete:', error);
    return NextResponse.json(
      { error: 'Failed to delete athlete' },
      { status: 500 }
    );
  }
} 