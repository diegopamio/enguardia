import React from 'react'
import { cn } from '@/lib/utils'

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ScrollArea: React.FC<ScrollAreaProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden',
        className
      )}
      {...props}
    >
      <div className="h-full w-full overflow-auto">
        {children}
      </div>
    </div>
  )
} 