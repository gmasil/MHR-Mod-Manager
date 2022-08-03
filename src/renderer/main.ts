import { App, createApp } from "vue";
import mainApp from "./App.vue";
import router from "./router";
import "tailwindcss/tailwind.css";
const app: App<Element> = createApp(mainApp).use(router);

app.mount("#app");
