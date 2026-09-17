# AgriLink ML — crop disease photo classification

Training code for the models that identify crop diseases from a farmer's photo. Python is used
**only for training**: each model is exported to ONNX and run inside the .NET backend
(`backend/AgriLink.API`), so there is no separate Python service to host.

## Layout

```
ml/
  data/       raw + prepared datasets (gitignored — see "Datasets" below)
  labels/     one label file per crop — the class ids shared by Python and C#
  training/   data preparation scripts and the training notebook
  models/     exported .onnx models + metadata (gitignored)
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

## Environment

Use a virtual environment inside this folder (not the repo-root `.venv`):

```bash
py -3.12 -m venv ml/.venv
ml/.venv/Scripts/pip install -r ml/requirements.txt
```

Training itself is meant to run on a free GPU (Kaggle or Colab); the local environment is for data
preparation and checking exported models.
