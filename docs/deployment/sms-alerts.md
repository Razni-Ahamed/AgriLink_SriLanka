# SMS alerts (Notify.lk)

Users can choose to get key alerts by text message as well as in the app:

| Alert | Goes to | When |
| --- | --- | --- |
| New purchase request | Farmer | A buyer requests part of their listing |
| Order confirmed | Buyer | The farmer accepts their request |
| Officer replied | Farmer | An officer approves, rejects or adds advice to their crop issue |

Each user turns alerts on and picks English, Sinhala or Tamil under **My profile → General settings**.
Alerts are off for everyone until they turn them on, because every message costs money.
Texts go to the farmer's profile phone, the buyer's business phone, or the account phone for
officers. Only Sri Lankan mobiles (07…) can receive them; landlines are skipped.

## Turning it on

SMS is off until all of these are set. With them unset the app works exactly as before and the
setting is hidden.

```
Sms__Provider=NotifyLk
Sms__NotifyLk__UserId=<Notify.lk user id>
Sms__NotifyLk__ApiKey=<Notify.lk API key>
Sms__NotifyLk__SenderId=<approved sender id, or NotifyDEMO while testing>
```

On Azure App Service, add them under **Configuration → Application settings**. Keep the API key
out of `appsettings.json`.

## How sending works

- Requests never wait for the gateway. The alert is put on an in-memory queue after the change is
  saved, and a background service sends it.
- A failed or refused send is logged and skipped; the in-app notification is always there.
- Alerts still queued when the API restarts are lost, the same as an undelivered text.
- Sinhala and Tamil are sent as Unicode, which Notify.lk bills at 70 characters per message part,
  so those alerts cost about two parts each.
- To use another gateway, implement `ISmsSender` and register it in `Program.cs`.
