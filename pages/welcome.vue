<template>
  <v-container class="menu">
    <p ref="initialFocus" :tabindex="-1" />
    <div v-if="!tts.voicesReady.value" class="loading-screen">
      {{ t('message.loading') }}
    </div>
    <div v-else>
      <FocusableElement
        v-for="(element, index) in elements"
        :key="index"
        ref="welcomeElement"
        :tabindex="index"
        :tag="element.tag"
        :title="element.title"
      >
        {{ element.title }}</FocusableElement
      >
      <FocusableElement
        :title="t('welcome.guest')"
        @click="enterAsGuest"
      >
        {{ t('welcome.guest') }}
      </FocusableElement>

      <FocusableElement
        :title="t('welcome.login')"
        @click="navigateTo(Routes.LOGIN)"
        >
        {{ t('welcome.login') }}
      </FocusableElement>      
    </div>
  </v-container>
</template>
<script setup lang="ts">
const { t } = useI18n();
const initialFocus = ref();
const welcomeElement = ref(null);
const tts = useTTS();
const authStore = useAuthStore();
const diagramTool = useDiagram();

const enterAsGuest = async () => {
  authStore.logout();
  await diagramTool.loadDiagram();
  navigateTo(Routes.HOME);
};

const elements = [
  {
    title: t('welcome.welcome'),
    tag: 'h2',
  },
  {
    title: t('welcome.goal'),
    tag: 'p',
  },
  {
    title: t('welcome.tts'),
    tag: 'p',
  },
  {
    title: t('welcome.hotkeys'),
    tag: 'b',
  },
];

const loadVoices = async () => {
  await tts.loadVoices();
};

onBeforeMount(async () => {
  await loadVoices();
});

onMounted(async () => {
  await nextTick();
  initialFocus.value.focus();
});


</script>

<style scoped>
.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 1.5em;
  color: #555;
}

.focusable-element:focus {
  outline: auto;
  border: auto;
}
</style>
