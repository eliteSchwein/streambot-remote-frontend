<template>
  <div>
    <div class="d-flex flex-wrap ga-2 mb-4"><v-chip variant="tonal" :color="yolobox.connection ? 'success' : undefined">{{ yolobox.connection ? t('common.online') : t('common.offline') }}</v-chip><v-chip v-if="yolobox.ip" variant="tonal">{{ yolobox.ip }}</v-chip></div>
    <RemoteYoloboxControl :yolobox="yolobox" @command="(method,params)=>emit('command',method,params)" />
  </div>
</template>
<script setup lang="ts">
import RemoteYoloboxControl from '@/components/dashboard/RemoteYoloboxControl.vue'
import { useI18n } from '@/i18n'
defineProps<{ yolobox:any }>()
const emit = defineEmits<{ command:[method:string,params:any] }>()
const { t } = useI18n()
</script>
