<template>
  <div class="app">
    <Sidebar />

    <div class="page">
      <!-- Apply gutters to every pages -->
      <div class="grid-container fluid">
        <div class="grid-x grid-padding-x">
          <div class="small-16 cell">
            <!-- Import view -->
            <router-view />
            <!-- -->
          </div>
        </div>
      </div>
      <!-- -->
    </div>

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
@use '~@/assets/scss/app';
@use '~@/assets/scss/ui-kit';

.app {
  height: 100vh;
  display: flex;

  .page {
    width: 100%;
    height: 100%;
    padding-top: 20px;
    overflow-y: scroll;
    overflow-x: hidden;
  }
}
</style>
