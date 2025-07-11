import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Translation resources
const resources = {
  en: {
    common: {
      // Navigation
      home: 'Home',
      events: 'Events',
      athletes: 'Athletes',
      results: 'Results',
      signIn: 'Sign In',
      signOut: 'Sign Out',
      
      // Actions
      create: 'Create',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      
      // App title
      appName: 'Enguardia',
      appDescription: 'Fencing Tournament Management System',
    }
  },
  es: {
    common: {
      // Navigation
      home: 'Inicio',
      events: 'Eventos',
      athletes: 'Atletas',
      results: 'Resultados',
      signIn: 'Iniciar Sesión',
      signOut: 'Cerrar Sesión',
      
      // Actions
      create: 'Crear',
      edit: 'Editar',
      delete: 'Eliminar',
      save: 'Guardar',
      cancel: 'Cancelar',
      
      // App title
      appName: 'Enguardia',
      appDescription: 'Sistema de Gestión de Torneos de Esgrima',
    }
  },
  fr: {
    common: {
      // Navigation
      home: 'Accueil',
      events: 'Événements',
      athletes: 'Athlètes',
      results: 'Résultats',
      signIn: 'Se Connecter',
      signOut: 'Se Déconnecter',
      
      // Actions
      create: 'Créer',
      edit: 'Modifier',
      delete: 'Supprimer',
      save: 'Enregistrer',
      cancel: 'Annuler',
      
      // App title
      appName: 'Enguardia',
      appDescription: 'Système de Gestion de Tournois d\'Escrime',
    }
  }
}

// Initialize i18n without browser detection for SSR compatibility
i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: 'en', // Default language for SSR
    debug: false, // Disable debug to avoid console noise
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Disable all client-side detection for SSR
    detection: {
      order: [], // No detection on server
      caches: [], // No caching on server
    },
    
    // SSR-specific settings
    react: {
      useSuspense: false, // Disable suspense for SSR
    }
  })

// Client-side language detection and localStorage handling
if (typeof window !== 'undefined') {
  // Only run on client side
  const detectAndSetLanguage = () => {
    try {
      // Check localStorage first
      const storedLang = localStorage.getItem('i18nextLng')
      if (storedLang && storedLang in resources) {
        i18n.changeLanguage(storedLang)
        return
      }
      
      // Fallback to browser language
      const browserLang = navigator.language?.slice(0, 2)
      if (browserLang && browserLang in resources) {
        i18n.changeLanguage(browserLang)
        // Save to localStorage for next time
        localStorage.setItem('i18nextLng', browserLang)
      }
    } catch (error) {
      console.warn('Language detection failed:', error)
      // Stick with default 'en'
    }
  }

  // Detect language after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectAndSetLanguage)
  } else {
    detectAndSetLanguage()
  }
}

export default i18n 