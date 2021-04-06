<template>
  <div class="app">
    Back Office Service
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
};
</script>

<style lang="scss">
  @import './assets/scss/app';

  .app{
    overflow: hidden;
    min-height: 100vh;
    position: relative;
  }
</style>
