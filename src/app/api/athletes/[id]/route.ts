import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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