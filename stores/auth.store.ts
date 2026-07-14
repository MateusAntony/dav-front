export const useAuthStore = defineStore('auth', {
  state: (): { token: string | null; user: any | null } => ({
    token: null,
    user: null,
  }),
  actions: {
    setSession(token: string, user: any) {
      this.token = token
      this.user = user
    },
    logout() {
      this.token = null
      this.user = null
    },
  },
  persist: {
    paths: ['token', 'user'],
  },
})