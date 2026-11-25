"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast: "!bg-card !text-foreground !border-border !rounded-lg",
        description: "!text-muted-foreground",
      },
    }}
    {...props}
  />
)

export { Toaster }
