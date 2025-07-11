import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { isValidCountryCode } from '@/lib/countries';
import { clubSchema } from '@/lib/validation';
import { canUserManageClub, getSessionAndValidate } from '@/lib/api-auth';

const updateClubSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  city: z.string().optional().nullable(),
  country: z.string().refine(isValidCountryCode, 'Invalid country code').optional(),
});

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/clubs/[id] - Get a specific club
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const club = await prisma.club.findUnique({
      where: { id },
      include: {
        organizations: {
          where: { status: 'ACTIVE' },
          include: {
            organization: {
              select: { id: true, name: true },
            },
          },
        },
        athletes: {
          where: { status: 'ACTIVE' },
          include: {
            athlete: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        _count: {
          select: {
            athletes: { where: { status: 'ACTIVE' } },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    return NextResponse.json({ club });
  } catch (error) {
    console.error('Failed to fetch club:', error);
    return NextResponse.json({ error: 'Failed to fetch club' }, { status: 500 });
  }
}

// PUT /api/clubs/[id] - Update a club
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  const validation = await getSessionAndValidate();
  if (!validation.isValid) {
    return validation.response;
  }
  const { session, user } = validation;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new NextResponse('Invalid JSON body', { status: 400 });
  }

  const parseResult = clubSchema.safeParse(body);

  if (!parseResult.success) {
    return new NextResponse(JSON.stringify(parseResult.error.format()), {
      status: 400,
    });
  }

  const { name, city, country, imageUrl, organizationId } = parseResult.data;

  try {
    // Get the club to check permissions
    const existingClub = await prisma.club.findUnique({
      where: { id },
      include: {
        organizations: {
          where: { status: 'ACTIVE' },
          select: { organizationId: true },
        },
      },
    });

    if (!existingClub) {
      return new NextResponse('Club not found', { status: 404 });
    }

    // Check permissions
    const canManage = await canUserManageClub(user, id);
    if (!canManage) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (name || city !== undefined || country) {
      const conflictWhere = {
        id: { not: id },
        name: name || existingClub.name,
        city: city !== undefined ? city : existingClub.city,
        country: country || existingClub.country,
      };
      const conflictingClub = await prisma.club.findFirst({
        where: conflictWhere,
      });

      if (conflictingClub) {
        return new NextResponse(
          `A club with the same name, city, and country already exists.`,
          { status: 409 }
        );
      }
    }

    // Update the club
    const updatedClub = await prisma.club.update({
      where: { id },
      data: {
        name,
        city,
        country,
        imageUrl,
      },
    });

    const updatedClubWithDetails = await prisma.club.findUnique({
      where: { id: updatedClub.id },
      include: {
        _count: {
          select: { athletes: { where: { status: 'ACTIVE' } } },
        },
        organizations: {
          where: { status: 'ACTIVE' },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedClubWithDetails);
  } catch (error) {
    console.error('Failed to update club:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  const validation = await getSessionAndValidate();
  if (!validation.isValid) {
    return validation.response;
  }
  const { user } = validation;

  try {
    // Check permissions
    const canManage = await canUserManageClub(user, id);
    if (!canManage) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Check for associated athletes
    const athleteCount = await prisma.athleteClub.count({
      where: { clubId: id, status: 'ACTIVE' },
    });

    if (athleteCount > 0) {
      return new NextResponse(
        `Cannot delete club because it has ${athleteCount} associated active athlete(s).`,
        { status: 409 }
      );
    }

    await prisma.club.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Failed to delete club ${id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 