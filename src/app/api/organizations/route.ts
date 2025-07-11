import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/organizations - List all organizations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // System admins can see all organizations, others see only their own + public ones
    let whereClause = {};
    
    if (session.user.role === 'SYSTEM_ADMIN') {
      // System admins see all organizations
      whereClause = { isActive: true };
    } else if (session.user.organizationId) {
      // Others see their own organization + public ones (if we implement that)
      whereClause = {
        isActive: true,
        // For now, just show all active organizations
        // In future could filter based on organization visibility settings
      };
    } else {
      // Users without organization see limited set
      whereClause = { isActive: true };
    }

    const organizations = await prisma.organization.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        city: true,
        country: true,
        website: true,
        _count: {
          select: {
            users: { where: { isActive: true } },
            athleteOrganizations: { where: { status: 'ACTIVE' } },
            clubs: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: [
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      organizations,
      total: organizations.length,
    });

  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
} 