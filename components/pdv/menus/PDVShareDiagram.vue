<template>
  <section class="share-panel" aria-labelledby="share-title">
    <h2 id="share-title">Compartilhar diagrama</h2>

    <FocusableInput
      v-model="email"
      title="Convidar usuário cadastrado por e-mail para visualizar o diagrama"
      @submit="inviteUser"
    />
    <p v-if="feedback" role="status" aria-live="polite" class="share-feedback">
      {{ feedback }}
    </p>

    <FocusableElement
      v-for="share in shares"
      :key="share.id"
      :title="`Remover acesso de ${share.name}`"
      @click="revokeShare(share.id)"
    >
      {{ share.name }} ({{ share.email }}) — remover acesso
    </FocusableElement>

    <FocusableElement title="Exportar diagrama como PDF" @click="exportPdf">
      Exportar como PDF
    </FocusableElement>
  </section>
</template>

<script setup lang="ts">
const diagramTool = useDiagram();
const tts = useTTS();
const { shareWithUser, listShares, removeShare } = useDiagramsApi();

const email = ref('');
const feedback = ref('');
const shares = ref<any[]>([]);

async function loadShares() {
  const id = diagramTool.diagram.value?.id;
  if (!id) return;
  shares.value = await listShares(id);
}

async function inviteUser(value: string) {
  const id = diagramTool.diagram.value?.id;
  if (!id || !value.trim()) return;
  try {
    await shareWithUser(id, value.trim());
    email.value = '';
    feedback.value = 'Usuário convidado para visualizar o diagrama.';
    tts.speakPhrase(feedback.value);
    await loadShares();
  } catch (error: any) {
    feedback.value =
      error?.data?.message ?? 'Não foi possível compartilhar com este usuário.';
    tts.speakPhrase(feedback.value);
  }
}

async function revokeShare(shareId: string) {
  const id = diagramTool.diagram.value?.id;
  if (!id) return;
  await removeShare(id, shareId);
  shares.value = shares.value.filter((share) => share.id !== shareId);
  feedback.value = 'Acesso removido.';
  tts.speakPhrase(feedback.value);
}

function exportPdf() {
  window.print();
}

onMounted(() => {
  loadShares();
});
</script>