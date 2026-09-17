# AgriLink ML — crop disease photo classification

Training code for the models that identify crop diseases from a farmer's photo. Python is used
**only for training**: each model is exported to ONNX and run inside the .NET backend
(`backend/AgriLink.API`), so there is no separate Python service to host.

## Layout

```
ml/
  agrilink_ml/  data preparation package (dataset adapters, de-duplication, splitting)
  data/         raw datasets (gitignored — see "Datasets" below)
  labels/       one label file per crop — the class ids and keys shared by Python and C#
  manifests/    per-crop image lists with their class and split (committed)
  training/     the training notebook
  models/       exported .onnx models + metadata (gitignored)
  tests/        pytest tests for agrilink_ml
```

## Version 1 crops

One model per crop: Paddy, Tomato, Potato, Cassava. A photo of any other crop skips the model and
goes through the normal text-based agents.

## Datasets

Download each one into `ml/data/raw/<folder>/`. Check each licence before use and cite the
dataset in any report.

| Folder | Dataset | Crops | Source | Licence |
|---|---|---|---|---|
| `plantvillage` | PlantVillage | Tomato, Potato | https://github.com/spMohanty/PlantVillage-Dataset (images under `raw/color/`) | CC BY-SA 3.0 |
| `plantdoc` | PlantDoc | Tomato, Potato | https://github.com/pratikkayal/PlantDoc-Dataset | CC BY 4.0 |
| `cassava` | Cassava Leaf Disease Classification | Cassava | https://www.kaggle.com/competitions/cassava-leaf-disease-classification | Competition rules |
| `paddy-doctor` | Paddy Doctor | Paddy | https://www.kaggle.com/competitions/paddy-disease-classification | Competition rules |
| `rice-mendeley` | Rice Leaf Disease Image Samples | Paddy | https://data.mendeley.com/datasets/fwcj7stb8r/1 | CC BY 4.0 |

For Cassava, only `train_images/` and `train.csv` are needed — `train_tfrecords/` holds the same
images in another format.

A dataset can stay zipped — the preparation script reads a `.zip` or an extracted folder.

## Environment

Use a virtual environment inside this folder (not the repo-root `.venv`):

```bash
py -3.12 -m venv ml/.venv
ml/.venv/Scripts/pip install -r ml/requirements.txt
```

`requirements.txt` covers data preparation and tests. Training itself runs on a free GPU (Kaggle or
Colab); install `requirements-train.txt` locally only to train or inspect models on this machine.

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

Adding a dataset means writing its adapter from the dataset's real folder structure and adding its
label mapping to the crop's label file. Before changing `--near-duplicate-distance` for a new
dataset, check flagged pairs by eye: on the Cassava photos, pairs 3–6 bits apart were different
plants.
