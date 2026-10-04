# Paddy treatment drafts — for agricultural officer review

**Status: DRAFT, awaiting approval. Nothing here is shown to farmers.**

These drafts are loaded in the app, but only as a **suggestion shown to the reviewing officer**, who
can use the text as it is, edit it, or ignore it. Every class is marked serious, so a farmer only ever
receives what an officer decided. Approving the wording below and clearing the serious flag is what
would let advice reach farmers directly.

When a farmer reports a paddy problem with a photo, the AI model identifies one of ten classes: nine
problems and "healthy". Please review each draft and, for each one:

1. **Approve, edit or reject the farmer treatment text.** It is shown exactly as written.
2. **Decide the serious flag.** *Serious* means an officer must always review first, however
   confident the model is. Keep it set for anything involving pesticides or fungicides.
3. **Sign off** at the end. The approved text is then copied into
   `backend/AgriLink.API/Services/Agents/DiseaseKnowledgeBase.cs`.

All drafts deliberately avoid chemical recommendations. Blast follows the Department of Agriculture
Sri Lanka's blast guidance. For the other classes the Department pages we found did not cover them, so
the drafts follow IRRI and other extension fact sheets (sources at the end) and **need an officer's
check against current Sri Lankan practice**.

## What the model was trained on, and what that means

The model was trained on the public *Paddy Doctor* dataset: 10,357 labelled photos taken in paddy
fields in Tamil Nadu, India, in 2021. It was **not** trained or tested on Sri Lankan photos. Most photos
are of the whole plant or canopy rather than a single leaf, so farmers will get better results from a
photo of the affected plants than of one leaf alone.

Photos from the same field on the same day look alike, so the test photos were held out **by field
plot**: no plot appears in both training and testing. The scores below are therefore for fields the
model has never seen, which is a harder and more honest test than a random split. Even so, Indian and
Sri Lankan fields differ in varieties, lighting and cameras, so **real accuracy in Sri Lanka will
probably be lower**.

On 1,035 test photos from plots the model never saw during training, it identified the right class
**50.2%** of the time. Chance would be about 17%. Per class:

| Class | Correctly identified | Test photos | Can the model answer without an officer? |
|---|---:|---:|---|
| Dead heart (stem borer damage) | 97.2% | 144 | No — always an officer |
| Hispa | 64.2% | 159 | No — always an officer |
| Tungro | 60.6% | 109 | No — always an officer |
| Downy mildew | 57.4% | 61 | No — always an officer |
| Healthy | 51.7% | 176 | No — always an officer |
| Blast | 30.8% | 172 | No — always an officer |
| Brown spot | 24.7% | 97 | No — always an officer |
| Bacterial panicle blight | 21.2% | 33 | No — always an officer |
| Bacterial leaf streak | 5.6% | 36 | No — always an officer |
| Bacterial leaf blight | 0.0% | 48 | No — always an officer |

**No class is reliable enough to release without an officer.** Only dead heart is identified well.
Bacterial leaf blight, bacterial leaf streak, blast and brown spot are mostly confused with one
another and with tungro, so **when the model suggests one of these, treat it as a weak hint**.

For comparison, the same model trained and tested on a *random* split of the same photos scores 96%,
which matches the published figure. That number is inflated: photos from one plot sit on both sides of
the split, so the model is partly recognising fields, not diseases. It is not a fair guide to how the
model will do on a farmer's photo, and the 50% above is.

## Which of these occur in Sri Lanka

The sources found do not agree on all ten classes, so an officer's knowledge is needed here:

| Class | What we found |
|---|---|
| Blast | Yes. The Department of Agriculture and a Sri Lankan review describe it as the most serious rice disease. |
| Bacterial leaf blight | Yes. An older Sri Lankan review calls it the only bacterial disease recorded, with occasional severe epidemics. |
| Brown spot | Yes. Listed among Sri Lanka's fungal rice diseases. (The Department's page found covers *narrow* brown leaf spot, a different disease.) |
| Tungro | Reported in the 1980s along with other rice viruses; its present importance is unclear. |
| Bacterial leaf streak, bacterial panicle blight | **Not found on any Sri Lankan list.** A prediction of these may well be a misidentification (for example of bacterial leaf blight), so please inspect. |
| Downy mildew, hispa, dead heart (stem borer damage) | Not covered by the Sri Lankan sources found. Please say whether they occur. |

