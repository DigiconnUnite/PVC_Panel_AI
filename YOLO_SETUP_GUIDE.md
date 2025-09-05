# YOLO Model Training and Initialization Guide

## 🚀 YOLO Model Setup for AI Room Visualizer

This guide provides step-by-step instructions for training and initializing YOLO models for room element detection (walls, floors, ceilings).

## 📋 Prerequisites

### 1. Install Ultralytics YOLO
```bash
pip install ultralytics
```

### 2. Prepare Dataset
Create a dataset in YOLO format with the following structure:
```
dataset/
├── images/
│   ├── train/
│   ├── val/
│   └── test/
├── labels/
│   ├── train/
│   ├── val/
│   └── test/
└── data.yaml
```

### 3. Dataset YAML Configuration
Create `data.yaml`:
```yaml
path: /path/to/dataset
train: images/train
val: images/val
test: images/test

# Classes
names:
  0: wall
  1: floor
  2: ceiling
  3: window
  4: door
```

## 🏋️ Training Instructions

### Step 1: Download Pre-trained Model
```bash
# Download YOLOv8 segmentation model
yolo predict model=yolov8x-seg.pt source=0  # This will download the model
```

### Step 2: Train the Model
```bash
# Train YOLOv8 segmentation model
yolo train \
  data=data.yaml \
  model=yolov8x-seg.pt \
  epochs=100 \
  imgsz=640 \
  batch=16 \
  lr0=0.01 \
  lrf=0.01 \
  momentum=0.937 \
  weight_decay=0.0005 \
  warmup_epochs=3.0 \
  warmup_momentum=0.8 \
  warmup_bias_lr=0.1 \
  box=7.5 \
  cls=0.5 \
  dfl=1.5 \
  pose=12.0 \
  kobj=2.0 \
  label_smoothing=0.0 \
  nbs=64 \
  hsv_h=0.015 \
  hsv_s=0.7 \
  hsv_v=0.4 \
  degrees=0.0 \
  translate=0.1 \
  scale=0.5 \
  shear=0.0 \
  perspective=0.0 \
  flipud=0.0 \
  fliplr=0.5 \
  mosaic=1.0 \
  mixup=0.0 \
  copy_paste=0.0
```

### Step 3: Validate Training
```bash
# Validate the trained model
yolo val model=runs/segment/train/weights/best.pt data=data.yaml
```

### Step 4: Test Predictions
```bash
# Test on sample images
yolo predict \
  model=runs/segment/train/weights/best.pt \
  source=path/to/test/images \
  save=True \
  save_txt=True \
  save_conf=True
```

## 🔧 Backend Integration

### 1. Model Loading in Python
```python
from ultralytics import YOLO

# Load trained model
model = YOLO('path/to/trained/model.pt')

# Make predictions
results = model.predict(
    source='path/to/image.jpg',
    conf=0.25,        # Confidence threshold
    iou=0.7,          # IoU threshold
    max_det=100,      # Maximum detections
    agnostic_nms=False # Class-specific NMS
)
```

### 2. FastAPI Integration
```python
from fastapi import FastAPI, UploadFile, File
from ultralytics import YOLO
import cv2
import numpy as np

app = FastAPI()
model = YOLO('trained_model.pt')

@app.post("/api/detect")
async def detect_objects(file: UploadFile = File(...)):
    # Read image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Run detection
    results = model.predict(img, conf=0.25, iou=0.7)

    # Process results
    detections = []
    for result in results:
        for box in result.boxes:
            detection = {
                'class': result.names[int(box.cls)],
                'confidence': float(box.conf),
                'bbox': box.xyxy.tolist()
            }
            detections.append(detection)

    return {'detections': detections}
```

## 🚀 Production Deployment

### 1. Model Optimization
```bash
# Export to ONNX for faster inference
yolo export model=trained_model.pt format=onnx

# Export to TensorRT (NVIDIA GPUs)
yolo export model=trained_model.pt format=engine
```

### 2. Environment Setup
```bash
# Install dependencies
pip install ultralytics onnxruntime-gpu  # For GPU acceleration
pip install fastapi uvicorn python-multipart
```

### 3. Start Backend Server
```bash
# Development
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Production
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 📊 Model Performance Monitoring

### 1. Add Logging
```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Log predictions
logger.info(f"Detection completed: {len(results)} objects found")
```

### 2. Performance Metrics
```python
# Calculate metrics
total_predictions = len(results)
avg_confidence = sum(box.conf for box in results[0].boxes) / len(results[0].boxes)
processing_time = time.time() - start_time

logger.info(f"Performance: {total_predictions} preds, {avg_confidence:.2f} avg conf, {processing_time:.2f}s")
```

## 🔧 Troubleshooting

### Common Issues:

1. **CUDA Out of Memory**
   ```bash
   # Reduce batch size
   yolo train data=data.yaml model=yolov8x-seg.pt batch=8
   ```

2. **Low Accuracy**
   - Increase epochs: `epochs=200`
   - Use data augmentation: `mosaic=1.0 mixup=0.1`
   - Fine-tune learning rate: `lr0=0.001`

3. **Slow Inference**
   - Use smaller model: `yolov8m-seg.pt`
   - Export to ONNX/TensorRT
   - Use GPU acceleration

4. **Memory Issues**
   ```python
   # Use smaller image size
   results = model.predict(img, imgsz=416)
   ```

## 📈 Advanced Training Techniques

### 1. Transfer Learning
```bash
# Fine-tune from COCO pre-trained weights
yolo train data=data.yaml model=yolov8x-seg.pt epochs=50
```

### 2. Custom Augmentation
```python
from ultralytics import YOLO

model = YOLO('yolov8x-seg.yaml')  # Build from scratch
model.train(data='data.yaml', epochs=100, augment=True)
```

### 3. Ensemble Models
```python
# Load multiple models
model1 = YOLO('model1.pt')
model2 = YOLO('model2.pt')

# Ensemble predictions
results1 = model1.predict(img)
results2 = model2.predict(img)
# Combine results...
```

## 🎯 Best Practices

1. **Dataset Quality**: Ensure diverse, high-quality labeled data
2. **Model Selection**: Start with yolov8m-seg.pt for balance of speed/accuracy
3. **Hyperparameter Tuning**: Use YOLO's auto-tuning features
4. **Regular Validation**: Monitor mAP and other metrics during training
5. **Version Control**: Keep track of model versions and performance
6. **GPU Utilization**: Use appropriate batch sizes for your GPU memory

## 📚 Resources

- [Ultralytics YOLO Documentation](https://docs.ultralytics.com/)
- [YOLOv8 Paper](https://arxiv.org/abs/2305.09972)
- [COCO Dataset](https://cocodataset.org/)
- [Roboflow for Dataset Management](https://roboflow.com/)

---

**Note**: This guide assumes you have a properly labeled dataset. For room-specific training, focus on collecting images of various room types with accurate annotations for walls, floors, ceilings, windows, and doors.