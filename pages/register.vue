<template>
  <v-container class="menu">
    <FocusableInput
      v-if="step === 'name'"
      :title="t('auth.register.name')"
      v-model="name"
      @submit="step = 'email'"
    />
    <FocusableInput
      v-else-if="step === 'email'"
      :title="t('auth.register.email')"
      v-model="email"
      @submit="step = 'password'"
    />
    <FocusableInput
      v-else-if="step === 'password'"
      :title="t('auth.register.password')"
      v-model="password"
      @submit="step = 'vision'"
    />
    <FocusableSelect
      v-else-if="step === 'vision'"
      :title="t('auth.register.vision_title')"
      :items="visionItems"
      should-translate
      @submit="handleVisionSelect"
    />

    <FocusableElement :title="t('auth.register.has_account')" @click="navigateTo(Routes.LOGIN)">
      {{ t('auth.register.has_account') }}
    </FocusableElement>

    <p v-if="error">{{ t('auth.register.error') }}</p>
  </v-container>
</template>

<script setup lang="ts">
import { VisionImpairmentOptionsMap } from '~/src/interfaces/vision-impairment';

const { t } = useI18n();
const { register } = useAuth();

const step = ref<'name' | 'email' | 'password' | 'vision'>('name');
const name = ref('');
const email = ref('');
const password = ref('');
const error = ref(false);

const visionItems = VisionImpairmentOptionsMap.map((item) => ({ title: item.title }));

const handleVisionSelect = async (index: number) => {
  error.value = false;
  try {
    await register({
      name: name.value,
      email: email.value,
      password: password.value,
      vision_impairment: VisionImpairmentOptionsMap[index].value,
    });
    navigateTo(Routes.LOGIN);
  } catch {
    error.value = true;
    step.value = 'name';
  }
};
</script>