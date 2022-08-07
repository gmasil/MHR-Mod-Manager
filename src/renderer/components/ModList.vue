<template>
  <div>
    <h1 class="text-2xl">Mods</h1>
    <a @click="collapseAll()">
      <vue-feather type="minus-square"></vue-feather>
      Collapse all
    </a>
    <div v-if="store.initializedMods" class="grid gap-2">
      <div
        v-for="mod in store.mods"
        :key="mod.id"
        class="grid grid-left-auto-2 border-black border-2 gap-1"
      >
        <a @click="onModMainIconClick(mod)">
          <vue-feather
            v-if="mod.isBundle && mod.isBundleCollapsed"
            type="plus-square"
          ></vue-feather>
          <vue-feather
            v-if="mod.isBundle && !mod.isBundleCollapsed"
            type="minus-square"
          ></vue-feather>
          <vue-feather
            v-if="!mod.isBundle && mod.enabled"
            type="check-square"
          ></vue-feather>
          <vue-feather
            v-if="!mod.isBundle && !mod.enabled"
            type="square"
          ></vue-feather>
        </a>
        <p>
          {{ mod.name }}
        </p>
        <div v-if="mod.isBundle && !mod.isBundleCollapsed" class="col-span-2">
          <div
            v-for="childMod in mod.children"
            :key="childMod.id"
            class="grid grid-left-auto-2 gap-1"
          >
            <a @click="onToggleModEnabled(childMod)">
              <vue-feather
                v-if="childMod.enabled"
                type="check-square"
              ></vue-feather>
              <vue-feather v-if="!childMod.enabled" type="square"></vue-feather>
            </a>
            <p>
              {{ childMod.name }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStore } from "../pinia";
import type { Store } from "../pinia";
import { Mod } from "../../main/api/mod";
import * as electron from "../electron";

const store: Store = useStore();

function onModMainIconClick(mod: Mod): void {
  if (mod.isBundle) {
    mod.isBundleCollapsed = !mod.isBundleCollapsed;
  } else {
    onToggleModEnabled(mod);
  }
}

function onToggleModEnabled(mod: Mod): void {
  if (!mod.isBundle && mod.filePath) {
    electron.toggleModEnabled(mod.filePath);
  }
}

function collapseAll(): void {
  store.mods.forEach((mod: Mod) => {
    if (mod.isBundle) {
      mod.isBundleCollapsed = true;
    }
  });
}

defineExpose({
  store,
  onModMainIconClick,
  collapseAll,
});
</script>

<style scoped>
.grid-left-auto-2 {
  grid-template-columns: auto 1fr;
}
</style>
