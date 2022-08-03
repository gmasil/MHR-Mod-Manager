<template>
  <div class="text-center">
    <router-link to="/">Home</router-link>
    <span> | </span>
    <router-link to="/empty">Empty</router-link>
    <span> | </span>
    <router-link to="/mods">Mods</router-link>
  </div>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import * as electron from "./electron";

electron.log("Hello from App.vue!");
</script>
