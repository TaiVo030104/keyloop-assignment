import { Navigate, type RouteObject } from 'react-router'
import { BookingPage } from '@/features/booking/BookingPage'
import { SchedulePage } from '@/features/schedule/SchedulePage'
import { Layout } from './Layout'

export function createRoutes(opts: { showDevPanel?: boolean } = {}): RouteObject[] {
  return [
    {
      element: <Layout showDevPanel={opts.showDevPanel} />,
      children: [
        { index: true, element: <Navigate to="/book" replace /> },
        { path: 'book', element: <BookingPage /> },
        { path: 'schedule', element: <SchedulePage /> },
        { path: '*', element: <Navigate to="/book" replace /> },
      ],
    },
  ]
}
