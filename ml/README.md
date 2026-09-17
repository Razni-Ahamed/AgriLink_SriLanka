# AgriLink ML — crop disease photo classification

Training code for the models that identify crop diseases from a farmer's photo. Python is used
**only for training**: each model is exported to ONNX and run inside the .NET backend
(`backend/AgriLink.API`), so there is no separate Python service to host.

## Layout

```
ml/
  agrilink_ml/  data preparation, training, evaluation and ONNX export
  data/         raw datasets (gitignored — see "Datasets" below)
  labels/       one label file per crop — the class ids and keys shared by Python and C#
  manifests/    per-crop image lists with their class and split (committed)
  training/     reserved for notebooks and experiments
  models/       exported .onnx models + metadata (gitignored)
  tests/        pytest tests for agrilink_ml
```

## Version 1 crops

One model per crop: Paddy, Tomato, Potato, Cassava. A photo of any other crop skips the model and
goes through the normal text-based agents.

## Datasets

Download each one outside the repo (for example `Documents/agrilink-datasets/`) and pass its path
to the scripts with the adapter name below. Check each licence before use and cite the dataset in any
report.

| Adapter (`--source` name) | Dataset | Crops | Source | Licence |
|---|---|---|---|---|
| `kaggle-cassava-2020` | Cassava Leaf Disease Classification | Cassava | https://www.kaggle.com/competitions/cassava-leaf-disease-classification | Competition rules |
| `plantvillage-2016` | PlantVillage (lab photos) | Tomato, Potato | https://github.com/spMohanty/PlantVillage-Dataset (pass the repo folder; images under `raw/color/`) | CC BY-SA 3.0 |
| `plantdoc-2020` | PlantDoc (field photos) | Tomato, Potato | https://github.com/pratikkayal/PlantDoc-Dataset | CC BY 4.0 |
| `rice-mendeley-2020` | Rice Leaf Disease Image Samples | Paddy | https://data.mendeley.com/datasets/fwcj7stb8r/1 (extract the `.7z`) | CC BY 4.0 |
| — | Paddy Doctor | Paddy | https://www.kaggle.com/competitions/paddy-disease-classification | Competition rules |

For Cassava, only `train_images/` and `train.csv` are needed — `train_tfrecords/` holds the same
images in another format.

PlantVillage and PlantDoc hold both tomato and potato; each crop's preparation skips the other crop's
folders and lists them in the summary. On Windows, PlantDoc cannot be checked out with git: some file
names contain characters such as `?`. Download its files individually and replace those characters.

The rice set has no healthy class, so a Paddy model also needs Paddy Doctor (not yet supported).

A dataset can stay zipped — the preparation script reads a `.zip` or an extracted folder.

## Environment

Use a virtual environment inside this folder (not the repo-root `.venv`):

```bash
py -3.12 -m venv ml/.venv
ml/.venv/Scripts/pip install -r ml/requirements.txt
```

`requirements.txt` covers data preparation and tests. To train, also install PyTorch with CUDA and
the training requirements. PyPI's Windows PyTorch build is CPU-only, so install it from PyTorch's
own index first (CUDA 13.0 shown; RTX 50-series GPUs need CUDA 12.8 or newer):

```bash
ml/.venv/Scripts/pip install torch torchvision --index-url https://download.pytorch.org/whl/cu130
ml/.venv/Scripts/pip install -r ml/requirements-train.txt onnxscript
```

Run the tests from the `ml/` folder:

```bash
.venv/Scripts/python -m pytest tests
```

## Label files

`labels/<crop>.json` is the contract between training and the backend:

- a class's `id` is its index in the model's output,
- its `key` is what the backend's disease knowledge base looks treatments up by,
- `sources` maps each dataset's own labels onto those keys.

Changing an existing class's `id` or `key` means bumping `version` and retraining.

## Preparing a crop's manifest

From the `ml/` folder, pass the crop and each of its datasets as `adapter-name=path`:

```bash
.venv/Scripts/python -m agrilink_ml.prepare --crop cassava --source kaggle-cassava-2020=C:/Users/you/Downloads/cassava-leaf-disease-classification.zip
```

This writes `manifests/<crop>.csv` and `manifests/<crop>_summary.md`. The script:

1. lists each dataset's images through its adapter in `agrilink_ml/sources.py` and maps labels
   through the label file,
2. skips unreadable images and reports them,
3. groups exact and near-duplicate photos (dHash), so copies of one photo never end up in
   different splits,
4. assigns an 80/10/10 train/val/test split that keeps class proportions (fixed seed, so it is
   reproducible).

Commit both files: every training run, local or on Kaggle/Colab, reads the split from the manifest.
Manifest paths are relative to the dataset root, so they work wherever the dataset is mounted.

