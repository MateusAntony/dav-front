export function useAuth() {
  const { request } = useApi()
  const authStore = useAuthStore()

  const register = (data: { name: string; email: string; password: string; vision_impairment: string }) => {
    return request('/users', { method: 'POST', body: data })
  }

  const login = async (email: string, password: string) => {
    const res = await request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    authStore.setSession(res.token, res.user)
    return res
  }

  return { register, login }
}