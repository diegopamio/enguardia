import { toast } from 'react-hot-toast'

// Define notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading'

// Define multilingual messages
export const messages = {
  en: {
    // Success messages
    success: {
      tournament: {
        created: 'Tournament created successfully',
        updated: 'Tournament updated successfully',
        deleted: 'Tournament deleted successfully',
        activated: 'Tournament activated successfully'
      },
      competition: {
        created: 'Competition created successfully',
        updated: 'Competition updated successfully',
        deleted: 'Competition deleted successfully'
      },
      event: {
        created: 'Event created successfully',
        updated: 'Event updated successfully',
        deleted: 'Event deleted successfully',
        activated: 'Event activated successfully'
      },
      general: {
        saved: 'Changes saved successfully',
        deleted: 'Item deleted successfully',
        copied: 'Copied to clipboard'
      }
    },
    // Error messages
    error: {
      network: {
        offline: 'You are offline. Please check your connection.',
        timeout: 'Request timeout. Please try again.',
        server: 'Server error. Please try again later.',
        notFound: 'The requested resource was not found.',
        forbidden: 'You do not have permission to perform this action.',
        unauthorized: 'Please sign in to continue.'
      },
      validation: {
        required: 'This field is required',
        invalid: 'Invalid value provided',
        tooLong: 'Value is too long',
        tooShort: 'Value is too short',
        invalidDate: 'Invalid date format',
        futureDateRequired: 'Date must be in the future',
        endDateAfterStart: 'End date must be after start date'
      },
      general: {
        unexpected: 'An unexpected error occurred',
        tryAgain: 'Something went wrong. Please try again.',
        saveFailed: 'Failed to save changes',
        deleteFailed: 'Failed to delete item',
        loadFailed: 'Failed to load data'
      },
      tournament: {
        createFailed: 'Failed to create tournament',
        updateFailed: 'Failed to update tournament',
        deleteFailed: 'Failed to delete tournament',
        notFound: 'Tournament not found',
        duplicate: 'A tournament with this name already exists'
      },
      competition: {
        createFailed: 'Failed to create competition',
        updateFailed: 'Failed to update competition',
        deleteFailed: 'Failed to delete competition',
        notFound: 'Competition not found',
        duplicate: 'A competition for this weapon and category already exists'
      },
      event: {
        createFailed: 'Failed to create event',
        updateFailed: 'Failed to update event',
        deleteFailed: 'Failed to delete event',
        notFound: 'Event not found',
        duplicate: 'An event with this name already exists'
      }
    },
    // Warning messages
    warning: {
      unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?',
      deleteConfirm: 'Are you sure you want to delete this item? This action cannot be undone.',
      networkSlow: 'Network connection is slow. Please wait...'
    },
    // Info messages
    info: {
      loading: 'Loading...',
      saving: 'Saving changes...',
      deleting: 'Deleting...',
      processing: 'Processing request...'
    }
  },
  es: {
    // Success messages
    success: {
      tournament: {
        created: 'Torneo creado exitosamente',
        updated: 'Torneo actualizado exitosamente',
        deleted: 'Torneo eliminado exitosamente',
        activated: 'Torneo activado exitosamente'
      },
      competition: {
        created: 'Competición creada exitosamente',
        updated: 'Competición actualizada exitosamente',
        deleted: 'Competición eliminada exitosamente'
      },
      event: {
        created: 'Evento creado exitosamente',
        updated: 'Evento actualizado exitosamente',
        deleted: 'Evento eliminado exitosamente',
        activated: 'Evento activado exitosamente'
      },
      general: {
        saved: 'Cambios guardados exitosamente',
        deleted: 'Elemento eliminado exitosamente',
        copied: 'Copiado al portapapeles'
      }
    },
    // Error messages
    error: {
      network: {
        offline: 'Estás desconectado. Por favor verifica tu conexión.',
        timeout: 'Tiempo de espera agotado. Por favor intenta de nuevo.',
        server: 'Error del servidor. Por favor intenta más tarde.',
        notFound: 'El recurso solicitado no fue encontrado.',
        forbidden: 'No tienes permisos para realizar esta acción.',
        unauthorized: 'Por favor inicia sesión para continuar.'
      },
      validation: {
        required: 'Este campo es requerido',
        invalid: 'Valor inválido proporcionado',
        tooLong: 'El valor es muy largo',
        tooShort: 'El valor es muy corto',
        invalidDate: 'Formato de fecha inválido',
        futureDateRequired: 'La fecha debe ser en el futuro',
        endDateAfterStart: 'La fecha de fin debe ser después de la fecha de inicio'
      },
      general: {
        unexpected: 'Ocurrió un error inesperado',
        tryAgain: 'Algo salió mal. Por favor intenta de nuevo.',
        saveFailed: 'Error al guardar cambios',
        deleteFailed: 'Error al eliminar elemento',
        loadFailed: 'Error al cargar datos'
      },
      tournament: {
        createFailed: 'Error al crear torneo',
        updateFailed: 'Error al actualizar torneo',
        deleteFailed: 'Error al eliminar torneo',
        notFound: 'Torneo no encontrado',
        duplicate: 'Ya existe un torneo con este nombre'
      },
      competition: {
        createFailed: 'Error al crear competición',
        updateFailed: 'Error al actualizar competición',
        deleteFailed: 'Error al eliminar competición',
        notFound: 'Competición no encontrada',
        duplicate: 'Ya existe una competición para este arma y categoría'
      },
      event: {
        createFailed: 'Error al crear evento',
        updateFailed: 'Error al actualizar evento',
        deleteFailed: 'Error al eliminar evento',
        notFound: 'Evento no encontrado',
        duplicate: 'Ya existe un evento con este nombre'
      }
    },
    // Warning messages
    warning: {
      unsavedChanges: 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?',
      deleteConfirm: '¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer.',
      networkSlow: 'La conexión de red es lenta. Por favor espera...'
    },
    // Info messages
    info: {
      loading: 'Cargando...',
      saving: 'Guardando cambios...',
      deleting: 'Eliminando...',
      processing: 'Procesando solicitud...'
    }
  },
  fr: {
    // Success messages
    success: {
      tournament: {
        created: 'Tournoi créé avec succès',
        updated: 'Tournoi mis à jour avec succès',
        deleted: 'Tournoi supprimé avec succès',
        activated: 'Tournoi activé avec succès'
      },
      competition: {
        created: 'Compétition créée avec succès',
        updated: 'Compétition mise à jour avec succès',
        deleted: 'Compétition supprimée avec succès'
      },
      event: {
        created: 'Événement créé avec succès',
        updated: 'Événement mis à jour avec succès',
        deleted: 'Événement supprimé avec succès',
        activated: 'Événement activé avec succès'
      },
      general: {
        saved: 'Modifications enregistrées avec succès',
        deleted: 'Élément supprimé avec succès',
        copied: 'Copié dans le presse-papiers'
      }
    },
    // Error messages
    error: {
      network: {
        offline: 'Vous êtes hors ligne. Veuillez vérifier votre connexion.',
        timeout: 'Délai d\'attente dépassé. Veuillez réessayer.',
        server: 'Erreur serveur. Veuillez réessayer plus tard.',
        notFound: 'La ressource demandée n\'a pas été trouvée.',
        forbidden: 'Vous n\'avez pas la permission d\'effectuer cette action.',
        unauthorized: 'Veuillez vous connecter pour continuer.'
      },
      validation: {
        required: 'Ce champ est requis',
        invalid: 'Valeur invalide fournie',
        tooLong: 'La valeur est trop longue',
        tooShort: 'La valeur est trop courte',
        invalidDate: 'Format de date invalide',
        futureDateRequired: 'La date doit être dans le futur',
        endDateAfterStart: 'La date de fin doit être après la date de début'
      },
      general: {
        unexpected: 'Une erreur inattendue s\'est produite',
        tryAgain: 'Quelque chose s\'est mal passé. Veuillez réessayer.',
        saveFailed: 'Échec de la sauvegarde des modifications',
        deleteFailed: 'Échec de la suppression de l\'élément',
        loadFailed: 'Échec du chargement des données'
      },
      tournament: {
        createFailed: 'Échec de la création du tournoi',
        updateFailed: 'Échec de la mise à jour du tournoi',
        deleteFailed: 'Échec de la suppression du tournoi',
        notFound: 'Tournoi non trouvé',
        duplicate: 'Un tournoi avec ce nom existe déjà'
      },
      competition: {
        createFailed: 'Échec de la création de la compétition',
        updateFailed: 'Échec de la mise à jour de la compétition',
        deleteFailed: 'Échec de la suppression de la compétition',
        notFound: 'Compétition non trouvée',
        duplicate: 'Une compétition pour cette arme et catégorie existe déjà'
      },
      event: {
        createFailed: 'Échec de la création de l\'événement',
        updateFailed: 'Échec de la mise à jour de l\'événement',
        deleteFailed: 'Échec de la suppression de l\'événement',
        notFound: 'Événement non trouvé',
        duplicate: 'Un événement avec ce nom existe déjà'
      }
    },
    // Warning messages
    warning: {
      unsavedChanges: 'Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir partir?',
      deleteConfirm: 'Êtes-vous sûr de vouloir supprimer cet élément? Cette action ne peut pas être annulée.',
      networkSlow: 'La connexion réseau est lente. Veuillez patienter...'
    },
    // Info messages
    info: {
      loading: 'Chargement...',
      saving: 'Sauvegarde des modifications...',
      deleting: 'Suppression...',
      processing: 'Traitement de la demande...'
    }
  }
}

