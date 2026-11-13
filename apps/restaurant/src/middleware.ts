import { createDashboardMiddleware } from '@datapal/web-kit/middleware';

export const middleware = createDashboardMiddleware({
  publicPaths: ['/login', '/signup', '/reset', '/api/health', '/s', '/.well-known'],
  requireMfa: false,
  extraSources: {
    img: ['https://maps.gstatic.com', 'https://maps.googleapis.com', 'https://*.googleusercontent.com'],
    connect: ['https://maps.googleapis.com'],
  },
});

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