---

## 1. Blast (`paddy_blast`)

**Draft treatment for the farmer:**

> Blast spreads fastest in humid weather and in crops given too much nitrogen. Apply nitrogen only at
> the recommended rate, or by the leaf colour chart, and keep weeds under control. Do not mix infected
> straw back into the soil. Next season use certified disease-free seed and a blast-resistant variety
> such as Bg 403, Bg 406 or Bg 366, and mix burnt paddy husk into the soil at land preparation (250 kg
> per acre), as the Department of Agriculture recommends. If it is spreading quickly, contact your
> agricultural officer, who can advise on treatment.

**Officer notes:**
- The Department of Agriculture also lists four fungicides for rapid spread (tebuconazole,
  isoprothiolane, carbendazim, tricyclazole). They are left out of the draft so that the advice stays
  non-chemical.
- **Recommended: keep serious.** Any advice that involves fungicides needs an officer.

## 2. Bacterial leaf blight (`paddy_bacterial_leaf_blight`)

**Draft treatment for the farmer:**

> There is no spray that reliably controls this disease, so the aim is to stop it spreading. Do not let
> water run from an affected plot into others, and avoid working in other plots with wet, muddy tools
> and boots. Keep bunds and channels free of weeds and volunteer rice. Split nitrogen fertiliser into
> smaller doses, because extra nitrogen makes the disease worse. After harvest, plough in or destroy
> the stubble, and do not keep seed from this plot. Ask the agricultural officer which resistant
> varieties suit your area for the next season.

**Officer notes:**
- Copper compounds and antibiotics are costly and have not been shown to work, so none are suggested.
- **Recommended: keep serious.**

## 3. Bacterial leaf streak (`paddy_bacterial_leaf_streak`)

**Draft treatment for the farmer:**

> This can be mistaken for bacterial leaf blight, so the officer should confirm it. The bacteria spread
> in wind, rain, irrigation water and infected seed. Avoid moving water or tools from this plot to
> others, split nitrogen fertiliser into smaller doses, and keep bunds free of weeds. After harvest,
> plough in or destroy the stubble, and use clean seed from healthy plants next season.

**Officer notes:**
- Not found on any Sri Lankan disease list; a prediction of this class is most likely a
  misidentification. **Recommended: keep serious.**

## 4. Bacterial panicle blight (`paddy_bacterial_panicle_blight`)

**Draft treatment for the farmer:**

> The officer should confirm this by inspection. The disease attacks the flowering panicles, so grains
> stay empty or turn discoloured, and it is carried on seed. Do not keep seed from affected panicles
> or plots, and use clean, healthy seed next season. Avoid heavy nitrogen and very close planting,
> which make it worse. After harvest, plough in or destroy the stubble.

**Officer notes:**
- Not found on any Sri Lankan disease list. **Recommended: keep serious.**

## 5. Brown spot (`paddy_brown_spot`)

**Draft treatment for the farmer:**

> Brown spot is common in plants that are short of nutrients or water. Use a balanced fertiliser at the
> recommended rates, do not let the field dry out while the plants are growing, and keep weeds under
> control. Do not mix infected straw back into the soil, and use clean seed from healthy plants next
> season. If many plants are affected, contact your agricultural officer.

**Officer notes:**
- International sources link brown spot to nutrient-poor soil, with low potassium often named. Add a
  specific fertiliser recommendation if you consider it suitable for release without an officer.
- **Recommended: keep serious.**

## 6. Dead heart — stem borer damage (`paddy_dead_heart`)

**Draft treatment for the farmer:**

> Dead heart is damage from stem borer caterpillars feeding inside the stem, not a disease. Pull out the
> dead shoots, which come away easily, and destroy them with the caterpillar still inside. Do not give
> extra nitrogen. After harvest, plough in or destroy the stubble so the caterpillars do not carry over
> to the next crop, and plant at the same time as your neighbours. Avoid broad insecticide sprays
> unless an officer advises them, because they also kill the insects that eat the borers. If many
> shoots are affected, contact your agricultural officer.

