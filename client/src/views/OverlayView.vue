<script setup lang="ts">
import { ref } from "vue";
import { playWelcomeCue } from "../audio/cue";
import StageShell from "../components/StageShell.vue";

const categories = ["Matemáticas", "Lógica", "Cultura general", "Cultura pop", "Acertijos"];
const playing = ref(false);
const isDev = import.meta.env.DEV;

async function previewSound(): Promise<void> {
  playing.value = true;
  await playWelcomeCue();
  window.setTimeout(() => {
    playing.value = false;
  }, 700);
}
</script>

<template>
  <StageShell
    kicker="Escenario"
    title="Mente colectiva"
    other-path="/operator"
    other-label="Mesa de control"
  >
    <div class="ring" aria-hidden="true" />
    <p class="lede">
      El escenario está listo. Cuando el operador inicie el LIVE, aquí aparecen la pregunta,
      el reloj y los resultados.
    </p>
    <ul class="chips">
      <li v-for="category in categories" :key="category">{{ category }}</li>
    </ul>
    <button
      v-if="isDev"
      class="sound-button"
      :class="{ 'is-playing': playing }"
      type="button"
      @click="previewSound"
    >
      Probar sonido
    </button>
  </StageShell>
</template>
