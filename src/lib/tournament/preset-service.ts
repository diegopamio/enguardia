/**
 * Preset Service - Organization-specific Formula Template Management
 * 
 * Provides CRUD operations for organization-specific tournament presets
 * alongside access to built-in presets.
 */

import { prisma } from '@/lib/prisma'
import { FormulaTemplate } from './types'
import { getBuiltInPresets, getBuiltInPreset, isBuiltInPreset, validateFormulaTemplate } from './presets'
import { Weapon } from '@prisma/client'

export interface PresetFilters {
  organizationId?: string
  weapon?: Weapon
  category?: string
  isPublic?: boolean
  includeBuiltIn?: boolean
}

export interface PresetCreateData {
  name: string
  description?: string
  weapon?: Weapon
  category?: string
  phases: any[] // JSON phases configuration
  isPublic?: boolean
  organizationId: string
}

export interface PresetUpdateData {
  name?: string
  description?: string
  weapon?: Weapon
  category?: string
  phases?: any[]
  isPublic?: boolean
}

export class PresetService {
  /**
   * Get all presets available to an organization
   */
  static async getPresets(filters: PresetFilters = {}): Promise<FormulaTemplate[]> {
    const presets: FormulaTemplate[] = []

    // Add built-in presets if requested
    if (filters.includeBuiltIn !== false) {
      const builtInPresets = getBuiltInPresets()
      Object.values(builtInPresets).flat().forEach(preset => {
        // Filter built-in presets by weapon/category if specified
        if (filters.weapon && preset.weapon && preset.weapon !== filters.weapon) return
        if (filters.category && preset.category && preset.category !== filters.category) return
        presets.push(preset)
      })
    }

    // Build database query
    const where: any = {}
    
    if (filters.organizationId) {
      where.OR = [
        { organizationId: filters.organizationId },
        { isPublic: true, organizationId: { not: filters.organizationId } }
      ]
    }
    
    if (filters.weapon) {
      where.weapon = filters.weapon
    }
    
    if (filters.category) {
      where.category = filters.category
    }
    
    if (filters.isPublic !== undefined) {
      where.isPublic = filters.isPublic
    }

    // Get organization-specific presets
    const dbPresets = await prisma.formulaTemplate.findMany({
      where,
      orderBy: [
        { isPublic: 'desc' },
        { name: 'asc' }
      ]
    })

    // Convert database presets to FormulaTemplate format
    const organizationPresets: FormulaTemplate[] = dbPresets.map(preset => ({
      id: preset.id,
      name: preset.name,
      description: preset.description || undefined,
      weapon: preset.weapon || null,
      category: preset.category || null,
      phases: preset.phases as any[],
      isPublic: preset.isPublic,
      organizationId: preset.organizationId || undefined
    }))

    presets.push(...organizationPresets)

    return presets
  }

  /**
   * Get a specific preset by ID
   */
  static async getPreset(id: string, organizationId?: string): Promise<FormulaTemplate | null> {
    // Check if it's a built-in preset
    const builtInPreset = getBuiltInPreset(id)
    if (builtInPreset) {
      return builtInPreset
    }

    // Query database for organization preset
    const where: any = { id }
    if (organizationId) {
      where.OR = [
        { organizationId },
        { isPublic: true }
      ]
    }

    const dbPreset = await prisma.formulaTemplate.findFirst({ where })
    
    if (!dbPreset) return null

    return {
      id: dbPreset.id,
      name: dbPreset.name,
      description: dbPreset.description || undefined,
      weapon: dbPreset.weapon || null,
      category: dbPreset.category || null,
      phases: dbPreset.phases as any[],
      isPublic: dbPreset.isPublic,
      organizationId: dbPreset.organizationId || undefined
    }
  }

