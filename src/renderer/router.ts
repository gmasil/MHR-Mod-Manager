import {
  createRouter,
  createWebHashHistory,
  RouteRecordRaw,
  RouteLocationNormalized,
  NavigationGuardNext,
  Router,
} from "vue-router";

import HelloView from "./components/Hello.vue";
import EmptyView from "./components/Empty.vue";
import ModListView from "./components/ModList.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "HelloView",
    component: HelloView,
  },
  {
    path: "/empty",
    name: "EmptyView",
    component: EmptyView,
  },
  {
    path: "/mods",
    name: "ModListView",
    component: ModListView,
  },
];

const router: Router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach(
  (
    _to: RouteLocationNormalized,
    _from: RouteLocationNormalized,
    next: NavigationGuardNext
  ): void => {
    next();
  }
);

export default router;