'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
  const { data: session, status } = useSession();

  // Prevent hydration mismatch by showing consistent structure during loading
  const isLoading = status === 'loading';

  return (
    <header className="bg-blue-600 text-white shadow-lg print-hidden">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold hover:text-blue-200 transition-colors">
              Enguardia
            </Link>
            
            {/* Only show navigation when session is confirmed (not during loading) */}
            {!isLoading && session && (
              <nav className="hidden md:flex space-x-6">
                <Link href="/" className="hover:text-blue-200 transition-colors">
                  Home
                </Link>
                <Link href="/tournaments" className="hover:text-blue-200 transition-colors">
                  Tournaments
                </Link>
                <Link href="/competitions" className="hover:text-blue-200 transition-colors">
                  Competitions
                </Link>
                <Link href="/athletes" className="hover:text-blue-200 transition-colors">
                  Athletes
                </Link>
                <Link href="/clubs" className="hover:text-blue-200 transition-colors">
                  Clubs
                </Link>
              </nav>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isLoading ? (
              // Show consistent loading state during SSR/hydration
              <div className="w-20 h-8 bg-blue-700 rounded animate-pulse"></div>
            ) : session ? (
              <>
                <span className="text-sm">
                  Welcome, {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation - only show when session is confirmed */}
        {!isLoading && session && (
          <nav className="md:hidden pb-4">
            <div className="flex space-x-4">
              <Link href="/" className="hover:text-blue-200 transition-colors">
                Home
              </Link>
              <Link href="/tournaments" className="hover:text-blue-200 transition-colors">
                Tournaments
              </Link>
              <Link href="/competitions" className="hover:text-blue-200 transition-colors">
                Competitions
              </Link>
              <Link href="/athletes" className="hover:text-blue-200 transition-colors">
                Athletes
              </Link>
              <Link href="/clubs" className="hover:text-blue-200 transition-colors">
                Clubs
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
} 