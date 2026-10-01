import { createRouter, createWebHistory } from "vue-router";
import OperatorView from "./views/OperatorView.vue";
import OverlayView from "./views/OverlayView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "overlay", component: OverlayView },
    { path: "/operator", name: "operator", component: OperatorView },
  ],
});
