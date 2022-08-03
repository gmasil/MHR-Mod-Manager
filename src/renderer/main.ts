import { App, createApp } from "vue";
import mainApp from "./App.vue";
import router from "./router";
import "tailwindcss/tailwind.css";
import { createPinia, Pinia } from "pinia";

const pinia: Pinia = createPinia();
const app: App<Element> = createApp(mainApp).use(router).use(pinia);

app.mount("#app");