  /**
   * Create a new organization preset
   */
  static async createPreset(data: PresetCreateData): Promise<FormulaTemplate> {
    // Validate the template
    const validation = validateFormulaTemplate(data)
    if (!validation.isValid) {
      throw new Error(`Invalid preset template: ${validation.errors.join(', ')}`)
    }

    // Check for duplicate names within organization
    const existing = await prisma.formulaTemplate.findFirst({
      where: {
        name: data.name,
        organizationId: data.organizationId
      }
    })

    if (existing) {
      throw new Error('A preset with this name already exists in your organization')
    }

    const dbPreset = await prisma.formulaTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        weapon: data.weapon,
        category: data.category,
        phases: data.phases,
        isPublic: data.isPublic || false,
        organizationId: data.organizationId
      }
    })

    return {
      id: dbPreset.id,
      name: dbPreset.name,
      description: dbPreset.description || undefined,
      weapon: dbPreset.weapon || null,
      category: dbPreset.category || null,
      phases: dbPreset.phases as any[],
      isPublic: dbPreset.isPublic,
      organizationId: dbPreset.organizationId || undefined
    }
  }

  /**
   * Update an organization preset
   */
  static async updatePreset(
    id: string,
    data: PresetUpdateData,
    organizationId: string
  ): Promise<FormulaTemplate> {
    // Prevent updating built-in presets
    if (isBuiltInPreset(id)) {
      throw new Error('Cannot modify built-in presets')
    }

    // Validate ownership
    const existing = await prisma.formulaTemplate.findFirst({
      where: {
        id,
        organizationId
      }
    })

    if (!existing) {
      throw new Error('Preset not found or you do not have permission to modify it')
    }

    // Validate updated template if phases are being changed
    if (data.phases) {
      const validation = validateFormulaTemplate({ ...existing, ...data })
      if (!validation.isValid) {
        throw new Error(`Invalid preset template: ${validation.errors.join(', ')}`)
      }
    }

    // Check for duplicate names if name is being changed
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.formulaTemplate.findFirst({
        where: {
          name: data.name,
          organizationId,
          id: { not: id }
        }
      })

      if (duplicate) {
        throw new Error('A preset with this name already exists in your organization')
      }
    }

    const dbPreset = await prisma.formulaTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        weapon: data.weapon,
        category: data.category,
        phases: data.phases,
        isPublic: data.isPublic
      }
    })

    return {
      id: dbPreset.id,
      name: dbPreset.name,
      description: dbPreset.description || undefined,
      weapon: dbPreset.weapon || null,
      category: dbPreset.category || null,
      phases: dbPreset.phases as any[],
      isPublic: dbPreset.isPublic,
      organizationId: dbPreset.organizationId || undefined
    }
  }

  /**
   * Delete an organization preset
   */
  static async deletePreset(id: string, organizationId: string): Promise<void> {
    // Prevent deleting built-in presets
    if (isBuiltInPreset(id)) {
      throw new Error('Cannot delete built-in presets')
    }

    // Validate ownership
    const existing = await prisma.formulaTemplate.findFirst({
      where: {
        id,
        organizationId
      }
    })

    if (!existing) {
      throw new Error('Preset not found or you do not have permission to delete it')
    }

    await prisma.formulaTemplate.delete({
      where: { id }
    })
  }

  /**
   * Duplicate a preset (built-in or organization)
   */
  static async duplicatePreset(
    sourceId: string,
    organizationId: string,
    newName: string,
    options: {
      description?: string
      isPublic?: boolean
      weapon?: Weapon
      category?: string
    } = {}
  ): Promise<FormulaTemplate> {
    // Get source preset
    const sourcePreset = await this.getPreset(sourceId, organizationId)
    if (!sourcePreset) {
      throw new Error('Source preset not found')
    }

    // Create new preset based on source
    return this.createPreset({
      name: newName,
      description: options.description || `Copy of ${sourcePreset.name}`,
      weapon: options.weapon || sourcePreset.weapon || undefined,
      category: options.category || sourcePreset.category || undefined,
      phases: sourcePreset.phases,
      isPublic: options.isPublic || false,
      organizationId
    })
  }

  /**
   * Get presets organized by category
   */
  static async getPresetsByCategory(organizationId: string): Promise<{
    builtIn: Record<string, FormulaTemplate[]>
    organization: FormulaTemplate[]
  }> {
    const [builtInPresets, orgPresets] = await Promise.all([
      Promise.resolve(getBuiltInPresets()),
      this.getPresets({ organizationId, includeBuiltIn: false })
    ])

    return {
      builtIn: builtInPresets,
      organization: orgPresets
    }
  }

  /**
   * Search presets by name or description
   */
  static async searchPresets(
    query: string,
    organizationId?: string
  ): Promise<FormulaTemplate[]> {
    const allPresets = await this.getPresets({ 
      organizationId, 
      includeBuiltIn: true 
    })

    const searchTerm = query.toLowerCase().trim()
    
    return allPresets.filter(preset => 
      preset.name.toLowerCase().includes(searchTerm) ||
      preset.description?.toLowerCase().includes(searchTerm) ||
      preset.weapon?.toLowerCase().includes(searchTerm) ||
      preset.category?.toLowerCase().includes(searchTerm)
    )
  }

  /**
   * Get usage statistics for presets
   */
  static async getPresetUsageStats(organizationId: string): Promise<{
    presetId: string
    name: string
    usageCount: number
    lastUsed?: Date
  }[]> {
    // This would require tracking preset usage in competitions
    // For now, return empty array - can be implemented later
    return []
  }

  /**
   * Export preset to JSON
   */
  static async exportPreset(id: string, organizationId?: string): Promise<any> {
    const preset = await this.getPreset(id, organizationId)
    if (!preset) {
      throw new Error('Preset not found')
    }

    return {
      name: preset.name,
      description: preset.description,
      weapon: preset.weapon,
      category: preset.category,
      phases: preset.phases,
      exportedAt: new Date().toISOString(),
      exportedBy: 'Enguardia'
    }
  }

  /**
   * Import preset from JSON
   */
  static async importPreset(
    data: any,
    organizationId: string,
    options: {
      name?: string
      isPublic?: boolean
    } = {}
  ): Promise<FormulaTemplate> {
    // Validate imported data
    const validation = validateFormulaTemplate(data)
    if (!validation.isValid) {
      throw new Error(`Invalid imported preset: ${validation.errors.join(', ')}`)
    }

    return this.createPreset({
      name: options.name || data.name || 'Imported Preset',
      description: data.description,
      weapon: data.weapon,
      category: data.category,
      phases: data.phases,
      isPublic: options.isPublic || false,
      organizationId
    })
  }
} 