#!/usr/bin/env python3
"""
Advanced YOLOv8 Training Script for Room Segmentation
Trains a model to detect walls, floors, and ceilings with perfect accuracy
"""

import os
import yaml
import torch
from pathlib import Path
from ultralytics import YOLO
import argparse

def create_enhanced_data_yaml(original_yaml_path, output_path):
    """Create enhanced data.yaml with ceiling class if missing"""
    with open(original_yaml_path, 'r') as f:
        data = yaml.safe_load(f)

    # Check if ceiling class exists
    names = data.get('names', [])
    if 'ceiling' not in [name.lower() for name in names]:
        print("Adding ceiling class to dataset...")
        names.append('ceiling')
        data['names'] = names
        data['nc'] = len(names)

        # Save enhanced data.yaml
        with open(output_path, 'w') as f:
            yaml.dump(data, f, default_flow_style=False)

    return data

def train_room_segmentation_model(
    data_yaml=None,
    model_size="x",  # x, l, m, s
    epochs=100,
    batch_size=16,
    img_size=640
):
    # Auto-detect data.yaml path
    if data_yaml is None:
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        data_yaml = project_root / "Room Segmentation.v1i.yolov8" / "data.yaml"
        print(f"Script dir: {script_dir}")
        print(f"Project root: {project_root}")
        print(f"Data YAML path: {data_yaml}")
        print(f"Data YAML exists: {data_yaml.exists()}")

    data_yaml = str(data_yaml)
    """Train YOLOv8 segmentation model for room elements"""

    print("🚀 Starting Room Segmentation Model Training")
    print(f"Model: YOLOv8{model_size}-seg")
    print(f"Dataset: {data_yaml}")
    print(f"Epochs: {epochs}")

    # Create output directory
    output_dir = Path("models/room_segmentation")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Enhanced data.yaml path
    enhanced_yaml = output_dir / "data_enhanced.yaml"

    # Create enhanced dataset configuration
    data_config = create_enhanced_data_yaml(data_yaml, enhanced_yaml)

    print(f"Classes: {data_config['names']}")
    print(f"Number of classes: {data_config['nc']}")

    # Load model
    model_name = f"yolov8{model_size}-seg.pt"
    if not os.path.exists(model_name):
        print(f"Downloading {model_name}...")
        model = YOLO(f"yolov8{model_size}-seg.yaml")  # Build from scratch if not available
    else:
        model = YOLO(model_name)

    # Training configuration optimized for room segmentation
    training_args = {
        'data': str(enhanced_yaml),
        'epochs': epochs,
        'imgsz': img_size,
        'batch': batch_size,
        'lr0': 0.01,
        'lrf': 0.01,
        'momentum': 0.937,
        'weight_decay': 0.0005,
        'warmup_epochs': 3.0,
        'warmup_momentum': 0.8,
        'warmup_bias_lr': 0.1,
        'box': 7.5,
        'cls': 0.5,
        'dfl': 1.5,
        'patience': 50,  # Early stopping patience
        'save': True,
        'save_period': 10,
        'cache': True,  # Cache dataset for faster training
        'device': 0 if torch.cuda.is_available() else 'cpu',
        'workers': 8,
        'project': str(output_dir),
        'name': f'room_seg_{model_size}',
        'exist_ok': True,
        'pretrained': True,
        'optimizer': 'AdamW',
        'amp': True,  # Automatic Mixed Precision
        'cos_lr': True,  # Cosine learning rate scheduler
        'close_mosaic': 10,  # Close mosaic augmentation in last 10 epochs
        # Data augmentation optimized for room segmentation
        'hsv_h': 0.015,
        'hsv_s': 0.7,
        'hsv_v': 0.4,
        'degrees': 0.0,  # No rotation for architectural elements
        'translate': 0.1,
        'scale': 0.5,
        'shear': 0.0,
        'perspective': 0.0,
        'flipud': 0.0,  # No vertical flip for rooms
        'fliplr': 0.5,  # Horizontal flip OK
        'mosaic': 1.0,
        'mixup': 0.0,  # Disable mixup for better architectural accuracy
        'copy_paste': 0.0
    }

    print("🔥 Starting training with optimized parameters...")
    results = model.train(**training_args)

    # Get best model path
    best_model_path = output_dir / f'room_seg_{model_size}' / 'weights' / 'best.pt'

    if best_model_path.exists():
        print(f"✅ Training completed! Best model saved at: {best_model_path}")

        # Validate the model
        print("🔍 Validating trained model...")
        metrics = model.val(data=str(enhanced_yaml))
        print(f"Validation mAP: {metrics.box.map:.4f}")

        # Copy best model to main directory
        final_model_path = Path(f"room_segmentation_{model_size}.pt")
        import shutil
        shutil.copy(best_model_path, final_model_path)
        print(f"📁 Model copied to: {final_model_path}")

        return str(final_model_path)
    else:
        print("❌ Training failed - best model not found")
        return None

def main():
    parser = argparse.ArgumentParser(description='Train YOLOv8 for Room Segmentation')
    parser.add_argument('--data', default='Room Segmentation.v1i.yolov8/data.yaml',
                       help='Path to data.yaml file')
    parser.add_argument('--model', default='x', choices=['x', 'l', 'm', 's'],
                       help='Model size (x=largest, s=smallest)')
    parser.add_argument('--epochs', type=int, default=100,
                       help='Number of training epochs')
    parser.add_argument('--batch', type=int, default=16,
                       help='Batch size')
    parser.add_argument('--imgsz', type=int, default=640,
                       help='Image size')

    args = parser.parse_args()

    # Train the model
    trained_model = train_room_segmentation_model(
        data_yaml=None if args.data == 'Room Segmentation.v1i.yolov8/data.yaml' else args.data,
        model_size=args.model,
        epochs=args.epochs,
        batch_size=args.batch,
        img_size=args.imgsz
    )

    if trained_model:
        print(f"\n🎉 Success! Trained model available at: {trained_model}")
        print("You can now use this model in your room visualizer application!")
    else:
        print("\n❌ Training failed. Please check the logs above for errors.")

if __name__ == "__main__":
    main()