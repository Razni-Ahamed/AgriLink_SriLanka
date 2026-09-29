# ADR-008: Train in Python, serve photo models with ONNX Runtime in .NET

**Status:** Accepted (2026-09-01), implemented in PRs #43–#49.

**Context.** The disease classifiers are trained with Python tools (PyTorch, timm), but the production backend is ASP.NET Core on a free plan that can host only one app. A separate Python inference service would mean a second deployment, a second security boundary and more cost.

**ADR-008 options**

| Option | For | Against |
|---|---|---|
| Python inference service | Native ML environment | A separate service to deploy and secure; network hop; clients or the API must call it |
| **ONNX Runtime inside the .NET API** | One deployment; inference next to the business rules; no network hop | Preprocessing must match Python exactly; export must be validated |
| Inference in the browser or on the phone | No server inference cost | Large model downloads; uneven device performance; logic duplicated in two clients |

**Decision.** Train and evaluate in Python (`ml/`), export each crop's model to ONNX with a `model.json` of preprocessing, classes, calibrated thresholds and metrics, and run it with ONNX Runtime inside the API. The publish script bundles the models, and the API loads them at start-up.

**Consequences.**

- (+) A single backend deployment, and the Python toolchain is still available for training.
- (+) Inference takes about 100 ms per photo on CPU.
- (−) The C# preprocessing must mirror Python's. Parity tests enforce this: 40/40 matching predictions for Tomato and Potato.
- (−) The model files are not in Git, so deployment must include them (the publish script checks).

**Review condition.** Revisit if model size or inference latency outgrows the App Service plan.
