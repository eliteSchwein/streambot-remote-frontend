<template><RemoteAudioControl :audio="audio" @command="(method,params)=>emit('command',method,params)" @method="(method,params)=>emit('method',method,params)" /></template>
<script setup lang="ts">
import RemoteAudioControl from '@/components/dashboard/RemoteAudioControl.vue'
defineProps<{ audio:any }>()
const emit = defineEmits<{ command:[method:string,params:any]; method:[method:string,params:any] }>()
</script>
