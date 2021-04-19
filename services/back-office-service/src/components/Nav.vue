<template>
  <nav class="nav">
    <ul class="nav__list">
      <!-- For each entry in pages prop (which can be an accordion of links or a single link) -->
      <li
        v-for="(entry, entryName, index) in pages"
        :key="index"
        :class="[
            'nav__list__item',
            isAccordionOpen(entryName) ? 'nav__list__item--open' : null
          ]"
      >
        <!-- if entry has multiple links -->
        <template v-if="entry.links">
          <div
            @click="toggleAccordion(entryName)"
            class="nav__list__item__name"
          >
            <i :class="`icon icon--${entry.icon}`" />
            <span>{{ entryName }}</span>
            <i
              v-if="entry.links"
              :class="[
                'icon',
                isAccordionOpen(entryName) ? 'icon--minus' : 'icon--plus'
              ]"
            />
          </div>
          <ul
            v-show="isAccordionOpen(entryName)"
            class="nav__list__item__sub-list"
          >
            <li
              v-for="(page, pageName, index) in entry.links"
              :key="index"
              class="nav__list__item__sub-list__sub-item"
            >
              <router-link :to="page">
                {{ pageName }}
              </router-link>
            </li>
          </ul>
        </template>

        <!-- else if entry is just a link -->
        <template v-else>
          <router-link
            class="nav__list__item__name"
            :to="entry.link"
          >
            <i :class="`icon icon--${entry.icon}`" />
            <span>{{ entryName }}</span>
            <i />
          </router-link>
        </template>
      </li>
    </ul>
  </nav>
</template>

<script>
import joi from 'joi';
import { ref } from 'vue';

export default {
  props: {
    pages: {
      type: Object,
      validator: prop => joi
        .object()
        .pattern(
          joi.string(),
          joi.object({
            icon: joi.string().optional(),
            links: joi.object().pattern(joi.string(), joi.string()).optional(),
            link: joi.string().optional()
          })
        )
        .unknown()
      // Validating an object with any key with
      // object as value containing optional icon and required links
      // i.e. { any: { icon: 'hello', links: { foo: 'bar' } } }
        .validate(prop)
    }
  },

  setup() {
    const openedAccordions = ref([]);
    const isAccordionOpen = accordionName => openedAccordions.value.includes(accordionName);
    const toggleAccordion = accordionName => {
      openedAccordions.value = openedAccordions.value.includes(accordionName)
        ? openedAccordions.value.filter(x => x !== accordionName)
        : [...openedAccordions.value, accordionName];
    };

    return {
      openedAccordions,
      isAccordionOpen,
      toggleAccordion
    };
  }
};
</script>

<style lang="scss" scoped>
@use 'foundation';
@use '~@/assets/scss/variables';

$lineHeight: 30px;

%active-item-name {
  background: linear-gradient(
    to left,
    map-get(variables.$primary, 'vivid'),
    map-get(variables.$primary, 'pale')
  );
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav {
  text-transform: capitalize;
  font-weight: bold;
  width: 75%;
  user-select: none;

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;

    &__item {
      $itemClass: &;
      font-size: foundation.rem-calc(15);
      line-height: $lineHeight;
      cursor: pointer;
      margin-bottom: 5px;

      &--open {
        #{$itemClass}__name {
          @extend %active-item-name;
        }
      }

      &__name {
        display: grid;
        grid-template-columns: 26px auto 26px;
        grid-gap: 15px;

        &:hover {
          @extend %active-item-name;
        }
      }

      &__sub-list {
        list-style: none;
        margin: 0;
        padding: 0;
        padding-bottom: 10px;

        &__sub-item {
          height: $lineHeight * 0.75;
          font-size: foundation.rem-calc(13);
          margin: 6px 0;
          line-height: $lineHeight * 0.75;
          color: variables.$medium-light-gray;
          border-radius: 8px;
          padding-left: 26px + 15px;

          &:hover {
            color: variables.$white;
          }
        }
      }

      a {
        color: inherit;
      }
    }
  }
}
</style>
