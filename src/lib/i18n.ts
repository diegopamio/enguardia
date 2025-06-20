import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    }
  })

export default i18n 