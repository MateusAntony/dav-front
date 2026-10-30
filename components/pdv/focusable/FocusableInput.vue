<template>
  <div class="focusable-input-container">
    <p class="focusable-input-title">
      {{ title }}
    </p>
    <input
      ref="focusableInput"
      v-model="inputValue"
      class="focusable-input"
      :title="title"
      :type="type"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      @focus="handleFocus"
      @input="handleInput"
      @keydown.enter="handleSubmit"
    />
  </div>
</template>
<script setup lang="ts">
import { debounce } from 'lodash';

interface FocusableInputProps {
  title: string;
  modelValue?: string;
  // Permite confirmar com Enter sem digitar nada (ex.: valor opcional/NULL).
  allowEmpty?: boolean;
  // Foca o campo ao abrir a tela. Em telas com vários campos, só o primeiro
  // deve ter foco inicial (senão o último campo montado "rouba" o foco).
  autofocus?: boolean;
  // 'password' mostra o texto como pontos e NÃO fala o que foi digitado.
  type?: 'text' | 'password';
}

const props = withDefaults(defineProps<FocusableInputProps>(), {
  autofocus: true,
  type: 'text',
});

const inputValue = ref(props.modelValue);
let isInternalUpdate = false;

const { speakPhrase } = useTTS();
const i18n = useI18n();

const emit = defineEmits(['submit', 'update:modelValue']);

const debouncedAddPhraseToQueue = debounce((phrase: string) => {
  speakPhrase(phrase);
}, 1500);

const handleInput = (event: any) => {
  if (inputValue.value) {
    // Fala a tecla digitada (letra ou número) — na senha também, porque quem
    // usa voz precisa saber o que digitou. O campo de senha continua mascarado.
    speakPhrase(event.target.value.charAt(inputValue.value.length - 1));
    // O texto inteiro, repetido 1,5 s depois, não é falado na senha.
    if (props.type !== 'password') {
      debouncedAddPhraseToQueue(event.target.value);
    }
  }
};

const handleFocus = (event: any) => {
  speakPhrase(event.target.title);
};

const handleSubmit = () => {
  // O "eco" do que foi digitado é falado 1,5 s depois da última tecla. Ao
  // confirmar, ele é cancelado: senão sairia depois de avançar de tela e
  // cortaria a fala da próxima pergunta ou do resultado.
  debouncedAddPhraseToQueue.cancel();
  if (inputValue.value) {
    emit('submit', inputValue.value);
  } else if (props.allowEmpty) {
    emit('submit', '');
  } else {
    speakPhrase(i18n.t('message.empty_input'));
  }
};

watch(inputValue, (newValue) => {
  if (!isInternalUpdate) {
    emit('update:modelValue', newValue);
  }
});

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== inputValue.value) {
      isInternalUpdate = true;
      inputValue.value = newValue;
      isInternalUpdate = false;
    }
  },
  { deep: true },
);

onBeforeUnmount(() => debouncedAddPhraseToQueue.cancel());

const focusableInput = ref<HTMLElement | null>(null);
onMounted(async () => {
  await nextTick();
  if (props.autofocus) focusableInput.value?.focus();
});
</script>
<style scoped>
.focusable-input-container {
  display: flex;
  flex-direction: column;
}

.focusable-input-title {
  font-size: 1.5rem;
  font-weight: bold;
  padding: 10px;
  cursor: default;
}

.focusable-input {
  padding: 10px;
  background-color: var(--neutral-color);
  border: var(--border-style);
  border-radius: 8px;
  cursor: pointer;
}

input:focus {
  background-color: var(--focus-background-color);
  color: var(--high-contrast-text-color);
  outline: var(--focus-border-style);
}
</style>