import { createApp } from "vue";
import "@fontsource/fredoka/latin-600.css";
import "@fontsource/fredoka/latin-ext-600.css";
import "@fontsource/fredoka/latin-700.css";
import "@fontsource/fredoka/latin-ext-700.css";
import "@fontsource/outfit/latin-400.css";
import "@fontsource/outfit/latin-ext-400.css";
import "@fontsource/outfit/latin-600.css";
import "@fontsource/outfit/latin-ext-600.css";
import App from "./App.vue";
import { router } from "./router";
import "./styles.css";

createApp(App).use(router).mount("#app");
