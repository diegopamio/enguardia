import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createClubSchema = z.object({
  name: z.string().min(1).max(255),
  city: z.string().optional(),
  country: z.string().optional(),
  organizationId: z.string(),
});

// GET /api/clubs - List clubs with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // System admins can see all clubs, org admins only their own
    const whereClause: any = {};
    
    if (session.user.role !== 'SYSTEM_ADMIN') {
      if (!session.user.organizationId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      whereClause.organizationId = session.user.organizationId;
    } else if (organizationId) {
      whereClause.organizationId = organizationId;
    }
    
    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [clubs, total] = await Promise.all([
      prisma.club.findMany({
        where: whereClause,
        include: {
          organization: {
            select: { id: true, name: true },
          },
          athletes: {
            select: {
              athlete: {
                select: { id: true, firstName: true, lastName: true },
              },
              membershipType: true,
              status: true,
              isPrimary: true,
            },
          },
          _count: {
            select: { athletes: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.club.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      clubs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Clubs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clubs' },
      { status: 500 }
    );
  }
}

// POST /api/clubs - Create a new club
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only admins can create clubs
    if (!['ORGANIZATION_ADMIN', 'SYSTEM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, city, country, organizationId } = createClubSchema.parse(body);

    // Validate organization access
    if (session.user.role === 'ORGANIZATION_ADMIN' && session.user.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Cannot create club for different organization' }, { status: 403 });
    }

    // Check if club name already exists in this organization
    const existingClub = await prisma.club.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        organizationId,
      },
    });

    if (existingClub) {
      return NextResponse.json(
        { error: 'Club with this name already exists in this organization' },
        { status: 409 }
      );
    }

    const club = await prisma.club.create({
      data: {
        name,
        city,
        country,
        organizationId,
      },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        _count: {
          select: { athletes: true },
        },
      },
    });

    return NextResponse.json(club, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Club creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create club' },
      { status: 500 }
    );
  }
} 