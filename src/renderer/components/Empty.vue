<template>
  <div id="empty">
    <h1>Empty</h1>
    <ul v-for="file in data.names" :key="file">
      <li>
        {{ file }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from "vue";
import * as electron from "../electron";

interface BaseComponentData {
  names: string[];
}

const data: BaseComponentData = reactive({
  names: [],
});

onMounted(() => {
  electron.log("loading files...");
  electron.readDir(".", (dir: string, files: string[]) => {
    electron.log("received files from dir " + dir);
    data.names = files;
  });
});
</script>
