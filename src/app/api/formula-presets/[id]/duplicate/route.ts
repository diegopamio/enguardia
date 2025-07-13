/**
 * Duplicate Formula Preset API
 * 
 * Provides endpoint for duplicating existing presets (built-in or organization)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PresetService } from '@/lib/tournament/preset-service'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    
    if (!data.name) {
      return NextResponse.json(
        { error: 'New preset name is required' },
        { status: 400 }
      )
    }

    const preset = await PresetService.duplicatePreset(
      params.id,
      session.user.organizationId,
      data.name,
      {
        description: data.description,
        isPublic: data.isPublic,
        weapon: data.weapon,
        category: data.category
      }
    )

    return NextResponse.json({ preset }, { status: 201 })
  } catch (error) {
    console.error('Error duplicating preset:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to duplicate preset' },
      { status: 500 }
    )
  }
} 