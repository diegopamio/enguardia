import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import { UserRole } from "@prisma/client"

export default async function UnauthorizedPage() {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-red-500 text-6xl mb-4">🚫</div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
        
        <p className="text-gray-600 mb-6">
          You don't have permission to access this resource.
        </p>

        {session ? (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-medium text-gray-800 mb-2">Current Access Level</h2>
            <div className="text-sm text-gray-600">
              <p>Role: <span className={`font-medium ${
                session.user.role === UserRole.SYSTEM_ADMIN 
                  ? 'text-red-600'
                  : session.user.role === UserRole.ORGANIZATION_ADMIN
                  ? 'text-blue-600'
                  : session.user.role === UserRole.REFEREE
                  ? 'text-green-600'
                  : 'text-gray-600'
              }`}>
                {session.user.role}
              </span></p>
              {session.user.organizationName && (
                <p>Organization: <span className="font-medium">{session.user.organizationName}</span></p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              You need to sign in to access this resource.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {session ? (
            <>
              <Link
                href="/profile"
                className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                View Profile
              </Link>
              <Link
                href="/"
                className="block w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Go Home
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/"
                className="block w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Go Home
              </Link>
            </>
          )}
        </div>

        <div className="mt-6 text-xs text-gray-500">
          <p>If you believe this is an error, please contact your administrator.</p>
        </div>
      </div>
    </div>
  )
} 