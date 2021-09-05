import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '@/views/Dashboard.vue';
import Parts from '@/views/Parts.vue';

const routes = [
  {
    path: '/',
    component: Dashboard,
    name: 'Dashboard'
  },
  {
    path: '/content/parts',
    component: Parts,
    name: 'Morceaux'
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

export default router;
