"""
FinSight AI - Model Registry & Metadata Store
Manages persistence, versioning, performance metrics, and in-memory caching
for all six autonomous AI intelligence agents.
"""

import os
import json
import joblib
from datetime import datetime
from typing import Dict, Any, Optional

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")
METADATA_FILE = os.path.join(MODELS_DIR, "registry_metadata.json")

MLRUNS_DIR = os.path.join(BASE_DIR, "ml", "mlruns")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(MLRUNS_DIR, exist_ok=True)

class ModelRegistry:
    _models_cache: Dict[str, Any] = {}
    _metadata_cache: Dict[str, Any] = {}

    @classmethod
    def _log_to_mlflow(cls, model_name: str, file_path: str, metadata: Dict[str, Any]):
        """
        Logs model run parameters, metrics, tags, and artifacts to MLflow.
        """
        try:
            import mlflow
            # Use SQLite database backend for robust, standard MLflow tracking
            sqlite_db_path = os.path.join(MODELS_DIR, "mlflow.db").replace(os.sep, "/")
            tracking_uri = f"sqlite:///{sqlite_db_path}"
            mlflow.set_tracking_uri(tracking_uri)
            mlflow.set_experiment(f"FinSight_{model_name}")

            with mlflow.start_run(run_name=f"{model_name}_training_run"):
                # 1. Log tags
                model_version = metadata.get("model_version", "2.0.0")
                dataset_version = metadata.get("dataset_version", "synthetic_nbfc_v2.0")
                training_date = metadata.get("training_date", datetime.utcnow().isoformat())
                
                mlflow.set_tags({
                    "model_version": str(model_version),
                    "dataset_version": str(dataset_version),
                    "training_date": str(training_date),
                    "agent": metadata.get("agent", model_name),
                    "model_type": metadata.get("model_type", "ML Pipeline"),
                })

                # 2. Log parameters
                params = metadata.get("parameters", {})
                if isinstance(params, dict):
                    for k, v in params.items():
                        if isinstance(v, (int, float, str, bool)):
                            mlflow.log_param(k, v)

                # 3. Log metrics
                metrics = metadata.get("metrics", {})
                if isinstance(metrics, dict):
                    for k, v in metrics.items():
                        if isinstance(v, (int, float)):
                            mlflow.log_metric(k, float(v))

                # 4. Log features as text artifact
                features = metadata.get("features", [])
                if features:
                    features_file = os.path.join(MODELS_DIR, f"{model_name}_features.txt")
                    with open(features_file, "w", encoding="utf-8") as ff:
                        ff.write("\n".join(str(f) for f in features))
                    mlflow.log_artifact(features_file)

                # 5. Log model artifact
                if os.path.exists(file_path):
                    mlflow.log_artifact(file_path)
                    
        except Exception as e:
            # Non-blocking log warning so pipeline never fails if MLflow encounters an environment issue
            print(f"[MLflow Warning] Could not record run for {model_name}: {e}")

    @classmethod
    def save_model(cls, model_name: str, model_object: Any, metadata: Dict[str, Any]) -> str:
        """
        Saves a trained model artifact, logs to MLflow, and registers its metadata.
        """
        file_path = os.path.join(MODELS_DIR, f"{model_name}.joblib")
        joblib.dump(model_object, file_path)
        cls._models_cache[model_name] = model_object

        # Add tracking metadata
        now_iso = datetime.utcnow().isoformat()
        metadata["last_trained"] = now_iso
        metadata["training_date"] = now_iso
        metadata["model_version"] = metadata.get("model_version", "2.0.0")
        metadata["dataset_version"] = metadata.get("dataset_version", "synthetic_nbfc_v2.0")
        metadata["artifact_path"] = file_path

        # Update metadata cache and file
        all_metadata = cls.load_all_metadata()
        all_metadata[model_name] = metadata
        cls._metadata_cache = all_metadata

        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(all_metadata, f, indent=2)

        # Log run to MLflow
        cls._log_to_mlflow(model_name, file_path, metadata)

        return file_path

    @classmethod
    def load_model(cls, model_name: str) -> Optional[Any]:
        """
        Loads a model artifact from memory cache or disk.
        """
        if model_name in cls._models_cache:
            return cls._models_cache[model_name]

        file_path = os.path.join(MODELS_DIR, f"{model_name}.joblib")
        if os.path.exists(file_path):
            try:
                model_obj = joblib.load(file_path)
                cls._models_cache[model_name] = model_obj
                return model_obj
            except Exception as e:
                print(f"Error loading model {model_name}: {e}")
                return None
        return None

    @classmethod
    def load_all_metadata(cls) -> Dict[str, Any]:
        """
        Loads all model registry metadata.
        """
        if cls._metadata_cache:
            return cls._metadata_cache

        if os.path.exists(METADATA_FILE):
            try:
                with open(METADATA_FILE, "r", encoding="utf-8") as f:
                    cls._metadata_cache = json.load(f)
                    return cls._metadata_cache
            except Exception:
                pass
        return {}

    @classmethod
    def get_model_metadata(cls, model_name: str) -> Optional[Dict[str, Any]]:
        """
        Gets metadata for a specific model.
        """
        meta = cls.load_all_metadata()
        return meta.get(model_name)

    @classmethod
    def list_registered_models(cls) -> Dict[str, Any]:
        """
        Lists all registered model metadata.
        """
        return cls.load_all_metadata()

