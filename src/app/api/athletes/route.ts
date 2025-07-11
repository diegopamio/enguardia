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
  organizationId: z.string().optional().nullable(), // For creating organizational affiliation
  clubId: z.string().optional().nullable(), // For creating club affiliation
});

// GET /api/athletes - List athletes with optional filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const organizationId = searchParams.get('organizationId') || session.user.organizationId;
    const weapon = searchParams.get('weapon');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {
      isActive: true,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { fieId: { contains: search, mode: 'insensitive' } },
          { nationality: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Filter by organization if specified
    if (organizationId) {
      where.organizations = {
        some: {
          organizationId: organizationId,
          status: 'ACTIVE',
        },
      };
    }

    // Filter by weapon if specified
    if (weapon) {
      where.weapons = {
        some: {
          weapon: weapon,
        },
      };
    }

    const athletes = await prisma.athlete.findMany({
      where,
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
              select: { id: true, name: true, city: true, country: true },
            },
          },
        },
        globalRankings: {
          where: { season: '2024-2025' },
          orderBy: { rank: 'asc' },
        },
        _count: {
          select: {
            competitionRegistrations: true,
          },
        },
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
      take: limit,
      skip: offset,
    });

    const total = await prisma.athlete.count({ where });

    return NextResponse.json({
      athletes,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching athletes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch athletes' },
      { status: 500 }
    );
  }
}

// POST /api/athletes - Create new athlete
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = athleteSchema.parse(body);

    // Check for existing athlete with same FIE ID
    if (validatedData.fieId) {
      const existingAthlete = await prisma.athlete.findUnique({
        where: { fieId: validatedData.fieId },
      });
      if (existingAthlete) {
        return NextResponse.json(
          { error: 'Athlete with this FIE ID already exists' },
          { status: 409 }
        );
      }
    }

    // Verify club belongs to the organization if both are specified
    if (validatedData.clubId && validatedData.organizationId) {
      const club = await prisma.club.findFirst({
        where: {
          id: validatedData.clubId,
          organizationId: validatedData.organizationId,
        },
      });
      if (!club) {
        return NextResponse.json(
          { error: 'Club does not belong to the specified organization' },
          { status: 400 }
        );
      }
    }

    const athlete = await prisma.athlete.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
        nationality: validatedData.nationality,
        fieId: validatedData.fieId,
        isActive: validatedData.isActive,
        // Create weapon specializations
        weapons: {
          create: validatedData.weapons?.map(weapon => ({ weapon })) || [],
        },
        // Create organizational affiliation if specified
        ...(validatedData.organizationId && {
          organizations: {
            create: {
              organizationId: validatedData.organizationId,
              membershipType: 'MEMBER',
              status: 'ACTIVE',
            },
          },
        }),
        // Create club affiliation if specified
        ...(validatedData.clubId && {
          clubs: {
            create: {
              clubId: validatedData.clubId,
              membershipType: 'MEMBER',
              status: 'ACTIVE',
              isPrimary: true, // First club is primary
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
        clubs: {
          include: {
            club: {
              select: { id: true, name: true, city: true, country: true },
            },
          },
        },
      },
    });

    return NextResponse.json(athlete, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating athlete:', error);
    return NextResponse.json(
      { error: 'Failed to create athlete' },
      { status: 500 }
    );
  }
} 