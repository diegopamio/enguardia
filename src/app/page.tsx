export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Modern Tournament Management
          </h2>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Complete web-based solution for fencing tournaments. Manage tournaments, 
            athletes, poules, and direct elimination brackets with real-time updates.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <a href="/tournaments" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200 block">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🏆</div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Tournament Management
                  </h3>
                  <p className="text-sm text-gray-500">
                    Create and manage fencing tournaments with multiple competitions
                  </p>
                </div>
              </div>
            </div>
          </a>

          <a href="/competitions" className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200 block">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">⚔️</div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Competition Management
                  </h3>
                  <p className="text-sm text-gray-500">
                    Manage individual competitions within tournaments by weapon and category
                  </p>
                </div>
              </div>
            </div>
          </a>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">👥</div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Athlete Registration
                  </h3>
                  <p className="text-sm text-gray-500">
                    Import FIE XML/CSV rosters and manage participants
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🏁</div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Poules & Brackets
                  </h3>
                  <p className="text-sm text-gray-500">
                    Auto-generate poules and DE brackets with smart seeding
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Authentication Status */}
        <div className="mt-16 bg-white rounded-lg shadow p-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Authentication System
          </h3>
          <p className="text-gray-600 mb-6">
            Test the authentication system with Google OAuth or email/password. 
            The system supports role-based access (Admin, Referee, Public).
          </p>
          
          <div className="bg-gray-50 rounded p-4">
            <h4 className="font-medium text-gray-900 mb-2">Demo Credentials:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Email:</strong> admin@enguardia.com</li>
              <li>• <strong>Password:</strong> Any password (demo mode)</li>
              <li>• <strong>Role:</strong> Will be set to ADMIN automatically</li>
            </ul>
          </div>
        </div>

        {/* Languages */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            🌍 Multilingual Support: English • Español • Français
          </p>
        </div>
      </main>
    </div>
  );
}
