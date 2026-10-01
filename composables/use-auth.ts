export function useAuth() {
  const { request } = useApi()
  const authStore = useAuthStore()
  const session = useSession()

  const register = (data: { name: string; email: string; password: string; vision_impairment: string }) => {
    return request('/users', { method: 'POST', body: data })
  }

  const login = async (email: string, password: string) => {
    // Antes de entrar com outra conta, apaga tudo que ficou da anterior
    // (token, lista de diagramas, diagrama aberto, modo somente leitura...).
    session.endSession()
    const { access_token } = await request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    authStore.setSession(access_token, null)

    const user = await request('/users')
    authStore.setSession(access_token, user)

    return user
  }

  return { register, login }
}