<template>
  <div class="page-shell" :class="{ 'page-shell--wide': wide, 'page-shell--compact-header': compactHeader }">
    <div class="page-shell__header d-flex flex-wrap ga-3" :class="compactHeader ? 'align-center mb-4' : 'align-start mb-7'">
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
defineProps<{ title: string; subtitle?: string; wide?: boolean; compactHeader?: boolean }>()
</script>
