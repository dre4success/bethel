import { createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router'
import { Home } from './pages/Home'
import { Room } from './pages/Room'

// Root layout
const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

// Index route - recent rooms list
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

// Room route - collaborative room
const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/room/$roomId',
  component: Room,
})

// Create room route - redirects to new room
const newRoomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/room/new',
  component: () => {
    // This will be handled by the Room component with roomId='new'
    return <Room />
  },
})

// Route tree
const routeTree = rootRoute.addChildren([indexRoute, newRoomRoute, roomRoute])

// Create router
export const router = createRouter({ routeTree })

// Type declaration for router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
