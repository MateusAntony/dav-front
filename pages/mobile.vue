<template>
  <div class="desktop-only">
    {{ $t('message.desktop_only') }}
  </div>
</template>
<style scoped>
.desktop-only {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: justify;
  height: 100vh;
  font-size: 1.5em;
  color: #555;
}
</style>
