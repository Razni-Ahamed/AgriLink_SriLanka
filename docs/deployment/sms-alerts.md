# SMS alerts (Notify.lk)

Users can choose to get key alerts by text message as well as in the app:

| Alert | Goes to | When |
| --- | --- | --- |
| New purchase request | Farmer | A buyer requests part of their listing |
| Order confirmed | Buyer | The farmer accepts their request |
| Officer replied | Farmer | An officer approves advice for their crop issue, or writes their own |
| Issue closed | Farmer | An officer rejects their crop issue without giving advice |

Each user turns alerts on and picks English, Sinhala or Tamil under **My profile → General settings**.
Alerts are off for everyone until they turn them on, because every message costs money.
Texts go to the first mobile number among the farmer's profile phone, the buyer's business phone
and the account phone, so a landline on the profile doesn't block a mobile on the account. Only Sri
Lankan mobiles (07…) can receive them. In Sinhala and Tamil texts, crop names and amounts are
written in that language too, using the website's own translations.

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
- English alerts use the cheaper GSM-7 encoding (160 characters per part). A long issue title is
  shortened with "...", and a title with characters such as `[ ] { } ~ |` or a backtick is sent as
  Unicode so it arrives intact.
- To use another gateway, implement `ISmsSender` and register it in `Program.cs`.

## Limits

Any buyer can send purchase requests, so without limits one account could run up the SMS bill and
flood a farmer's phone. The dispatcher therefore skips a text (the in-app notification still
arrives) when:

| Setting | Default | Rule |
| --- | --- | --- |
| `Sms__MaxPerUserPerDay` | 10 | No user gets more than this many texts in any 24 hours |
| `Sms__RepeatCooldownMinutes` | 30 | The same alert (same user, kind and crop or issue) is texted again only after this long |

So twenty requests for one farmer's tomatoes in a few minutes produce one text, not twenty. The
counts are kept in memory and reset when the API restarts.
