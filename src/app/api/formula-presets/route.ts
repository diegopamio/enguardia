/**
 * Formula Presets API
 * 
 * Provides endpoints for managing tournament formula presets:
 * - GET: List all presets (built-in + organization)
 * - POST: Create new organization preset
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PresetService } from '@/lib/tournament/preset-service'
import { Weapon } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const weapon = searchParams.get('weapon') as Weapon | null
    const category = searchParams.get('category')
    const isPublic = searchParams.get('isPublic')
    const includeBuiltIn = searchParams.get('includeBuiltIn') !== 'false'
    const search = searchParams.get('search')
    const byCategory = searchParams.get('byCategory') === 'true'

    let presets

    if (search) {
      presets = await PresetService.searchPresets(search, session.user.organizationId)
    } else if (byCategory) {
      presets = await PresetService.getPresetsByCategory(session.user.organizationId)
    } else {
      presets = await PresetService.getPresets({
        organizationId: session.user.organizationId,
        weapon: weapon || undefined,
        category: category || undefined,
        isPublic: isPublic ? isPublic === 'true' : undefined,
        includeBuiltIn
      })
    }

    return NextResponse.json({ presets })
  } catch (error) {
    console.error('Error fetching presets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch presets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    
    // Validate required fields
    if (!data.name || !data.phases || !Array.isArray(data.phases)) {
      return NextResponse.json(
        { error: 'Name and phases are required' },
        { status: 400 }
      )
    }

    const preset = await PresetService.createPreset({
      name: data.name,
      description: data.description,
      weapon: data.weapon,
      category: data.category,
      phases: data.phases,
      isPublic: data.isPublic || false,
      organizationId: session.user.organizationId
    })

    return NextResponse.json({ preset }, { status: 201 })
  } catch (error) {
    console.error('Error creating preset:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create preset' },
      { status: 500 }
    )
  }
} 