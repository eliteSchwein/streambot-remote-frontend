<template>
  <div>
    <div v-if="items.length" class="interaction-list">
      <div v-for="item in items" :key="itemKey(item)" class="interaction-item" :class="`interaction-item--${interactionState(item)}`">
        <div class="interaction-item__icon"><v-icon :icon="interactionSourceIcon(item)" size="22" /></div>
        <div class="interaction-item__body">
          <div class="interaction-item__headline">
            <span class="font-weight-bold">{{ interactionDisplayName(item) }}</span>
            <v-chip v-if="interactionState(item) !== 'active'" size="x-small" variant="tonal" :color="interactionStateColor(item)" :prepend-icon="interactionStateIcon(item)">{{ interactionStateLabel(item) }}</v-chip>
          </div>
          <div class="interaction-item__meta">
            <span><v-icon :icon="interactionSourceIcon(item)" size="16" />{{ interactionSourceLabel(item) }}</span>
            <span v-if="Number(item.duration ?? 0) > 0"><v-icon icon="mdi-timer-outline" size="16" />{{ t('instance.interactionDuration',{duration:formatSeconds(item.duration)}) }}</span>
            <span v-if="Number(item.eta_seconds ?? 0) > 0"><v-icon icon="mdi-clock-fast" size="16" />{{ t('instance.interactionEta',{duration:formatSeconds(item.eta_seconds)}) }}</span>
            <span v-else-if="interactionState(item) === 'active'"><v-icon icon="mdi-progress-clock" size="16" />{{ t('instance.interactionPleaseWait') }}</span>
            <span v-if="Number(item.alert_count ?? 0) > 0"><v-icon icon="mdi-bell-outline" size="16" />{{ t('instance.interactionAlerts',{count:Number(item.alert_count)}) }}</span>
          </div>
          <v-progress-linear v-if="interactionState(item) === 'active' && Number(item.duration ?? 0) > 0" class="interaction-item__progress" :model-value="interactionProgress(item)" color="white" bg-color="rgba(255,255,255,.22)" rounded height="4" />
          <div v-if="item.error" class="interaction-item__error"><v-icon icon="mdi-alert-circle-outline" size="16" />{{ item.error }}</div>
        </div>
        <v-btn class="interaction-item__remove" icon="mdi-close" :variant="interactionState(item) === 'active' ? 'tonal' : 'text'" :color="interactionState(item) === 'active' ? 'white' : 'error'" size="small" :title="t('instance.interactionCancel')" @click.stop="emit('command','interaction.remove',{uuid:item.uuid ?? item.id})" />
      </div>
    </div>
    <div v-else class="interaction-empty"><v-icon icon="mdi-check-circle-outline" size="22" /><span>{{ t('instance.noInteractions') }}</span></div>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from '@/i18n'
defineProps<{ items:any[] }>()
const emit = defineEmits<{ command:[method:string,params:any] }>()
const { t } = useI18n()
function itemKey(item:any){ return String(item?.id ?? item?.uuid ?? item?.name ?? item?.label ?? JSON.stringify(item)) }
function itemLabel(item:any){ return String(item?.label ?? item?.name ?? item?.title ?? item?.display_name ?? item?.sceneName ?? item?.id ?? t('common.item')) }
function formatSeconds(value:any){ const total=Math.max(0,Math.round(Number(value)||0)); const h=Math.floor(total/3600); const m=Math.floor((total%3600)/60); const sec=total%60; if(h) return `${h}h ${m}m`; if(m) return `${m}m ${sec}s`; return `${sec}s` }
function interactionState(item:any){ return String(item?.state ?? item?.status ?? 'queued').toLowerCase() }
function interactionSource(item:any){ return String(item?.source ?? item?.type ?? 'other').toLowerCase() }
function interactionDisplayName(item:any){ const name=itemLabel(item).trim(); const source=interactionSource(item); const prefixes:Record<string,string>={channel_point:String(t('instance.interactionChannelPoint')),command:String(t('instance.interactionCommand')),event:String(t('instance.interactionEvent'))}; const prefix=prefixes[source]; if(!prefix) return name; return name.toLowerCase().startsWith(`${prefix.toLowerCase()}:`) ? name : `${prefix}: ${name}` }
function interactionSourceIcon(item:any){ const icons:Record<string,string>={command:'mdi-console-line',event:'mdi-lightning-bolt',channel_point:'mdi-star-circle',api:'mdi-api',other:'mdi-play-circle-outline'}; return icons[interactionSource(item)] ?? icons.other }
function interactionStateIcon(item:any){ const icons:Record<string,string>={queued:'mdi-clock-outline',active:'mdi-play-circle',finished:'mdi-check-circle',cancelled:'mdi-cancel',failed:'mdi-alert-circle'}; return icons[interactionState(item)] ?? 'mdi-help-circle-outline' }
function interactionStateColor(item:any){ const state=interactionState(item); if(state==='active'||state==='finished') return 'success'; if(state==='failed') return 'error'; if(state==='cancelled') return 'warning'; return 'grey' }
function interactionStateLabel(item:any){ const labels:Record<string,string>={queued:t('instance.interactionQueued'),active:t('instance.interactionActive'),finished:t('instance.interactionFinished'),cancelled:t('instance.interactionCancelled'),failed:t('instance.interactionFailed')}; return labels[interactionState(item)] ?? interactionState(item) }
function interactionSourceLabel(item:any){ const labels:Record<string,string>={command:t('instance.interactionCommand'),event:t('instance.interactionEvent'),channel_point:t('instance.interactionChannelPoint'),api:'API',other:t('instance.interactionOther')}; return labels[interactionSource(item)] ?? labels.other }
function interactionProgress(item:any){ const duration=Number(item?.duration ?? 0), eta=Number(item?.eta_seconds ?? 0); if(interactionState(item)!=='active'||duration<=0)return 0; return Math.max(0,Math.min(100,((duration-eta)/duration)*100)) }
</script>
