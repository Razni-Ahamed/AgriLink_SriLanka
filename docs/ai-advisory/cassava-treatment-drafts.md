# Cassava treatment drafts — for agricultural officer review

**Status: DRAFT. Not approved. Nothing here is shown to farmers.**

When a farmer reports a cassava problem with a photo, the AI model identifies one of five classes.
For each class, the app can show a treatment to the farmer — either straight away (only if the
disease is not marked *serious* and the model is confident enough), or as the starting point for an
officer's own advice. Today every class is marked serious with no treatment, so every case waits for
an officer.

Please review each draft below and, for each disease:

1. **Approve, edit or reject the farmer treatment text.** It is shown exactly as written.
2. **Decide the serious flag.** *Serious* means an officer must always review first, however
   confident the model is. Keep it set for anything involving pesticides or fungicides.
3. **Sign off** at the end. The approved text is then copied into
   `backend/AgriLink.API/Services/Agents/DiseaseKnowledgeBase.cs`.

All drafts deliberately avoid chemical recommendations. They are based on the Department of
Agriculture Sri Lanka's cassava guidance where it covers the disease, and on international extension
fact sheets otherwise (sources at the end).

## How reliable the model is (test photos)

The model was trained on a public dataset of cassava photos from Uganda, not Sri Lanka. On 2,140 test
photos from that dataset:

| Class | Correctly identified | Can the model answer without an officer? |
|---|---:|---|
| Cassava mosaic disease | 95.3% | Yes, when confident |
| Cassava brown streak disease | 69.4% | Only when very confident |
| Cassava green mottle | 75.3% | No — always an officer |
| Cassava bacterial blight | 62.0% | No — always an officer |
| Healthy | 80.6% | No — always an officer |

It has not yet been tested on Sri Lankan field photos, which should happen before any advice is
released without an officer.

---

## 1. Cassava mosaic disease (`cassava_mosaic_disease`)

**In Sri Lanka:** yes. Sri Lankan cassava mosaic virus (SLCMV) is present, spread by infected
cuttings and by whiteflies. The Department of Agriculture notes there is no treatment once a plant is
infected.

**Draft treatment for the farmer:**

> This looks like cassava mosaic disease, a virus with no cure once a plant is infected. Pull out
> plants showing the yellow-green patches and twisted, shrunken leaves as soon as you see them, roots
> and all, and destroy them away from the field. Do not use stems from affected plants as cuttings —
> take cuttings only from plants that stayed healthy. Keep the field free of weeds, and remove wild
> cassava and similar wild plants nearby. Do not start a new cassava plot next to an affected field.
> If many plants are affected, contact your agricultural officer.

**Officer notes:**
- The Department of Agriculture also recommends **neem extract sprays** against the whiteflies that
  spread the virus, live fencing, and intercropping with maize. Neem spraying is left out of the
  draft so that the advice stays non-chemical; add it if you consider it suitable for release
  without an officer.
- **Serious flag — your decision.** The draft advice is non-chemical and low-risk, and this is the
  class the model identifies most reliably, so it is the only realistic candidate for automatic
  advice. Keep it serious if you want every mosaic case confirmed first, for example until the model
  has been checked on Sri Lankan photos.

## 2. Cassava bacterial blight (`cassava_bacterial_blight`)

**In Sri Lanka:** not covered on the Department of Agriculture cassava page; its presence should be
confirmed by an officer. Favoured by long periods of high humidity and rain.

**Draft treatment for the farmer:**

> This may be cassava bacterial blight. Sprays do not control this disease. Remove and destroy
> affected plants, doing this in dry weather so the bacteria spread less. Clean knives and tools with
> bleach after cutting affected plants. Do not take cuttings from this field. After harvest, destroy
> all leftover stems and leaves, and do not plant cassava on the same land for one to two years.
> Contact your agricultural officer to confirm the diagnosis.

**Officer notes:**
- The model never releases this class without an officer (its accuracy is too low), so this text
  is a starting point for your own treatment box rather than automatic advice.
- **Recommended: keep serious.**

## 3. Cassava brown streak disease (`cassava_brown_streak_disease`)

**In Sri Lanka:** this disease is known from East and Central Africa. We found no report of it in
Sri Lanka. **A prediction of this class on a Sri Lankan farm is most likely a misidentification** —
please inspect before advising. If the symptoms genuinely match (brown streaks on stems, brown
patches in roots at harvest), it would be significant and should be reported to the Department of
Agriculture.

**Draft treatment for the farmer:**

> Do not use any stems from this field as cuttings until an agricultural officer has inspected it.
> Pull out and destroy plants showing symptoms, and clean your tools after cutting them. Contact your
> agricultural officer.

**Officer notes:**
- **Recommended: keep serious.**

## 4. Cassava green mottle (`cassava_green_mottle`)

**In Sri Lanka:** cassava green mottle virus is only known from the Solomon Islands. **A prediction
of this class in Sri Lanka is most likely a misidentification** (for example of mosaic disease or
nutrient problems) — please inspect before advising.

**Draft treatment for the farmer:**

> An agricultural officer needs to look at this. Until then, remove and destroy plants with mottled,
> puckered leaves, and take cuttings only from plants without symptoms. Contact your agricultural
> officer.

**Officer notes:**
- The model never releases this class without an officer.
- **Recommended: keep serious.**

## 5. Healthy (`healthy`)

**Draft message for the farmer:**

> No disease was visible in the photo. If the problem continues or spreads, or you see yellowing,
> spots or twisted leaves, report it again with a clearer close-up photo, or contact your
> agricultural officer.

**Officer notes:**
- The model never releases "healthy" without an officer: on test photos, too many diseased plants
  were called healthy.

---

## Sign-off

| Disease | Treatment approved (as written / edited / rejected) | Serious? | Officer name | Date |
|---|---|---|---|---|
| Cassava mosaic disease | | | | |
| Cassava bacterial blight | | | | |
| Cassava brown streak disease | | | | |
| Cassava green mottle | | | | |
| Healthy | | | | |

## Sources

- Department of Agriculture Sri Lanka, HORDI — Cassava crop guidance (SLCMV control, whitefly
  control, recommended varieties): https://doa.gov.lk/hordi-crop-cassava/
- Pacific Pests, Pathogens & Weeds (supported by ACIAR) — Cassava bacterial blight fact sheet:
  https://apps.lucidcentral.org/ppp_v9/text/web_full/entities/cassava_bacterial_blight_173.htm
- Pacific Pests, Pathogens & Weeds — Cassava brown streak disease fact sheet:
  https://apps.lucidcentral.org/ppp_v9/text/web_full/entities/cassava_brown_streak_disease_439.htm
- Pacific Pests, Pathogens & Weeds — Cassava green mottle fact sheet:
  https://apps.lucidcentral.org/ppp/text/web_full/entities/cassava_green_mottle_068.htm
- *Cassava mosaic disease and its management in Southeast Asia* (review article, PMC9162994):
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9162994/
