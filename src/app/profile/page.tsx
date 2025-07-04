import { UserRole } from "@prisma/client"
import AuthTest from "@/components/AuthTest"
import { requirePageAuth } from "@/lib/auth-utils"

export default async function ProfilePage() {
  // Use the new page-level authentication guard
  const session = await requirePageAuth({
    // No specific role required - just authentication
    redirectTo: "/auth/signin"
  })

  const { user } = session

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* User Profile Information */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">User Profile</h1>
            
            {/* User Information */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Personal Information</h2>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-600">Name:</span>
                    <span className="ml-2 text-gray-900">{user.name || "Not provided"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Email:</span>
                    <span className="ml-2 text-gray-900">{user.email}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">User ID:</span>
                    <span className="ml-2 text-gray-900 font-mono text-sm">{user.id}</span>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Role & Organization</h2>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-600">Role:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
                      user.role === UserRole.SYSTEM_ADMIN 
                        ? 'bg-red-100 text-red-800'
                        : user.role === UserRole.ORGANIZATION_ADMIN
                        ? 'bg-blue-100 text-blue-800'
                        : user.role === UserRole.REFEREE
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Organization:</span>
                    <span className="ml-2 text-gray-900">
                      {user.organizationName || "No organization assigned"}
                    </span>
                  </div>
                  {user.organizationId && (
                    <div>
                      <span className="font-medium text-gray-600">Organization ID:</span>
                      <span className="ml-2 text-gray-900 font-mono text-sm">{user.organizationId}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Role-based Features */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Features</h2>
              <div className="grid grid-cols-1 gap-4">
                
                {/* Public Features */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 mb-2">Public Access</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• View public tournament results</li>
                    <li>• Browse athlete profiles</li>
                    <li>• Access tournament schedules</li>
                  </ul>
                </div>

                {/* Referee Features */}
                {(user.role === UserRole.REFEREE || 
                  user.role === UserRole.ORGANIZATION_ADMIN || 
                  user.role === UserRole.SYSTEM_ADMIN) && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-medium text-green-800 mb-2">Referee Access</h3>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Score poule matches</li>
                      <li>• Referee DE brackets</li>
                      <li>• Issue cards and penalties</li>
                    </ul>
                  </div>
                )}

                {/* Organization Admin Features */}
                {(user.role === UserRole.ORGANIZATION_ADMIN || 
                  user.role === UserRole.SYSTEM_ADMIN) && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-blue-800 mb-2">Organization Admin</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Create tournaments</li>
                      <li>• Manage athlete registrations</li>
                      <li>• Configure organization settings</li>
                    </ul>
                  </div>
                )}

                {/* System Admin Features */}
                {user.role === UserRole.SYSTEM_ADMIN && (
                  <div className="bg-red-50 rounded-lg p-4">
                    <h3 className="font-medium text-red-800 mb-2">System Administrator</h3>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• Manage all organizations</li>
                      <li>• System-wide configuration</li>
                      <li>• User role management</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Session Data (for debugging) */}
            <div className="border-t pt-6 mt-6">
              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="font-medium text-gray-800 cursor-pointer">
                  Session Data (Debug)
                </summary>
                <pre className="mt-3 text-xs text-gray-600 overflow-auto">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </details>
            </div>
          </div>

          {/* Authorization Testing */}
          <div>
            <AuthTest />
          </div>
        </div>
      </div>
    </div>
  )
} 