'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'

interface ApiResponse {
  message?: string
  error?: string
  user?: any
  timestamp?: string
  [key: string]: any
}

export default function AuthTest() {
  const { data: session, status } = useSession()
  const [testResults, setTestResults] = useState<Record<string, ApiResponse>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const runApiTest = async (endpoint: string, method: string = 'GET', body?: any) => {
    const testKey = `${method}-${endpoint}`
    setLoading(prev => ({ ...prev, [testKey]: true }))
    
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      
      const data = await response.json()
      setTestResults(prev => ({ ...prev, [testKey]: data }))
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [testKey]: { error: `Network error: ${error}` }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [testKey]: false }))
    }
  }

  const tests = [
    {
      name: 'Basic Authentication',
      endpoint: '/api/test-auth',
      method: 'GET',
      description: 'Tests basic authentication requirement'
    },
    {
      name: 'Organization Admin Access',
      endpoint: '/api/test-auth',
      method: 'POST',
      body: { test: 'organization admin test' },
      description: 'Tests organization admin role requirement'
    },
    {
      name: 'System Admin Access',
      endpoint: '/api/test-auth',
      method: 'PUT',
      description: 'Tests system admin role requirement'
    },
    {
      name: 'Custom Validation (Read)',
      endpoint: '/api/test-auth?action=read',
      method: 'PATCH',
      description: 'Tests custom validation for read action'
    },
    {
      name: 'Custom Validation (Write)',
      endpoint: '/api/test-auth?action=write',
      method: 'PATCH',
      description: 'Tests custom validation for write action'
    }
  ]

  if (status === 'loading') {
    return <div className="text-center p-4">Loading...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">API Authorization Tests</h2>
      
      {!session && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            You need to be signed in to test the API authorization system.
          </p>
        </div>
      )}

      {session && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">Current Session</h3>
          <div className="text-sm text-blue-800">
            <p>Role: <span className="font-mono">{session.user.role}</span></p>
            <p>Organization: {session.user.organizationName || 'None'}</p>
            <p>Organization ID: <span className="font-mono">{session.user.organizationId || 'None'}</span></p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {tests.map((test, index) => {
          const testKey = `${test.method}-${test.endpoint}`
          const result = testResults[testKey]
          const isLoading = loading[testKey]
          
          return (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="font-medium text-gray-900">{test.name}</h3>
                  <p className="text-sm text-gray-600">{test.description}</p>
                  <p className="text-xs text-gray-500 font-mono">
                    {test.method} {test.endpoint}
                  </p>
                </div>
                <button
                  onClick={() => runApiTest(test.endpoint, test.method, test.body)}
                  disabled={isLoading}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
                >
                  {isLoading ? 'Testing...' : 'Test'}
                </button>
              </div>
              
              {result && (
                <div className="mt-3">
                  <div className={`rounded p-3 text-sm ${
                    result.error 
                      ? 'bg-red-50 border border-red-200 text-red-800'
                      : 'bg-green-50 border border-green-200 text-green-800'
                  }`}>
                    <div className="font-medium mb-1">
                      {result.error ? 'Error' : 'Success'}
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Expected Behavior</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Not signed in:</strong> All tests should return "Authentication required"</li>
          <li>• <strong>PUBLIC role:</strong> Only basic auth and read actions should succeed</li>
          <li>• <strong>REFEREE role:</strong> Basic auth and read/write actions should succeed</li>
          <li>• <strong>ORGANIZATION_ADMIN:</strong> Basic auth and organization admin tests should succeed</li>
          <li>• <strong>SYSTEM_ADMIN:</strong> All tests should succeed</li>
        </ul>
      </div>
    </div>
  )
} 