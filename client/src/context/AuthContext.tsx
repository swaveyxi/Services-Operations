import { createContext, useContext } from 'react';

type AuthState = {
  user: { id?: string; name: string; email: string };
  roles: string[];
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  children,
  user,
  roles,
}: AuthState & { children: React.ReactNode }) {
  return <AuthContext.Provider value={{ user, roles }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return {
    userId: ctx.user.id ?? '',
    userName: ctx.user.name,
    userEmail: ctx.user.email,
    roles: ctx.roles,
    hasRole: (role: string) => ctx.roles.includes(role),
  };
}
