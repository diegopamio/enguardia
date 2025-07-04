import { PrismaClient } from '@prisma/client'
import { TranslatedEntityService, SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/i18n/translation-helpers'

const prisma = new PrismaClient()

export default async function MultilingualDemoPage() {
  const translationService = new TranslatedEntityService(prisma)
  
  // Get organizations and events in all supported languages
  const organizationsData = await Promise.all(
    SUPPORTED_LOCALES.map(async (locale) => ({
      locale,
      organizations: await translationService.getOrganizationsWithTranslations(locale)
    }))
  )

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        🌍 Multilingual Database Demo
      </h1>
      
      <div className="grid gap-8">
        {organizationsData.map(({ locale, organizations }) => (
          <div key={locale} className="border rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              {getFlag(locale)} {getLanguageName(locale)}
              <span className="text-sm text-gray-500 font-normal">({locale})</span>
            </h2>
            
            <div className="grid gap-4">
              {organizations.map((org) => (
                <div key={org.id} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-xl font-medium text-blue-600">
                    {org.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Display Name: {org.displayName}
                  </p>
                  <p className="text-gray-700">{org.description}</p>
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Events in this language:</h4>
                    <EventsList organizationId={org.id} locale={locale} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">🔧 Technical Details</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">Database Schema:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Normalized translation tables (3NF)</li>
              <li>Unique constraints: [entityId, locale]</li>
              <li>Cascade delete for referential integrity</li>
              <li>Fallback to default locale (en)</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">Supported Languages:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>🇺🇸 English (en) - Default</li>
              <li>🇪🇸 Spanish (es) - Español</li>
              <li>🇫🇷 French (fr) - Français</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

async function EventsList({ 
  organizationId, 
  locale 
}: { 
  organizationId: string
  locale: SupportedLocale 
}) {
  const translationService = new TranslatedEntityService(prisma)
  const events = await translationService.getEventsWithTranslations(organizationId, locale)
  
  if (events.length === 0) {
    return (
      <p className="text-gray-500 italic">
        No events available in this language
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div key={event.id} className="bg-white p-3 rounded border">
          <h5 className="font-medium text-green-600">{event.name}</h5>
          <p className="text-sm text-gray-600">{event.description}</p>
          <div className="text-xs text-gray-500 mt-1">
            {event.weapon} • {event.category} • {new Date(event.startDate).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  )
}

function getFlag(locale: SupportedLocale): string {
  const flags = {
    en: '🇺🇸',
    es: '🇪🇸', 
    fr: '🇫🇷'
  }
  return flags[locale]
}

function getLanguageName(locale: SupportedLocale): string {
  const names = {
    en: 'English',
    es: 'Español',
    fr: 'Français'
  }
  return names[locale]
} 