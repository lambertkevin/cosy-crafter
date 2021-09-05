<template>
  <div class="table-container">
    <table class="table">
      <thead>
        <th
          v-for="{ type }, propertyName in propertiesMap"
          :key="propertyName"
          @click="$emit('sortTable', propertyName)"
        >
          <div :class="getThClass(propertyName, type)">
            {{ propertyName }}
          </div>
        </th>
      </thead>
      <tbody>
        <tr
          v-for="el in data"
          :key="el._id"
        >
          <td
            v-for="{ path, type }, propertyName in propertiesMap"
            :key="el._id + propertyName"
          >
            <div
              :class="[
              'flex',
              'td',
              `td--type-${type}`
            ]"
              v-html="format(type)(el, path)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { get } from 'lodash';
import { DateTime } from 'luxon';

export default {
  name: 'Table',

  props: {
    propertiesMap: Object,
    data: Array,
    orderedBy: Object
  },

  setup(props) {
    // Formatters
    const stringFormatter = (value, path) => get(value, path);
    const tagsFormatter = (value, path) => {
      const tagsArray = get(value, path);

      return tagsArray.map(x => `<span class='tag'>${x}</span>`).join('');
    };
    const dateFormatter = (value, path) => {
      const dateISO = get(value, path);

      return dateISO
        ? DateTime.fromISO(dateISO)
            .setLocale('fr')
            .toFormat('DD HH:mm')
        : null;
    };
    const audioFormatter = value =>
      // eslint-disable-next-line no-underscore-dangle
      `<audio controls src="http://localhost:4000/storage/v1/podcast-parts/${value._id}" />`;

    const getThClass = (propertyName, type) => {
      const classes = ['th', `th--type-${type}`];
      if (props?.orderedBy?.propertyName === propertyName) {
        classes.push(`th--sorted-by-${props?.orderedBy?.order}`);
      }
      return classes;
    };

    const format = type => {
      switch (type) {
        case 'string':
        default:
          return stringFormatter;
        case 'tags':
          return tagsFormatter;
        case 'date':
          return dateFormatter;
        case 'audio':
          return audioFormatter;
      }
    };

    return {
      getThClass,
      format
    };
  }
};
</script>

<style lang="scss" scoped>
@use '~@/assets/scss/variables';
@use '~foundation-sites/scss/foundation';
@use '~@/assets/scss/settings';

@import '~foundation-sites/scss/util/util';

.table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  // Removes cell margin for the container the reach the borders on overflow
  @include -zf-breakpoint-value(auto, settings.$grid-column-gutter) {
    margin-left: -(rem-calc($-zf-bp-value) / 2);
    margin-right: -(rem-calc($-zf-bp-value) / 2);
    margin-bottom: -(rem-calc($-zf-bp-value) / 2);
    padding-bottom: rem-calc($-zf-bp-value) / 2;
  }

  .table {
    min-width: 100%;
    border-collapse: collapse;

    .th {
      display: grid;
      grid-template-columns: auto 10px;
      grid-column-gap: 5px;

      &--sorted-by {
        &-asc {
          &:after {
            font-family: variables.$icons-font;
            content: map-get(variables.$icons, 'arrow-up');
          }
        }

        &-desc {
          &:after {
            font-family: variables.$icons-font;
            content: map-get(variables.$icons, 'arrow-down');
          }
        }
      }
    }

    thead {
      th {
        border-bottom: 1px solid variables.$medium-dark-gray;
        cursor: pointer;
      }
    }

    th,
    td {
      white-space: nowrap;

      @include -zf-breakpoint-value(auto, foundation.$grid-margin-gutters) {
        padding: foundation.rem-calc(12) (foundation.rem-calc($-zf-bp-value));
      }
    }

    tr {
      overflow: hidden;

      &:hover {
        // background: map-get(variables.$primary, 'pale');
        background: rgba(variables.$light-gray, 0.04);
        box-shadow: 0 6px 15px -4px rgb(0 0 0 / 10%);
      }
    }

    thead {
      text-align: left;
      text-transform: uppercase;
      font-size: foundation.rem-calc(11);
      color: variables.$medium-light-gray;

      &:after {
        height: 1.4em;
        display: table-row;
        content: '';
      }
    }
  }
}
</style>
