export function useApi() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const request = async <T>(path: string, options: any = {}): Promise<T> => {
    return await $fetch<T>(`${config.public.apiURL}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        ...(authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}),
      },
    })
  }

  return { request }
}