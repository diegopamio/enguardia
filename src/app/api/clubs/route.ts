import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { isValidCountryCode } from '@/lib/countries';

const createClubSchema = z.object({
  name: z.string().min(1).max(255),
  shortName: z.string().max(10).optional(),
  city: z.string().optional(),
  country: z.string().refine(isValidCountryCode, 'Invalid country code'),
  organizationId: z.string().optional(), // For immediate affiliation
  imageUrl: z.union([
    z.string().url(), // Valid URL
    z.string().length(0), // Empty string
    z.null() // Null value
  ]).optional(),
});

const updateClubSchema = createClubSchema.partial();

const affiliateClubSchema = z.object({
  clubId: z.string(),
  organizationId: z.string(),
  affiliationType: z.enum(['MEMBER', 'PARTNER', 'AFFILIATE']).default('MEMBER'),
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
    const country = searchParams.get('country');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let whereClause: any = {};

    // Search by name or city
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { city: { contains: search } },
      ];
    }

    // Filter by country
    if (country) {
      whereClause.country = country;
    }

    // Filter by organization affiliation (if specified)
    if (organizationId) {
      whereClause.organizations = {
        some: {
          organizationId,
          status: 'ACTIVE',
        },
      };
    }

    const [clubs, total] = await Promise.all([
      prisma.club.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        include: {
          organizations: {
            where: { status: 'ACTIVE' },
            include: {
              organization: {
                select: { id: true, name: true },
              },
            },
          },
          _count: {
            select: {
              athletes: { where: { status: 'ACTIVE' } },
            },
          },
        },
        orderBy: [
          { name: 'asc' },
          { city: 'asc' },
        ],
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
    console.error('Failed to fetch clubs:', error);
    return NextResponse.json({ error: 'Failed to fetch clubs' }, { status: 500 });
  }
}

// POST /api/clubs - Create a new global club
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only authenticated users can create clubs
    const body = await request.json();
    const { name, shortName, city, country, organizationId, imageUrl } = createClubSchema.parse(body);

    // Check if club with same name/city/country already exists
    const existingClub = await prisma.club.findFirst({
      where: {
        name,
        city: city || null,
        country,
      },
    });

    if (existingClub) {
      return NextResponse.json(
        { error: 'A club with this name already exists in this city and country' },
        { status: 400 }
      );
    }

    // Create the club
    const club = await prisma.club.create({
      data: {
        name,
        shortName,
        city,
        country,
        imageUrl: imageUrl || null,
        // Only set createdById if the user ID exists and is valid
        ...(session.user?.id && { createdById: session.user.id }),
      },
    });

    // If organizationId provided, create immediate affiliation
    if (organizationId) {
      // Check permissions for organization affiliation
      if (session.user.role === 'ORGANIZATION_ADMIN' && session.user.organizationId !== organizationId) {
        return NextResponse.json({ error: 'Cannot affiliate club with different organization' }, { status: 403 });
      }

      await prisma.clubOrganization.create({
        data: {
          clubId: club.id,
          organizationId,
          affiliationType: 'MEMBER',
          status: 'ACTIVE',
        },
      });
    }

    // Fetch the created club with relationships
    const createdClub = await prisma.club.findUnique({
      where: { id: club.id },
      include: {
        organizations: {
          where: { status: 'ACTIVE' },
          include: {
            organization: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: {
            athletes: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    return NextResponse.json({ club: createdClub }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Failed to create club:', error);
    return NextResponse.json({ error: 'Failed to create club' }, { status: 500 });
  }
}

// PUT /api/clubs - Update a club
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only admins can update clubs
    if (!['ORGANIZATION_ADMIN', 'SYSTEM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = z.object({ id: z.string() }).parse(Object.fromEntries(request.nextUrl.searchParams));
    const body = await request.json();
    const { name, city, country, imageUrl } = updateClubSchema.parse(body);

    const club = await prisma.club.findUnique({ where: { id } });

    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }
    
    // Authorization check
    const canUpdate = await canUserManageClub(session.user, id);
    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const updatedClub = await prisma.club.update({
      where: { id },
      data: {
        name,
        city,
        country,
        imageUrl,
      },
      include: {
        organizations: {
          where: { status: 'ACTIVE' },
          include: {
            organization: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: {
            athletes: { where: { status: 'ACTIVE' } },
          },
        },
      },
    });

    return NextResponse.json({ club: updatedClub });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Failed to update club:', error);
    return NextResponse.json({ error: 'Failed to update club' }, { status: 500 });
  }
}

// DELETE /api/clubs - Delete a club
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only admins can delete clubs
    if (!['ORGANIZATION_ADMIN', 'SYSTEM_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('id');

    if (!clubId) {
      return NextResponse.json({ error: 'Club ID is required' }, { status: 400 });
    }

    // Check if club exists and validate access
    const existingClub = await prisma.club.findUnique({
      where: { id: clubId },
      include: { 
        _count: { select: { athletes: true } },
        organization: true 
      },
    });

    if (!existingClub) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // Validate organization access
    if (session.user.role === 'ORGANIZATION_ADMIN' && session.user.organizationId !== existingClub.organizationId) {
      return NextResponse.json({ error: 'Cannot delete club from different organization' }, { status: 403 });
    }

    // Check if club has athletes - prevent deletion if there are active memberships
    if (existingClub._count.athletes > 0) {
      return NextResponse.json(
        { error: `Cannot delete club. It has ${existingClub._count.athletes} athlete(s) associated with it.` },
        { status: 409 }
      );
    }

    await prisma.club.delete({
      where: { id: clubId },
    });

    return NextResponse.json({ message: 'Club deleted successfully' });

  } catch (error) {
    console.error('Club deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete club' },
      { status: 500 }
    );
  }
} 