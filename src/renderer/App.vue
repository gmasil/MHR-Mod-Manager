<template>
  <div class="text-center">
    <router-link to="/">Mods</router-link>
    <span> | </span>
    <router-link to="/empty">Empty</router-link>
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

onMounted(() => {
  electron.readModList((mods: Mod[]) => {
    store.mods = mods;
    store.initializedMods = true;
  });
});

defineExpose({
  store,
});
</script>
