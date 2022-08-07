import {
  createRouter,
  createWebHashHistory,
  RouteRecordRaw,
  RouteLocationNormalized,
  NavigationGuardNext,
  Router,
} from "vue-router";

import HelloView from "./components/Hello.vue";
import ModListView from "./components/ModList.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "ModListView",
    component: ModListView,
  },
  {
    path: "/hello",
    name: "HelloView",
    component: HelloView,
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
