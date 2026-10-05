<template>
  <div>
    <v-row>
      <v-col cols="12" md="4">
        <v-card variant="tonal" rounded="lg"><v-card-text><div class="text-overline">{{ t('instance.status') }}</div><div class="text-h5">{{ giveaway.active ? t('instance.active') : t('instance.inactive') }}</div></v-card-text></v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card variant="tonal" rounded="lg"><v-card-text><div class="text-overline">{{ t('instance.entries') }}</div><div class="text-h5">{{ giveaway.users?.length ?? 0 }}</div></v-card-text></v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card variant="tonal" rounded="lg"><v-card-text><div class="text-overline">{{ t('instance.command') }}</div><div class="text-h5">!{{ giveaway.settings?.giveawayCommand ?? 'ticket' }}</div></v-card-text></v-card>
      </v-col>
    </v-row>
    <div class="mt-4 text-body-1">{{ giveaway.giveawayText || t('instance.noGiveaway') }}</div>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from '@/i18n'
defineProps<{ giveaway:any }>()
const { t } = useI18n()
</script>
