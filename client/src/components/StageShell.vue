<script setup lang="ts">
defineProps<{
  kicker: string;
  title: string;
  otherPath: string;
  otherLabel: string;
}>();

const isDev = import.meta.env.DEV;
</script>

<template>
  <div class="stage">
    <header class="stage__top">
      <p class="kicker">{{ kicker }}</p>
      <RouterLink v-if="isDev" class="dev-link" :to="otherPath">{{ otherLabel }}</RouterLink>
    </header>
    <main class="stage__main">
      <h1>{{ title }}</h1>
      <slot />
    </main>
  </div>
</template>
