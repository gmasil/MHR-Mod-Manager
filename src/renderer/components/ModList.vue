<template>
  <div>
    <h1 class="text-2xl">Mods</h1>
    <div v-if="store.initializedMods">
      <div v-for="mod in store.mods" :key="mod.id">
        <p>
          {{ mod.name }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStore } from "../pinia";
import type { Store } from "../pinia";

const store: Store = useStore();

defineExpose({
  store,
});
</script>
