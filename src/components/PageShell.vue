<template>
  <div class="page-shell" :class="{ 'page-shell--wide': wide }">
    <div class="d-flex flex-wrap align-start ga-3 mb-7">
      <div>
        <div class="d-flex flex-wrap align-center ga-3">
          <h1 class="text-h4 font-weight-bold">{{ title }}</h1>
          <slot name="title-after" />
        </div>
        <p v-if="subtitle" class="text-body-1 text-medium-emphasis mt-1">{{ subtitle }}</p>
      </div>
      <v-spacer />
      <div v-if="$slots.actions" class="d-flex align-center ga-2">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; wide?: boolean }>()
</script>
