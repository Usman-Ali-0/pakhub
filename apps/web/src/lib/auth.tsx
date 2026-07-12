'use client'

import { createContext, useContext, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth.store'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
  updateUser: (data: Partial<User>) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken, isLoading, setAuth, clearAuth, loadUser } =
    useAuthStore()

  const login = useCallback(
    (user: User, accessToken: string, refreshToken: string) => {
      setAuth(user, accessToken, refreshToken)
    },
    [setAuth]
  )

  const logout = useCallback(() => {
    clearAuth()
  }, [clearAuth])

  const updateUser = useCallback(
    (data: Partial<User>) => {
      if (user) {
        setAuth({ ...user, ...data } as User, accessToken!, '')
      }
    },
    [user, accessToken, setAuth]
  )

  const refreshUser = useCallback(async () => {
    await loadUser()
  }, [loadUser])

  useEffect(() => {
    refreshUser()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isAuthenticated = !!user && !!accessToken

  return (
    <AuthContext.Provider
      value={{
        user: user as User | null,
        token: accessToken,
        isAuthenticated,
        isLoading,
        login,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