**Officer notes:**
- This class is an insect symptom. It looks like a disease to the model but the advice is about pests.
- **Recommended: keep serious.**

## 7. Downy mildew (`paddy_downy_mildew`)

**Draft treatment for the farmer:**

> Downy mildew is favoured by waterlogged soil and cool, wet weather. Improve drainage so water does
> not stand around young plants, and keep weeds and volunteer rice out of the field and bunds. After
> harvest, plough in or destroy the stubble. The officer should confirm the diagnosis, because several
> problems cause stunting and twisted leaves.

**Officer notes:**
- We found less guidance for this one than for the others; please check it carefully.
- **Recommended: keep serious.**

## 8. Hispa (`paddy_hispa`)

**Draft treatment for the farmer:**

> Hispa beetles scrape the leaf surface and leave white streaks along the leaf. Cut the leaf tips off
> seedlings before transplanting, which removes the eggs. Keep weeds and volunteer rice out of the
> field and bunds, avoid heavy nitrogen and very close planting, and plant early or at the same time
> as your neighbours. If there are few beetles, pick them off and destroy them. If leaves are being
> badly scorched, contact your agricultural officer.

**Officer notes:**
- **Recommended: keep serious.**

## 9. Tungro (`paddy_tungro`)

**Draft treatment for the farmer:**

> Tungro is a virus spread by green leafhoppers, and there is no cure once a plant is infected. Pull out
> infected plants early, yellow-orange and stunted ones, and bury or burn them away from the field.
> Tell neighbouring farmers so that plots are planted at the same time rather than staggered. After
> harvest, plough in the stubble and weeds and leave the field fallow for a month before the next
> crop. Use tungro-tolerant varieties next season; the agricultural officer can say which suit your
> area. Spraying for the leafhoppers often does not stop the spread.

**Officer notes:**
- **Recommended: keep serious.**

## 10. Healthy (`healthy`)

**Draft message for the farmer:**

> No disease was visible in the photo. Ask the farmer to send a clearer close-up of the affected leaves
> if the problem continues or spreads.

**Officer notes:**
- The model never releases "healthy" without an officer. Telling a farmer their crop is fine is the
  costliest mistake to get wrong.

---

## Sign-off

| Class | Treatment approved (as written / edited / rejected) | Serious? | Officer name | Date |
|---|---|---|---|---|
| Blast | | | | |
| Bacterial leaf blight | | | | |
| Bacterial leaf streak | | | | |
| Bacterial panicle blight | | | | |
| Brown spot | | | | |
| Dead heart (stem borer damage) | | | | |
| Downy mildew | | | | |
| Hispa | | | | |
| Tungro | | | | |
| Healthy | | | | |

## Sources

- Department of Agriculture Sri Lanka — rice blast management (resistant varieties, nitrogen, burnt
  paddy husk, fungicides): https://doa.gov.lk/?p=25287
- Department of Agriculture Sri Lanka — narrow brown leaf spot (a different disease from brown spot;
  used only for the shared advice on clean seed and straw): https://doa.gov.lk/?p=25430
- *Rice diseases — problems and progress*, Tropical Agricultural Research (diseases recorded in Sri
  Lanka): https://tare.sljol.info/articles/5416
- Pacific Pests, Pathogens & Weeds — rice bacterial leaf blight fact sheet:
  https://apps.lucidcentral.org/ppp/text/web_full/entities/rice_bacterial_leaf_blight_418.htm
- IRRI Rice Diseases resource (bacterial blight, leaf streak, blast, brown spot, downy mildew,
  tungro): https://rice-diseases.irri.org/contents
- Rice hispa ecology and management (UK DFID R7891 final technical report):
  https://assets.publishing.service.gov.uk/media/57a08c8540f0b64974001288/R7891_FTR.pdf
- Tungro management (synchronous planting, roguing, resistant varieties, fallow period), TNAU Agritech
  Portal: https://agritech.tnau.ac.in/crop_protection/rice_diseases/another%20methods_rice_4.html
- Petchiammal A, Briskline Kiruba S, Murugan D, Arjunan P — *Paddy Doctor: A Visual Image Dataset for
  Automated Paddy Disease Classification and Benchmarking* (the training data):
  https://ar5iv.labs.arxiv.org/html/2205.11108
