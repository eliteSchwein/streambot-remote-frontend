<template>
  <v-card rounded="lg" height="100%">
    <v-card-text class="d-flex align-start ga-4 pa-5">
      <v-avatar :color="ok === false ? undefined : 'primary'" variant="tonal" size="48"><v-icon>{{ icon }}</v-icon></v-avatar>
      <div class="min-w-0">
        <div class="text-caption text-medium-emphasis mb-1">{{ title }}</div>
        <div class="text-h6 font-weight-medium text-truncate">{{ value }}</div>
        <v-chip size="x-small" class="mt-2" :color="ok === true ? 'success' : ok === false ? undefined : 'primary'" variant="tonal">{{ status }}</v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>
<script setup lang="ts">
defineProps<{ icon: string; title: string; value: string; status: string; ok?: boolean }>()
</script>
