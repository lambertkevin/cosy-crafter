<template>
  <aside class="sidebar">
    <div class="sidebar__logo" />
    <div class="sidebar__title">Admin panel</div>
    <Nav :pages="pages" />
  </aside>
</template>

<script>
import { markRaw } from 'vue';
import Nav from '@/components/Nav.vue';

export default {
  name: 'Sidebar',

  components: {
    Nav
  },

  setup() {
    const pages = markRaw({
      dashboard: {
        icon: 'activity',
        link: '/'
      },
      contenu: {
        icon: 'grid',
        links: {
          morceaux: '/content/parts',
          podcasts: '/content/podcasts',
          sections: '/content/sections'
        }
      },
      utilisateurs: {
        icon: 'user',
        link: '/users'
      },
      services: {
        icon: 'share-2',
        links: {
          overview: '/services',
          tokens: '/services/tokens'
        }
      }
    });

    return {
      pages
    };
  }
};
</script>

<style lang="scss" scoped>
@use '~foundation-sites/scss/foundation';
@use '~@/assets/scss/variables';

.sidebar {
  $radius: 20px;
  width: 275px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  &__logo {
    background: url(~@/assets/images/logo.png) no-repeat center center;
    background-size: 150px;
    margin-top: 20px;
    height: 70px;
    width: 100%;
  }

  &__title {
    text-align: center;
    width: 100%;
    font-weight: bold;
    text-transform: uppercase;
    font-size: foundation.rem-calc(10px);
    letter-spacing: 0.07rem;
  }

  .nav {
    margin-top: 50px;
  }
}
</style>
