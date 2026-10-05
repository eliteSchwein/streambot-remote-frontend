<template>
  <div class="obs-control">
    <template v-if="mode === 'audio'">
      <div v-if="audioItems.length" class="audio-list">
        <div v-for="input in audioItems" :key="input.uuid" class="obs-audio-row">
          <div class="d-flex align-center ga-2 mb-2">
            <div class="text-truncate font-weight-medium flex-grow-1">{{ input.name }}</div>
            <span class="text-caption text-medium-emphasis">{{ Math.round(inputVolume(input)) }} dB</span>
            <v-btn :icon="inputMuted(input) ? 'mdi-volume-off' : 'mdi-volume-high'" size="small" variant="text" :color="inputMuted(input) ? 'error' : undefined" @click="toggleMute(input)" />
          </div>
          <v-slider :model-value="inputVolume(input)" min="-100" max="0" step="1" hide-details thumb-label @end="(v:any)=>setVolume(input,Number(v))" />
          <div v-if="input.balance !== null" class="d-flex align-center ga-3 mt-2">
            <v-icon size="small">mdi-pan-horizontal</v-icon>
            <v-slider :model-value="inputBalance(input)" min="0" max="1" step="0.01" hide-details @end="(v:any)=>setBalance(input,Number(v))" />
          </div>
        </div>
      </div>
      <div v-else class="text-medium-emphasis">No OBS audio inputs available.</div>
    </template>

    <template v-else>
      <div v-if="canvases.length" class="canvas-list">
        <section v-for="canvas in canvases" :key="canvasKey(canvas)" class="canvas-block">
          <div class="canvas-heading">
            <div class="d-flex align-center ga-2 min-w-0">
              <v-icon size="small">mdi-monitor-dashboard</v-icon>
              <span class="font-weight-medium text-truncate">{{ canvasLabel(canvas) }}</span>
            </div>
            <v-chip size="x-small" variant="tonal">{{ canvasScenes(canvas).length }}</v-chip>
          </div>

          <div class="scene-list">
            <article v-for="scene in canvasScenes(canvas)" :key="sceneKey(scene)" class="scene-card" :class="{ 'scene-card--active': isActiveScene(scene) }">
              <div class="scene-card__header">
                <button class="scene-card__expand" type="button" @click="toggleExpanded(scene)">
                  <v-icon size="small" :color="isActiveScene(scene) ? 'primary' : undefined">{{ isActiveScene(scene) ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank' }}</v-icon>
                  <span class="scene-card__name">{{ sceneLabel(scene) }}</span>
                  <v-chip v-if="isActiveScene(scene)" size="x-small" color="primary" variant="tonal">Live</v-chip>
                </button>
                <div class="scene-card__actions">
                  <span class="text-caption text-medium-emphasis">{{ flattenedSources(scene).length }}</span>
                  <v-btn v-if="!isActiveScene(scene)" class="scene-card__switch" size="small" variant="tonal" color="primary" prepend-icon="mdi-play" @click.stop="switchScene(scene)">{{ t('instance.obsSwitchTo') }}</v-btn>
                  <v-btn :icon="expanded.has(sceneKey(scene)) ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="x-small" variant="text" @click.stop="toggleExpanded(scene)" />
                </div>
              </div>

              <div v-if="expanded.has(sceneKey(scene))" class="source-tree">
                <div v-for="source in flattenedSources(scene)" :key="sourceKey(source)" class="source-row" :style="{ '--depth': String(Math.max(0,Number(source.depth ?? 0))) }">
                  <div class="source-indent"></div>
                  <v-icon size="small" class="source-icon">{{ source.isGroup ? 'mdi-folder-outline' : sourceIcon(source) }}</v-icon>
                  <span class="source-name">{{ sourceLabel(source) }}</span>
                  <span v-if="source.inputKind" class="source-kind">{{ shortKind(source.inputKind) }}</span>
                  <v-switch class="source-toggle" hide-details density="compact" color="primary" :model-value="sourceEnabled(source)" @click.stop @update:model-value="(enabled)=>toggleSource(scene,source,Boolean(enabled))" />
                </div>
                <div v-if="!flattenedSources(scene).length" class="text-caption text-medium-emphasis pa-3">No scene items.</div>
              </div>
            </article>
          </div>
        </section>
      </div>
      <div v-else class="text-medium-emphasis">No scenes are available for this OBS connection.</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
const props=withDefaults(defineProps<{obs:any;connection?:string;mode?:'scenes'|'audio'}>(),{mode:'scenes'})
const emit=defineEmits<{command:[method:string,params:any]}>()
const { t } = useI18n()
const expanded=ref(new Set<string>())
const audioDraft=reactive<Record<string,{muted?:boolean;volume?:number;balance?:number}>>({})
const sourceDraft=reactive<Record<string,boolean>>({})
const connectionNames=computed(()=>{const obs=props.obs??{};const names=new Set<string>();for(const n of obs.connection_names??[])names.add(String(n));for(const n of Object.keys(obs.scenes??{}))names.add(n);for(const n of Object.keys(obs.audio??{}))names.add(n);return[...names].sort()})
const activeConnection=computed(()=>{const requested=String(props.connection??'').trim();if(requested&&connectionNames.value.includes(requested))return requested;const connected=Array.isArray(props.obs?.connected_connections)?props.obs.connected_connections.map(String):[];return connected.find((n:string)=>connectionNames.value.includes(n))??connectionNames.value[0]??requested??'default'})
const canvases=computed(()=>{const raw=props.obs?.scenes?.[activeConnection.value];if(!Array.isArray(raw))return[];if(raw.some((e:any)=>Array.isArray(e?.scenes)))return raw;return[{name:'Main',uuid:'__flat__',scenes:raw,__synthetic:true}]})
const audioItems=computed(()=>{const raw=props.obs?.audio?.[activeConnection.value]??{};return Object.entries(raw).map(([key,v]:any)=>({uuid:String(v?.inputUuid??v?.uuid??key),name:String(v?.inputName??v?.name??key),volume:Number(v?.volume?.inputVolumeDb??v?.inputVolumeDb??v?.volumeDb??-100),muted:Boolean(v?.inputMuted??v?.muted),balance:v?.inputAudioBalance==null&&v?.balance==null?null:Number(v?.inputAudioBalance??v?.balance)}))})
watch(()=>props.obs,()=>{for(const input of audioItems.value){const d=audioDraft[input.uuid];if(!d)continue;if(d.muted!=null&&input.muted===d.muted)delete d.muted;if(d.volume!=null&&Math.abs(input.volume-d.volume)<.05)delete d.volume;if(d.balance!=null&&input.balance!=null&&Math.abs(input.balance-d.balance)<.005)delete d.balance}for(const canvas of canvases.value)for(const scene of canvasScenes(canvas)){if(isActiveScene(scene)&&!expanded.value.has(sceneKey(scene))){const n=new Set(expanded.value);n.add(sceneKey(scene));expanded.value=n}for(const source of flattenedSources(scene)){const k=sourceKey(source);if(Object.prototype.hasOwnProperty.call(sourceDraft,k)&&Boolean(source?.sceneItemEnabled??source?.enabled)===sourceDraft[k])delete sourceDraft[k]}}},{deep:true,immediate:true})
function send(method:string,data:any){emit('command','obs.command',{connection:activeConnection.value,method,data})}
function canvasKey(c:any){return String(c?.uuid??c?.canvasUuid??c?.name??c?.index??'canvas')}
function canvasLabel(c:any){return String(c?.name??c?.canvasName??c?.uuid??'Canvas')}
function canvasScenes(c:any){return Array.isArray(c?.scenes)?c.scenes:[]}
function sceneKey(s:any){return String(s?.uuid??s?.sceneUuid??s?.name??s?.sceneName)}
function sceneLabel(s:any){return String(s?.name??s?.sceneName??s?.uuid??'Scene')}
function sourceKey(s:any){return String(s?.uuid??s?.sourceUuid??`${s?.parentSceneUuid??''}:${s?.sceneItemId??s?.id??s?.name??s?.sourceName}`)}
function sourceLabel(s:any){return String(s?.name??s?.sourceName??s?.inputName??`#${s?.sceneItemId??s?.id??''}`)}
function sourceEnabled(s:any){const k=sourceKey(s);return Object.prototype.hasOwnProperty.call(sourceDraft,k)?sourceDraft[k]:Boolean(s?.sceneItemEnabled??s?.enabled)}
function isActiveScene(s:any){return Boolean(s?.active??s?.current??s?.isActive??s?.isCurrentProgramScene)}
function inputMuted(i:any){return audioDraft[i.uuid]?.muted??i.muted}
function inputVolume(i:any){return audioDraft[i.uuid]?.volume??i.volume}
function inputBalance(i:any){return audioDraft[i.uuid]?.balance??Number(i.balance??.5)}
function flattenedSources(scene:any){const roots=Array.isArray(scene?.items)?scene.items:Array.isArray(scene?.sources)?scene.sources:Array.isArray(scene?.sceneItems)?scene.sceneItems:[];const out:any[]=[];const visit=(item:any,depth:number)=>{out.push({...item,depth:item?.depth??depth});if(Array.isArray(item?.children))for(const child of item.children)visit(child,depth+1)};for(const item of roots)visit(item,0);return out}
function sourceIcon(source:any){const kind=String(source?.inputKind??'').toLowerCase();if(kind.includes('v4l2'))return'mdi-camera-outline';if(kind.includes('browser'))return'mdi-web';if(kind.includes('game_capture'))return'mdi-controller-classic-outline';if(kind.includes('window_capture'))return'mdi-application-outline';if(kind.includes('display_capture')||kind.includes('monitor_capture'))return'mdi-monitor-screenshot';if(kind.includes('video_capture')||kind.includes('camera'))return'mdi-video-outline';if(kind.includes('audio_input'))return'mdi-microphone-outline';if(kind.includes('audio_output'))return'mdi-volume-high';if(kind.includes('image'))return'mdi-image-outline';if(kind.includes('media'))return'mdi-play-box-outline';if(kind.includes('text'))return'mdi-format-text';if(kind.includes('color'))return'mdi-palette-outline';return'mdi-checkbox-blank-outline'}
function shortKind(kind:any){return String(kind??'').replace(/_source.*$/,'').replace(/_/g,' ')}
function switchScene(s:any){const sceneName=sceneLabel(s).trim();if(sceneName)send('SetCurrentProgramScene',{sceneName})}
function toggleExpanded(s:any){const k=sceneKey(s);const n=new Set(expanded.value);n.has(k)?n.delete(k):n.add(k);expanded.value=n}
function toggleMute(input:any){const muted=!inputMuted(input);(audioDraft[input.uuid]??={}).muted=muted;send('SetInputMute',{inputUuid:input.uuid,inputMuted:muted})}
function setVolume(input:any,value:number){(audioDraft[input.uuid]??={}).volume=value;send('SetInputVolume',{inputUuid:input.uuid,inputVolumeDb:value})}
function setBalance(input:any,value:number){(audioDraft[input.uuid]??={}).balance=value;send('SetInputAudioBalance',{inputUuid:input.uuid,inputAudioBalance:value})}
function toggleSource(scene:any,source:any,enabled:boolean){sourceDraft[sourceKey(source)]=enabled;const data:any={sceneItemId:Number(source?.sceneItemId??source?.id),sceneItemEnabled:enabled};const sceneUuid=source?.parentSceneUuid??scene?.uuid??scene?.sceneUuid;const sceneName=source?.parentSceneName??scene?.name??scene?.sceneName;if(sceneUuid)data.sceneUuid=sceneUuid;else if(sceneName)data.sceneName=sceneName;send('SetSceneItemEnabled',data)}
</script>

<style scoped>
.obs-control{min-width:0;container-type:inline-size}.audio-list{display:flex;flex-direction:column}.obs-audio-row{padding:12px 2px}.obs-audio-row+.obs-audio-row{border-top:1px solid rgba(var(--v-border-color),var(--v-border-opacity))}
.canvas-block+.canvas-block{margin-top:16px}.canvas-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 2px 8px}.scene-list{display:grid;gap:9px}.scene-card{border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;background:rgba(0,0,0,.08)}.scene-card--active{border-color:rgba(var(--v-theme-primary),.5);box-shadow:inset 3px 0 0 rgb(var(--v-theme-primary))}.scene-card__header{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;min-width:0;padding:8px 8px 8px 10px}.scene-card__expand{appearance:none;border:0;background:transparent;color:inherit;display:flex;align-items:center;gap:8px;min-width:0;width:100%;text-align:left;cursor:pointer;padding:2px}.scene-card__name{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scene-card__actions{display:flex;align-items:center;justify-content:flex-end;gap:4px;min-width:0}.scene-card__switch{flex:none;white-space:nowrap;min-width:0}.source-tree{border-top:1px solid rgba(255,255,255,.06);padding:5px 0}.source-row{display:grid;grid-template-columns:calc(var(--depth) * 18px) 24px minmax(0,1fr) auto 48px;align-items:center;gap:8px;min-height:38px;padding:2px 8px}.source-row:hover{background:rgba(255,255,255,.035)}.source-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.source-kind{font-size:.72rem;opacity:.55;text-transform:capitalize}.source-toggle{justify-self:end}.source-icon{opacity:.8}
@container(max-width:520px){.scene-card__header{grid-template-columns:1fr;align-items:start}.scene-card__actions{width:100%;justify-content:flex-end;padding-left:30px}.source-kind{display:none}.source-row{grid-template-columns:calc(var(--depth) * 12px) 22px minmax(0,1fr) 46px}}
@container(max-width:360px){.scene-card__actions{padding-left:0}.scene-card__switch{flex:1}.scene-card__switch :deep(.v-btn__content){justify-content:center}}
</style>
