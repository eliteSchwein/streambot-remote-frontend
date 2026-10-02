<template>
  <PageShell title="Moderators" subtitle="People allowed to open the remote moderator panel for this channel.">
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center">
        Moderator access
        <v-spacer />
        <v-btn v-if="store.isOwner" color="primary" prepend-icon="mdi-account-plus-outline" @click="dialog = true">Add moderator</v-btn>
      </v-card-title>
      <v-card-text>
        <div v-if="loading" class="py-10 text-center"><v-progress-circular indeterminate /></div>
        <div v-else-if="store.moderators.length === 0" class="empty-state py-10">No moderators have been added yet.</div>
        <v-list v-else bg-color="transparent">
          <v-list-item v-for="mod in store.moderators" :key="modKey(mod)" :title="modName(mod)" :subtitle="modSubtitle(mod)">
            <template #prepend><v-avatar color="primary" variant="tonal"><v-icon>mdi-account-outline</v-icon></v-avatar></template>
            <template #append>
              <v-btn v-if="store.isOwner" icon="mdi-delete-outline" variant="text" color="error" title="Remove moderator" @click="remove(mod)" />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialog" max-width="480">
      <v-card rounded="lg">
        <v-card-title>Add moderator</v-card-title>
        <v-card-text>
          <v-text-field v-model="login" autofocus label="Twitch username" prepend-inner-icon="mdi-twitch" variant="outlined" @keyup.enter="add" />
          <div class="text-caption text-medium-emphasis">The moderator will authenticate through Twitch using the moderator login flow.</div>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn variant="text" @click="dialog = false">Cancel</v-btn><v-btn color="primary" :loading="saving" :disabled="!login.trim()" @click="add">Add</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PageShell from '@/components/PageShell.vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const loading = ref(false)
const saving = ref(false)
const dialog = ref(false)
const login = ref('')
const selectedId = computed(() => store.selectedStreamerId)

async function load() { loading.value = true; try { await store.fetchModerators() } catch (e: any) { store.error = e?.message ?? 'Could not load moderators.' } finally { loading.value = false } }
async function add() { if (!login.value.trim()) return; saving.value = true; try { await store.addModerator(login.value); login.value = ''; dialog.value = false } catch (e: any) { store.error = e?.message ?? 'Could not add moderator.' } finally { saving.value = false } }
async function remove(mod: any) { try { await store.removeModerator(mod) } catch (e: any) { store.error = e?.message ?? 'Could not remove moderator.' } }
function modKey(mod: any) { return String(mod?.id ?? mod?.user_id ?? mod?.twitch_user_id ?? mod?.login ?? mod?.username) }
function modName(mod: any) { return mod?.display_name ?? mod?.login ?? mod?.username ?? 'Moderator' }
function modSubtitle(mod: any) { const login = mod?.login ?? mod?.username; return login ? `@${login}` : (mod?.twitch_user_id ? `Twitch ID ${mod.twitch_user_id}` : 'Twitch moderator') }

onMounted(load)
watch(selectedId, load)
</script>
