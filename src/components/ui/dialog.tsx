import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  )
}

interface DialogContentProps {
  className?: string
  children: React.ReactNode
}

export const DialogContent: React.FC<DialogContentProps> = ({ className, children }) => {
  return (
    <div className={cn(
      'relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4',
      className
    )}>
      {children}
    </div>
  )
}

interface DialogHeaderProps {
  children: React.ReactNode
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children }) => {
  return (
    <div className="mb-4">
      {children}
    </div>
  )
}

interface DialogTitleProps {
  children: React.ReactNode
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ children }) => {
  return (
    <h2 className="text-lg font-semibold text-gray-900 mb-2">
      {children}
    </h2>
  )
}

interface DialogDescriptionProps {
  children: React.ReactNode
}

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ children }) => {
  return (
    <p className="text-sm text-gray-600">
      {children}
    </p>
  )
} 