// Get user's preferred language
export function getPreferredLanguage(): keyof typeof messages {
  if (typeof window !== 'undefined') {
    try {
      const storedLang = localStorage.getItem('language')
      if (storedLang && storedLang in messages) {
        return storedLang as keyof typeof messages
      }
    } catch (e) {
      // localStorage not available or blocked, continue to browser language detection
      console.warn('localStorage not available for language detection:', e)
    }
    
    // Fallback to browser language
    try {
      const browserLang = navigator.language.slice(0, 2)
      if (browserLang in messages) {
        return browserLang as keyof typeof messages
      }
    } catch (e) {
      // Navigator not available, use default
      console.warn('Navigator language detection failed:', e)
    }
  }
  return 'en' // Default fallback
}

// Get nested message by path
function getNestedMessage(obj: any, path: string[]): string {
  return path.reduce((current, key) => current?.[key], obj) || 'Message not found'
}

// Get localized message
export function getMessage(path: string, locale?: keyof typeof messages): string {
  const lang = locale || getPreferredLanguage()
  const pathArray = path.split('.')
  return getNestedMessage(messages[lang], pathArray)
}

// Notification functions
export const notify = {
  success: (message: string, options?: any) => {
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
      ...options
    })
  },
  
  error: (message: string, options?: any) => {
    toast.error(message, {
      duration: 6000,
      position: 'top-right',
      ...options
    })
  },
  
  warning: (message: string, options?: any) => {
    toast(message, {
      duration: 5000,
      position: 'top-right',
      icon: '⚠️',
      ...options
    })
  },
  
  info: (message: string, options?: any) => {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: 'ℹ️',
      ...options
    })
  },
  
  loading: (message: string, options?: any) => {
    return toast.loading(message, {
      position: 'top-right',
      ...options
    })
  },
  
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId)
  },
  
  // Convenience methods with predefined messages
  successByKey: (key: string, locale?: keyof typeof messages) => {
    notify.success(getMessage(`success.${key}`, locale))
  },
  
  errorByKey: (key: string, locale?: keyof typeof messages) => {
    notify.error(getMessage(`error.${key}`, locale))
  },
  
  warningByKey: (key: string, locale?: keyof typeof messages) => {
    notify.warning(getMessage(`warning.${key}`, locale))
  },
  
  infoByKey: (key: string, locale?: keyof typeof messages) => {
    notify.info(getMessage(`info.${key}`, locale))
  }
}

