<template>
  <v-container class="menu">
    <FocusableInput
      :title="t('auth.login.email')"
      v-model="email"
    />
    <FocusableInput
      :title="t('auth.login.password')"
      v-model="password"
      @submit="handleLogin"
    />
    <FocusableElement :title="t('auth.login.submit')" @click="handleLogin">
      {{ t('auth.login.submit') }}
    </FocusableElement>
    <FocusableElement :title="t('auth.login.no_account')" @click="navigateTo(Routes.REGISTER)">
      {{ t('auth.login.no_account') }}
    </FocusableElement>
    <p v-if="error">{{ t('auth.login.error') }}</p>
  </v-container>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { login } = useAuth();

const email = ref('');
const password = ref('');
const error = ref(false);

const handleLogin = async () => {
  error.value = false;
  try {
    await login(email.value, password.value);
    // Nenhum diagrama é carregado aqui: quem está logado escolhe o seu em
    // "Meus projetos" (initDiagrams). Carregar o primeiro da lista exibia o
    // diagrama de outra pessoa (ou criava um vazio para contas só convidadas).
    navigateTo(Routes.HOME);
  } catch (e) {
    error.value = true;
  }
};
</script>