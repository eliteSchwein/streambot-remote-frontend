<template>
  <div>
    <div v-if="items.length" class="macro-grid">
      <button v-for="item in items" :key="itemKey(item)" type="button" class="macro-tile" :title="itemLabel(item)" @click="emit('command','macro.run',{macro:item.name ?? item.id})">
        <span class="macro-tile__icon"><v-icon size="18">mdi-play</v-icon></span><span class="macro-tile__label">{{ itemLabel(item) }}</span><v-icon class="macro-tile__launch" size="16">mdi-chevron-right</v-icon>
      </button>
    </div>
    <div v-else class="empty-state">{{ editLayout ? t('instance.chooseMacros') : t('instance.emptySection') }}</div>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from '@/i18n'
defineProps<{ items:any[]; editLayout?:boolean }>()
const emit = defineEmits<{ command:[method:string,params:any] }>()
const { t } = useI18n()
function itemKey(item:any){ return String(item?.id ?? item?.uuid ?? item?.name ?? item?.label ?? JSON.stringify(item)) }
function itemLabel(item:any){ return String(item?.label ?? item?.name ?? item?.title ?? item?.display_name ?? item?.id ?? t('common.item')) }
</script>
