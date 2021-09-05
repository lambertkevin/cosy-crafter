<template>
  <div class="parts">
    <h1>Morceaux</h1>
    <div class="container">
      <div class="grid-container fluid">
        <div class="grid-x grid-padding-x">
          <div class="small-16 cell">
            <h2>Morceaux</h2>
            <Table
              :properties-map="propertiesMap"
              :data="parts"
              :ordered-by="orderedBy"
              @sort-table="sortParts"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { sortBy } from 'lodash';
import { ref, onMounted } from 'vue';
import Table from '@/components/Table.vue';

export default {
  name: 'Part',

  components: {
    Table
  },

  setup() {
    // Visible properties in table
    const propertiesMap = {
      id: { path: '_id', type: 'string' },
      nom: { path: 'name', type: 'string' },
      section: { path: 'section.name', type: 'string' },
      podcast: { path: 'podcast.name', type: 'string' },
      tags: { path: 'tags', type: 'tags' },
      // 'created at': { path: 'createdAt', type: 'date' },
      fichier: { path: 'file', type: 'audio' }
      // 'nom d\'origine': {path: 'originalFilename', type: 'string'},
      // 'stockage': {path: 'storageType', type: 'string'},
      // 'localisation': {path: 'storagePath', type: 'string'},
      // 'nom du fichier': {path: 'storageFilename', type: 'string'},
      // 'lien public': {path: 'publicLink', type: 'string'},
      // 'type de contenu': {path: 'contentType' type: 'string'},
    };

    // OrderedBy
    const orderedBy = ref({
      propertyName: null,
      order: null
    });

    // Parts
    const parts = ref([]);
    const sortParts = propertyName => {
      const path = propertiesMap?.[propertyName]?.path;

      if (path) {
        if (orderedBy.value.propertyName !== propertyName) {
          orderedBy.value = {
            propertyName,
            order: 'desc'
          };
        } else {
          orderedBy.value.order = orderedBy.value.order === 'desc' ? 'asc' : 'desc';
        }

        const sortedParts = sortBy(parts.value, path);

        parts.value = orderedBy.value.order === 'desc' ? sortedParts : sortedParts.reverse();
      }
    };
    onMounted(async () => {
      const partsData = await axios.get('http://localhost:4000/podcast/v1/parts');
      parts.value = partsData?.data?.data;
      sortParts('created at');
    });

    return {
      propertiesMap,
      parts,
      sortParts,
      orderedBy
    };
  }
};
</script>

<style lang="scss" scoped>
.parts {
  :deep(.table-container) {
    margin-top: 20px;

    .table {
      .th--type-audio,
      .th--type-tags,
      .td--type-audio,
      .td--type-tags {
        text-align: center;
        justify-content: center;
      }
    }
  }
}
</style>