// Error handling utilities
export interface ApiError {
  message: string
  errors?: Array<{ field: string; message: string }>
  status?: number
  code?: string
}

export class NotificationError extends Error {
  public status?: number
  public code?: string
  public errors?: Array<{ field: string; message: string }>

  constructor(message: string, options?: { status?: number; code?: string; errors?: Array<{ field: string; message: string }> }) {
    super(message)
    this.name = 'NotificationError'
    this.status = options?.status
    this.code = options?.code
    this.errors = options?.errors
  }
}

// Parse API error response
export async function parseApiError(response: Response): Promise<NotificationError> {
  let errorData: any = {}
  
  try {
    errorData = await response.json()
  } catch {
    // If JSON parsing fails, use status-based error
  }

  const status = response.status
  let message = errorData.error || errorData.message || 'An error occurred'
  
  // Map status codes to user-friendly messages
  switch (status) {
    case 400:
      message = getMessage('error.validation.invalid')
      break
    case 401:
      message = getMessage('error.network.unauthorized')
      break
    case 403:
      message = getMessage('error.network.forbidden')
      break
    case 404:
      message = getMessage('error.network.notFound')
      break
    case 408:
      message = getMessage('error.network.timeout')
      break
    case 500:
      message = getMessage('error.network.server')
      break
    default:
      if (status >= 500) {
        message = getMessage('error.network.server')
      } else if (status >= 400) {
        message = errorData.error || getMessage('error.general.tryAgain')
      }
  }

  return new NotificationError(message, {
    status,
    code: errorData.code,
    errors: errorData.errors
  })
}

// Enhanced fetch with error handling
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error = await parseApiError(response)
      throw error
    }

    return response
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof NotificationError) {
      throw error
    }
    
    if (error instanceof TypeError) {
      throw new NotificationError(getMessage('error.network.offline'))
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NotificationError(getMessage('error.network.timeout'))
    }
    
    throw new NotificationError(getMessage('error.general.unexpected'))
  }
}

// Confirmation dialog utility
export function confirmAction(message: string): boolean {
  if (typeof window !== 'undefined') {
    return window.confirm(message)
  }
  return false // Default to false if window is not available
}

// Enhanced confirmation with custom messages
export function confirmDelete(): boolean {
  return confirmAction(getMessage('warning.deleteConfirm'))
}

export function confirmUnsavedChanges(): boolean {
  return confirmAction(getMessage('warning.unsavedChanges'))
} 