<template>
  <div class="menu">
    <div class="button-group">
      <FocusableElement
        v-for="(option, index) in options"
        :key="index"
        :title="option.title"
        class="option"
        @click="option.action"
      >
        {{ option.title }}
      </FocusableElement>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PDVMenusEnum } from '~/src/interfaces/pdv-menu';

const { t } = useI18n();

const options = ref([
  {
    title: t('common.back'),
    action: handleBack,
  },
  {
    title: t('common.home'),
    action: handleStart,
  },
  {
    title: t('common.help'),
    action: handleHelp,
  },
]);
const menu = useMenuOptions();
const tts = useTTS();

function handleBack() {
  if (menu.activeMainMenu === PDVMenusEnum.PROJECTS) {
    if (menu.previousDerMenu !== undefined) {
      menu.setActiveDerMenu(menu.previousDerMenu);
    } else {
      menu.setActiveMainMenu(PDVMenusEnum.DEFAULT);
    }
  } else if (menu.activeMainMenu === PDVMenusEnum.TTS) {
    menu.setActiveMainMenu(PDVMenusEnum.DEFAULT);
  } else if (menu.activeMainMenu === PDVMenusEnum.DEFAULT) {
    navigateTo(Routes.WELCOME);
  }
}

function handleStart() {
  menu.setActiveMainMenu(PDVMenusEnum.DEFAULT);
}

function handleHelp() {
  tts.speakPhrase(t('message.navigation_helper'));
}
</script>

<style scoped lang="css">
.menu {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.button-group {
  display: inline-flex;
  width: 50%;
  text-align: center;
  justify-content: center;
}

.option {
  display: inline-flex;
  padding: 10px;
  background-color: var(--neutral-color);
  border: var(--border-style) !important;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}

.option:focus-within {
  border: var(--focus-border-style) !important;
  background-color: var(--focus-background-color);
  color: var(--high-contrast-text-color);
}
</style>
