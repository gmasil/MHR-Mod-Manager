<template>
  <div id="empty">
    <h1>Mods</h1>
    <div v-for="mod in data.mods" :key="mod.id">
      <span>
        {{ mod.name }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from "vue";
import { Mod } from "../../main/api/mod";
import * as electron from "../electron";

interface BaseComponentData {
  mods: Mod[];
}

const data: BaseComponentData = reactive({
  mods: [],
});

onMounted(() => {
  electron.readModList((mods: Mod[]) => {
    data.mods = mods;
  });
});
</script>
