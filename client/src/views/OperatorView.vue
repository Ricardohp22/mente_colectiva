<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import StageShell from "../components/StageShell.vue";

const online = ref<boolean | null>(null);
let timer = 0;

async function checkHealth(): Promise<void> {
  try {
    const response = await fetch("/health");
    const body = (await response.json()) as { ok?: boolean };
    online.value = response.ok && body.ok === true;
  } catch {
    online.value = false;
  }
}

onMounted(() => {
  void checkHealth();
  timer = window.setInterval(() => {
    void checkHealth();
  }, 3000);
});

onUnmounted(() => {
  window.clearInterval(timer);
});
</script>

<template>
  <StageShell
    kicker="Operador"
    title="Mesa de control"
    other-path="/"
    other-label="Escenario"
  >
    <p class="lede">Desde aquí se inicia, se pausa y se cierra el LIVE. El escenario solo muestra lo que el servidor decida.</p>
    <section
      class="status-card"
      :class="{
        'is-online': online === true,
        'is-offline': online === false,
      }"
    >
      <strong v-if="online === null">Comprobando el servidor…</strong>
      <strong v-else-if="online">Servidor en línea</strong>
      <strong v-else>Servidor apagado</strong>
      <p v-if="online === false">Arranca el servidor para poder operar el juego.</p>
      <p v-else>Los controles del LIVE llegan cuando el motor pueda abrir una pregunta.</p>
    </section>
    <ul class="actions">
      <li>Iniciar LIVE</li>
      <li>Pausar y reanudar</li>
      <li>Siguiente pregunta</li>
      <li>Terminar y mostrar el resultado final</li>
    </ul>
  </StageShell>
</template>
