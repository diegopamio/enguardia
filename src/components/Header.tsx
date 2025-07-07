import AuthButton from "@/components/AuthButton";

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-gray-900">⚔️ Enguardia</h1>
            <span className="ml-3 text-sm text-gray-500">
              Fencing Tournament Management
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <nav className="flex space-x-4">
              <a
                href="/"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </a>
              <a
                href="/events"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Tournaments
              </a>
              <a
                href="/competitions"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Competitions
              </a>
            </nav>
            <AuthButton />
          </div>
        </div>
      </div>
    </header>
  );
} 