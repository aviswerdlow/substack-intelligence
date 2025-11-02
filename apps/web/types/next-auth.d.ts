import type { DefaultSession } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: DefaultSession['user'] & {
      id: string;
      role?: string | null;
    };
    rememberMe?: boolean;
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: string | null;
    rememberMe?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role?: string;
    rememberMe?: boolean;
  }
}
