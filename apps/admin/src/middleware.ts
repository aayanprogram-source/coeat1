import { createDashboardMiddleware } from '@datapal/web-kit/middleware';

export const middleware = createDashboardMiddleware({
  publicPaths: ['/login', '/signup', '/api/health'],
  requireMfa: true,
});

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
