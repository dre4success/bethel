import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://eu.i.posthog.com'

export function initPostHog() {
  if (!POSTHOG_KEY) {
    console.log('PostHog not configured (missing VITE_POSTHOG_KEY)')
    return
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    respect_dnt: true,
    loaded: () => {
      if (import.meta.env.DEV) posthog.opt_out_capturing()
    },
  })
}

// Helper to track events
export function trackEvent(event: string, properties?: Record<string, any>) {
  if (POSTHOG_KEY && !import.meta.env.DEV) {
    posthog.capture(event, properties)
  }
}

// Predefined events for Bethel
export const analytics = {
  roomCreated: (roomId: string) =>
    trackEvent('room_created', { roomId }),

  roomJoined: (roomId: string, participantCount: number) =>
    trackEvent('room_joined', { roomId, participantCount }),

  strokeAdded: (tool: 'pen' | 'eraser') =>
    trackEvent('stroke_added', { tool }),

  textBlockAdded: () =>
    trackEvent('text_block_added'),

  canvasExported: (format: 'png' | 'svg' | 'pdf') =>
    trackEvent('canvas_exported', { format }),

  canvasCleared: () =>
    trackEvent('canvas_cleared'),

  themeChanged: (theme: 'light' | 'dark') =>
    trackEvent('theme_changed', { theme }),
}

export { posthog }