## Training a crop's model

From the `ml/` folder, with the same `--source` arguments as preparation:

```bash
.venv/Scripts/python -m agrilink_ml.train --crop cassava --source kaggle-cassava-2020=C:/Users/you/Downloads/cassava-leaf-disease-classification.zip
```

It fine-tunes a pretrained EfficientNet-B0 (384px) on the manifest's train split, keeps the epoch
with the best validation macro F1, then:

1. **calibrates** confidence with temperature scaling on the validation split,
2. **chooses an auto-release threshold per class** on the validation split: the lowest confidence
   at which we can be ~95% statistically confident that at least 95% of released predictions are
   correct (Wilson lower bound). A class that cannot show that gets no threshold, and every case of
   it goes to an officer,
3. **evaluates** on the untouched test split,
4. **exports** `model.onnx` with the calibration built in, and fails if ONNX Runtime's output
   differs from PyTorch's.

Output goes to `models/<crop>/` (gitignored): `model.onnx`, `model.json` (preprocessing, classes
with their `autoReleaseThreshold`, metrics), `report.md`, `history.csv` and `best.pt`.
`--skip-training` re-runs steps 1–4 from an existing `best.pt`.

Why per-class and statistically bounded thresholds: on Cassava, one global threshold reached 95%
overall while confident "healthy" predictions were right only ~81% of the time (diseased plants
reported as healthy), and a threshold resting on 30 validation photos held up at only 82% on the
test photos.

### Lab photos flatter a model

Tomato and Potato mix PlantVillage (leaves on a plain grey background, indoors) with PlantDoc (field
photos from the web). The same model scored, on the test split:

| Crop | PlantVillage | PlantDoc |
|---|---:|---:|
| Tomato | 99.7% | 50.0% |
| Potato | 100% | 69.6% |

Thresholds chosen across both would have released advice on field photos that was right only 58%
(Tomato) and 73% (Potato) of the time, far below the 95% promise. So for a crop that mixes datasets,
choose thresholds from the field-photo dataset only:

```bash
.venv/Scripts/python -m agrilink_ml.train --crop tomato --threshold-source plantdoc-2020 ...
```

With the handful of field photos available (77 for Tomato, 21 for Potato) no class clears the bar,
so both models release nothing without an officer — the honest outcome until they are tested on real
Sri Lankan field photos. `model.json` records which datasets the thresholds came from.

## Using a model in the backend

The backend loads every `<ModelsDirectory>/<crop>/model.onnx` + `model.json` at startup. Its
`ImageClassification:ModelsDirectory` setting defaults to this repo's `ml/models`, so a model
trained here is picked up the next time the API starts — the log shows
`Loaded image classification model <version> for <Crop>`. Without a model, photos of that crop go
through the text-only agents.

Before a crop's photos can be diagnosed, every class in `labels/<crop>.json` needs an entry in
`backend/AgriLink.API/Services/Agents/DiseaseKnowledgeBase.cs` (a backend test enforces this). New
entries start serious with no treatment, so every case goes to an officer until an agricultural
officer provides approved advice.

The backend prepares photos with a C# port of Pillow's bilinear resize, so it feeds the model what
`eval_transform` did in training. If `eval_transform` changes, regenerate the backend's fixtures
with `.venv/Scripts/python -m tools.make_backend_fixtures` and run the backend tests.

### Checking a model in the backend

After training, confirm the backend reproduces Python's predictions on real photos:

```bash
.venv/Scripts/python -m tools.export_parity_photos --crop cassava --source kaggle-cassava-2020=C:/Users/you/Downloads/cassava-leaf-disease-classification.zip --output-dir C:/Users/you/Documents/agrilink-parity/cassava
```

Then, from `backend/`, with `AGRILINK_MODEL_PARITY_DIR` set to that folder (and
`AGRILINK_MODEL_PARITY_CROP` if it is not Cassava):

```bash
dotnet test AgriLink.API.Tests --filter "FullyQualifiedName~RealModelParityTests" --logger "console;verbosity=detailed"
```

Keep that folder outside the repo: the photos come from the dataset.

Adding a dataset means writing its adapter from the dataset's real folder structure and adding its
label mapping to the crop's label file. Before changing `--near-duplicate-distance` for a new
dataset, check flagged pairs by eye: on the Cassava photos, pairs 3–6 bits apart were different
plants.

Duplicates are grouped by identical file contents, by leaf ids a dataset puts in its file names
(PlantVillage), and by image hash — except for PlantVillage, whose identical grey backgrounds made
different leaves from different disease folders hash only 2 bits apart. Any photo whose duplicate
carries a different label (PlantDoc files the same image under two diseases several times) is left
out of the manifest and listed in the summary.
