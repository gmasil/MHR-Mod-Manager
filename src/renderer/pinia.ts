import {
  defineStore,
  Store as PiniaStore,
  StoreDefinition as PiniaStoreDefinition,
} from "pinia";
import { Mod } from "../main/api/mod";

export interface State {
  initializedMods: boolean;
  mods: Mod[];
}

export type Store = PiniaStore<"main", State>;
export type StoreDefinition = PiniaStoreDefinition<"main", State>;

// store

export const useStore: StoreDefinition = defineStore("main", {
  state: () => {
    return {
      initializedMods: false,
      mods: [],
    } as State;
  },
});
