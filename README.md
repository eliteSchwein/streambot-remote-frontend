# StreamDing Remote Admin Frontend

Vue/Vite frontend for the StreamDing cloud remote panel.

## Current backend contract

The panel is notify-first over one authenticated `WS /ws/user` connection.
After the socket authenticates, the cloud automatically pushes the current user,
user settings, accessible instances, instance presence, cached dashboard snapshots,
section updates, YoloBox preview state and pending pairing notifications.

The frontend does not send manual `request_*` messages for panel state.

Client-to-cloud mutations are sent over the same socket:

- `dashboard_action` for remote StreamDing controls
- `update_user_settings` for account settings

Runtime state is received through `notify_*` messages such as:

- `notify_user_update`
- `notify_user_settings_update`
- `notify_instances_update`
- `notify_instance_presence`
- `notify_dashboard_snapshot`
- `notify_dashboard_update`
- `notify_yolobox_preview`

The receiver accepts both `type` + `data` and `method` + `params` notification envelopes.

Dashboard sections: `music`, `giveaway`, `interactions`, `auto_macros`, `macros`, `channel_points`, `rotating_scene`, `audio`, `obs`, `yolobox`.

Remote actions use the same method names and params as the local StreamDing WebSocket API, e.g. `music_prev`, `obs_trigger_command`, `execute_yolobox`, `toggle_auto_macro`, `set_volume`, etc.

HTTP remains only for browser OAuth/login/logout navigation.

## Local development

When the frontend hostname is `localhost`, `127.0.0.1`, or `::1`, auth navigation goes to `http://localhost:8080` and the user WebSocket to `ws://localhost:8080`.

```bash
npm install
npm run dev
```

## Language

English and German are supported. The language delivered by `notify_user_settings_update` has priority; otherwise the browser language is used and unsupported languages fall back to English.

## Cloud dashboard actions

The remote dashboard uses the cloud action names exposed by the StreamDing cloud backend (for example `music.play`, `music.volume`, `obs.scene`, `obs.command`, `audio.volume`, `audio.mute`, `yolobox.execute`, `macro.run`, and `rotating_scene.start/stop`). The cloud backend translates those actions to the corresponding local WebSocket API methods.

## Per-instance dashboard layouts

The remote dashboard now persists customization through `update_user_settings` instead of browser storage.

Expected settings shape:

```json
{
  "language": "en",
  "dashboard_layouts": {
    "<instance_id>": {
      "version": 1,
      "sections": [
        { "key": "music", "visible": true, "order": 0 }
      ]
    }
  }
}
```

`notify_user_settings_update` should return the complete settings object. Layout entries are keyed by StreamDing instance ID, so each instance has an independent dashboard arrangement.
