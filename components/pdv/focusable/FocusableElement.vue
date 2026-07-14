<template>
  <component
    :is="tag"
    v-bind="$attrs"
    ref="focusableRef"
    class="focusable-element"
    :title="title"
    @focus="handleFocus"
  >
    <slot></slot>
  </component>
</template>

<script setup lang="ts">
const { helpFlag, complementText } = defineProps({
  title: {
    type: String,
    required: true,
  },
  tag: {
    type: String,
    default: 'button',
  },
  helpFlag: {
    type: Boolean,
    default: false,
  },
  complementText: {
    type: String,
    default: '',
  },
});

const { speakPhrase } = useTTS();
const { t } = useI18n();

const handleFocus = (event: any) => {
  let phrase = event.target.title;
  if (helpFlag) {
    phrase += '. ' + t('message.helper_text');
  } else if (complementText) {
    phrase += '. ' + complementText;
  }
  speakPhrase(phrase);
};

const focusableRef = ref<HTMLElement | null>(null);
defineExpose({ focusableRef });
</script>
<style>
.focusable-element {
  outline: none;
  border: none;
  display: block;
  width: 100%;
  padding: 10px;
}

.focusable-element:focus {
  outline: auto;
  border: auto;
}
</style>
