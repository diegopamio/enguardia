import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';
import { User } from 'next-auth';
import { UserRole } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Gets the current session and ensures the user is authenticated.
 * @returns An object with isValid, and either a response or the session and user.
 */
export async function getSessionAndValidate() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      isValid: false,
      response: new NextResponse('Unauthorized', { status: 401 }),
      session: null,
      user: null,
    };
  }

  return {
    isValid: true,
    response: null,
    session,
    user: session.user as User & { id: string; role: UserRole; organizationId: string | null },
  };
}

/**
 * Checks if a user has permission to manage a specific club.
 * @param user The user object from the session.
 * @param clubId The ID of the club to check.
 * @returns A boolean indicating if the user can manage the club.
 */
export async function canUserManageClub(user: User & { id: string; role: UserRole; organizationId: string | null }, clubId: string): Promise<boolean> {
  if (user.role === UserRole.SYSTEM_ADMIN) {
    return true;
  }

  if (user.role === UserRole.ORGANIZATION_ADMIN) {
    if (!user.organizationId) return false;

    const clubAffiliation = await prisma.clubOrganization.findFirst({
      where: {
        clubId: clubId,
        organizationId: user.organizationId,
        status: 'ACTIVE',
      },
    });
    return !!clubAffiliation;
  }

  // Check if user is the creator of the club (optional rule, can be adapted)
  const club = await prisma.club.findFirst({
    where: {
        id: clubId,
        createdById: user.id
    }
  });

  return !!club;
} 