/**
 * Individual Formula Preset API
 * 
 * Provides endpoints for managing individual presets:
 * - GET: Get specific preset
 * - PUT: Update preset
 * - DELETE: Delete preset
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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preset = await PresetService.getPreset(params.id, session.user.organizationId)
    
    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 })
    }

    return NextResponse.json({ preset })
  } catch (error) {
    console.error('Error fetching preset:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preset' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    
    const preset = await PresetService.updatePreset(
      params.id,
      {
        name: data.name,
        description: data.description,
        weapon: data.weapon,
        category: data.category,
        phases: data.phases,
        isPublic: data.isPublic
      },
      session.user.organizationId
    )

    return NextResponse.json({ preset })
  } catch (error) {
    console.error('Error updating preset:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update preset' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await PresetService.deletePreset(params.id, session.user.organizationId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting preset:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete preset' },
      { status: 500 }
    )
  }
} 