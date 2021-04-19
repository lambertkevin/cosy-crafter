<template>
  <div class="app">
    <Sidebar />
    <router-view />
  </div>
</template>

<script>
import Sidebar from '@/components/Sidebar.vue';

export default {
  name: 'App',
  components: {
    Sidebar
  }
};
</script>

<style lang="scss">
@use 'assets/scss/app';
@use 'assets/scss/ui-kit';

.app {
  overflow: hidden;
  min-height: 100vh;
  position: relative;
}
</style>
