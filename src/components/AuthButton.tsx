'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function AuthButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="text-sm text-gray-500">Loading...</div>
  }

  if (session) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex flex-col text-sm">
          <span className="text-gray-700">
            Welcome, {session.user?.name || session.user?.email}
          </span>
          {session.user?.organizationName && (
            <span className="text-xs text-gray-500">
              Organization: {session.user.organizationName}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Role: {session.user?.role || 'PUBLIC'}
          </span>
          {session.user?.role === 'SYSTEM_ADMIN' && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              System Admin
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/profile"
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
          >
            Profile
          </Link>
          <button
            onClick={() => signOut()}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => signIn()}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
      >
        Sign In
      </button>
    </div>
  )
} 