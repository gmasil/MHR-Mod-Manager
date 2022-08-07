<template>
  <div class="text-center">
    <router-link to="/">Mods</router-link>
    <span> | </span>
    <router-link to="/hello">Hello</router-link>
  </div>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import * as electron from "./electron";
import { useStore } from "./pinia";
import type { Store } from "./pinia";
import { onMounted } from "vue";
import { Mod } from "../main/api/mod";

electron.log("Hello from App.vue!");

const store: Store = useStore();

function updateMods(mods: Mod[], updated: Mod): void {
  mods
    .filter((mod: Mod) => mod.id == updated.id)
    .forEach((mod: Mod) => (mod.enabled = updated.enabled));
}

onMounted(() => {
  electron.readModList((mods: Mod[]) => {
    store.mods = mods;
    store.initializedMods = true;
  });
  electron.onModEnabledChange((updated: Mod, enabled: boolean) => {
    updated.enabled = enabled;
    updateMods(store.mods, updated);
    store.mods
      .filter((mod: Mod) => mod.isBundle)
      .forEach((mod: Mod) => {
        updateMods(mod.children, updated);
      });
  });
});

defineExpose({
  store,
});
</script>
