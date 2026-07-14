// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  modules: [
    '@pinia/nuxt', // https://nuxt.com/modules/pinia
    '@pinia-plugin-persistedstate/nuxt', // https://nuxt.com/modules/pinia-plugin-persistedstate
    '@vee-validate/nuxt', // https://nuxt.com/modules/vee-validate
    'vuetify-nuxt-module', // https://nuxt.com/modules/vuetify-nuxt-module
    'nuxt-icons', // https://nuxt.com/modules/icons
    '@nuxtjs/i18n', // https://nuxt.com/modules/i18n
    '@vueuse/nuxt', // https://nuxt.com/modules/vueuse
    '@nuxtjs/device',
  ],
  i18n: {
    lazy: true,
    langDir: 'locales',
    locales: [
      {
        code: 'pt-BR',
        language: 'pt-BR',
        name: 'Portuguese(BR)',
        file: 'pt-BR.json',
      },
    ],
    defaultLocale: 'pt-BR',
    strategy: 'no_prefix',
    vueI18n: './i18n.config.ts',
  },
  piniaPersistedstate: {
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 3, // 3 days, this value is in seconds.
    },
  },
  build: {
    transpile: ['pinia-plugin-persistedstate'],
  },
  runtimeConfig: {
    cms: {
      username: process.env.NUXT_CMS_USERNAME,
      password: process.env.NUXT_CMS_PASSWORD,
    },
    public: {
      apiURL: process.env.NUXT_PUBLIC_API_URL,
    },
  },
  typescript: {
    typeCheck: false,
    tsConfig: {
      compilerOptions: {
        moduleResolution: 'node',
      },
    },
  },
  imports: {
    dirs: ['store', 'src/constants/routes'],
  },
  components: [
    {
      path: '~/components',
      extensions: ['vue'],
    },
    {
      path: '~/components/pdv',
      extensions: ['vue'],
      pathPrefix: false,
    },
  ],
  css: [
    'vue-json-pretty/lib/styles.css',
    '@/assets/styles/global.css',
    'vue-draggable-resizable/style.css',
  ],
});
