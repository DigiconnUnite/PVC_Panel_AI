

# AI Room Visualizer - Complete Project Documentation

## PROJECT_DOC.md

### 1. Project Overview & Goals

**Elevator Pitch**: AI Room Visualizer is a web application that allows users to upload photos of their rooms and automatically segment different surfaces (walls, floors, furniture), then visualize how different materials, colors, or products would look in their space through an intuitive interface with interactive refinement capabilities.

**User Stories / Features**:
- Upload room photos from various devices
- Automatic surface segmentation (walls, floors, ceilings, furniture)
- Interactive refinement tools (click to select/deselect, scribble to refine edges)
- Overlay products/materials on segmented surfaces
- Perspective and alignment correction for realistic visualization
- Save and share visualization results
- Browse and select from a product catalog
- Export final visualizations as images
- Analytics dashboard for usage insights

### 2. Architecture Diagram & Explanation

```
+----------------+      +-------------------+      +-----------------+
|                |      |                   |      |                 |
|  Next.js Front | <--> |  FastAPI Backend  | <--> |  PostgreSQL DB  |
|                |      |                   |      |                 |
+----------------+      +-------------------+      +-----------------+
        |                       |                        |
        |                       |                        |
        v                       v                        v
+----------------+      +-------------------+      +-----------------+
|                |      |                   |      |                 |
|   Browser      |      |   Model Server    |      |   Object Store  |
|                |      |                   |      | (S3/MinIO)      |
+----------------+      +-------------------+      +-----------------+
                               |
                               |
                               v
                      +-------------------+
                      |                   |
                      |   Worker Queue    |
                      |                   |
                      +-------------------+
```

**Architecture Explanation**:
- **Frontend**: Next.js application with TypeScript, providing the user interface for uploading, visualizing, and interacting with room visualizations.
- **Backend**: FastAPI server that handles API requests, manages sessions, and orchestrates the AI model inference.
- **Model Server**: Separate service that loads and runs the segmentation models, optimized for GPU inference.
- **Database**: PostgreSQL for storing user data, sessions, products, and visualization metadata.
- **Object Storage**: S3-compatible storage (MinIO for local development) for storing uploaded images and generated visualizations.
- **Worker Queue**: Background processing for heavy tasks like model inference and image processing.

**Data Flow**:
1. User uploads an image via the Next.js frontend
2. Frontend sends the image to FastAPI backend (`/api/upload`)
3. Backend stores the image in object storage and creates a session record in the database
4. Backend sends the image to the model server for segmentation (`/api/analyze`)
5. Model server runs inference and returns segmentation masks
6. Backend processes masks and returns them to the frontend
7. Frontend renders the image with mask overlays for visualization
8. User can refine masks by clicking/scribbling, which are sent to `/api/refine`
9. User selects products to overlay, which triggers `/api/visualize`
10. User saves the result via `/api/save`, which stores the final visualization in the database and object storage

### 3. Exact Open-Source Models to Use

#### Primary Recommendation: FastSAM (PyTorch)

**Name**: FastSAM
**Reason to use**: FastSAM is a faster implementation of the Segment Anything Model that provides real-time segmentation with good accuracy, making it ideal for interactive web applications.
**When to pick PyTorch**: For FastSAM, PyTorch is the primary and most efficient implementation. It offers better GPU utilization and is more memory-efficient than TensorFlow for this model.

**Installation**:
```bash
# CPU-only
pip install torch torchvision
pip install git+https://github.com/CASIA-IVA-Lab/FastSAM.git

# With CUDA support
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install git+https://github.com/CASIA-IVA-Lab/FastSAM.git
```

**Model Loading & Inference (PyTorch)**:
```python
from fastsam import FastSAM, FastSAMPrompt
import torch

def load_fastsam_model():
    # Load the model
    model = FastSAM('./weights/FastSAM-x.pt')  # Download weights from GitHub repo
    return model

def run_segmentation(model, image_path):
    # Run inference
    everything_results = model(image_path, device='cuda' if torch.cuda.is_available() else 'cpu', retina_masks=True, imgsz=1024, conf=0.4, iou=0.9)
    
    # Process results to get masks
    prompt_process = FastSAMPrompt(image_path, everything_results, device='cuda' if torch.cuda.is_available() else 'cpu')
    
    # Get all masks
    masks = prompt_process.everything_prompt()
    
    return masks
```

#### Alternative: OneFormer (PyTorch)

**Name**: OneFormer
**Reason to use**: OneFormer is a unified model for segmentation tasks that can perform semantic, instance, and panoptic segmentation with a single model, providing more detailed segmentation information.

**Installation**:
```bash
# CPU-only
pip install torch torchvision
pip install git+https://github.com/SHI-Labs/OneFormer.git

# With CUDA support
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install git+https://github.com/SHI-Labs/OneFormer.git
```

**Model Loading & Inference (PyTorch)**:
```python
from oneformer import OneFormerForSegmentation
from transformers import AutoImageProcessor
import torch

def load_oneformer_model():
    # Load model and processor
    model = OneFormerForSegmentation.from_pretrained("shi-labs/oneformer_ade20k_swin_large")
    processor = AutoImageProcessor.from_pretrained("shi-labs/oneformer_ade20k_swin_large")
    
    # Move to GPU if available
    if torch.cuda.is_available():
        model = model.cuda()
    
    return model, processor

def run_segmentation(model, processor, image):
    # Prepare image
    inputs = processor(images=image, task_inputs=["semantic"], return_tensors="pt")
    
    # Move to GPU if available
    if torch.cuda.is_available():
        for k, v in inputs.items():
            inputs[k] = v.cuda()
    
    # Run inference
    outputs = model(**inputs)
    
    # Process results to get masks
    masks = processor.post_process_semantic_segmentation(outputs, target_sizes=[image.size[::-1]])[0]
    
    return masks
```

#### Alternative: Mask R-CNN (TensorFlow)

**Name**: Mask R-CNN
**Reason to use**: Mask R-CNN is a well-established model for instance segmentation that provides good accuracy and has TensorFlow implementations for environments where TensorFlow is preferred.

**Installation**:
```bash
# CPU-only
pip install tensorflow
pip install tensorflow-datasets
pip install git+https://github.com/matterport/Mask_RCNN.git

# With GPU support
pip install tensorflow[and-cuda]
pip install tensorflow-datasets
pip install git+https://github.com/matterport/Mask_RCNN.git
```

**Model Loading & Inference (TensorFlow)**:
```python
import tensorflow as tf
from mrcnn import model as modellib, utils

def load_mask_rcnn_model():
    # Create model in inference mode
    model = modellib.MaskRCNN(mode="inference", config=InferenceConfig(), model_dir='logs')
    
    # Load weights
    model.load_weights('mask_rcnn_coco.h5', by_name=True)
    
    return model

def run_segmentation(model, image):
    # Run detection
    results = model.detect([image], verbose=1)
    
    # Get masks
    r = results[0]
    masks = r['masks']
    
    return masks
```

#### Semantic Guidance: CLIP (PyTorch)

**Name**: CLIP (Contrastive Language-Image Pretraining)
**Reason to use**: CLIP enables open-vocabulary semantic understanding, allowing users to select objects using natural language descriptions.

**Installation**:
```bash
# CPU-only
pip install torch torchvision
pip install git+https://github.com/openai/CLIP.git

# With CUDA support
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install git+https://github.com/openai/CLIP.git
```

**Model Loading & Inference (PyTorch)**:
```python
import torch
import clip
from PIL import Image

def load_clip_model():
    # Load the model
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model, preprocess = clip.load("ViT-B/32", device=device)
    return model, preprocess, device

def classify_objects(model, preprocess, device, image, text_labels):
    # Preprocess image
    image_input = preprocess(image).unsqueeze(0).to(device)
    
    # Tokenize text
    text_tokens = clip.tokenize(text_labels).to(device)
    
    # Run inference
    with torch.no_grad():
        image_features = model.encode_image(image_input)
        text_features = model.encode_text(text_tokens)
        
        # Calculate similarity
        logits_per_image, logits_per_text = model(image_input, text_tokens)
        probs = logits_per_image.softmax(dim=-1).cpu().numpy()
    
    return probs
```

### 4. Repository Skeleton & File Structure

```
ai-room-visualizer/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   │   ├── api/          # API routes (if needed)
│   │   │   ├── dashboard/    # Dashboard pages
│   │   │   ├── upload/       # Upload page
│   │   │   ├── visualize/    # Visualization page
│   │   │   ├── products/     # Product catalog
│   │   │   ├── login/        # Authentication
│   │   │   ├── layout.tsx    # Root layout
│   │   │   ├── page.tsx      # Home page
│   │   │   └── globals.css   # Global styles
│   │   ├── components/       # Reusable components
│   │   │   ├── ui/           # Base UI components
│   │   │   ├── upload/       # Upload-related components
│   │   │   ├── visualize/    # Visualization components
│   │   │   ├── product/      # Product components
│   │   │   └── auth/         # Authentication components
│   │   ├── lib/              # Utility libraries
│   │   │   ├── api.ts        # API client
│   │   │   ├── utils.ts      # Utility functions
│   │   │   └── constants.ts  # Constants
│   │   ├── hooks/            # Custom React hooks
│   │   ├── types/            # TypeScript type definitions
│   │   ├── store/            # State management (Zustand/Redux)
│   │   └── styles/           # Additional styles
│   ├── public/               # Static assets
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── next.config.js
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── api/              # API routes
│   │   │   ├── upload.py     # Upload endpoints
│   │   │   ├── analyze.py    # Analysis endpoints
│   │   │   ├── visualize.py  # Visualization endpoints
│   │   │   ├── refine.py     # Refinement endpoints
│   │   │   ├── products.py   # Product endpoints
│   │   │   ├── save.py       # Save endpoints
│   │   │   └── health.py     # Health check endpoints
│   │   ├── core/             # Core functionality
│   │   │   ├── config.py     # Configuration
│   │   │   ├── security.py   # Security utilities
│   │   │   └── exceptions.py # Exception handlers
│   │   ├── models/           # Database models
│   │   │   ├── user.py       # User model
│   │   │   ├── session.py    # Session model
│   │   │   ├── product.py    # Product model
│   │   │   └── visualization.py # Visualization model
│   │   ├── services/         # Business logic
│   │   │   ├── auth.py       # Authentication service
│   │   │   ├── storage.py    # Storage service
│   │   │   └── image.py      # Image processing service
│   │   ├── db/               # Database setup
│   │   │   ├── session.py    # Database session
│   │   │   └── migrations/   # Database migrations
│   │   └── utils/            # Utility functions
│   ├── ml/                   # Machine learning components
│   │   ├── models/           # Model definitions
│   │   ├── model_server.py   # Model server
│   │   ├── inference.py      # Inference utilities
│   │   ├── processing.py     # Image processing
│   │   └── workers/          # Background workers
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── infrastructure/           # Infrastructure as code
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   └── .env
│   ├── kubernetes/           # K8s manifests (if needed)
│   └── terraform/            # Terraform configs (if needed)
├── tests/                    # Test files
│   ├── frontend/             # Frontend tests
│   │   ├── components/       # Component tests
│   │   ├── pages/            # Page tests
│   │   └── utils/            # Utility tests
│   ├── backend/              # Backend tests
│   │   ├── api/              # API tests
│   │   ├── services/         # Service tests
│   │   └── models/           # Model tests
│   └── ml/                   # ML tests
│       ├── models/           # Model tests
│       └── inference/        # Inference tests
├── docs/                     # Documentation
│   ├── api/                  # API documentation
│   ├── deployment/           # Deployment guides
│   └── development/          # Development guides
├── scripts/                  # Utility scripts
│   ├── setup.sh              # Setup script
│   ├── migrate.sh            # Migration script
│   └── seed.sh               # Database seeding script
├── .gitignore
├── README.md
└── PROJECT_DOC.md            # This document
```

### 5. Frontend (Next.js, TypeScript)

#### UI Requirements and Style Guide
- **Design System**: Modern, minimal design with clean lines and plenty of white space
- **Color Palette**: Primary: #3B82F6 (blue), Secondary: #10B981 (green), Neutral: #F3F4F6 (light gray), #1F2937 (dark gray)
- **Typography**: Inter font for UI, with sizes ranging from 12px (captions) to 24px (headings)
- **Responsive Layout**: Mobile-first approach with breakpoints at 640px (sm), 768px (md), 1024px (lg), and 1280px (xl)
- **Accessibility**: WCAG 2.1 AA compliant with proper contrast, keyboard navigation, and ARIA labels
- **Animations**: Subtle transitions and micro-interactions using Framer Motion
- **Components**: Consistent spacing (8px grid system), rounded corners (4px-8px), and shadows for depth

#### Upload Page/Component

### frontend/src/app/upload/page.tsx
```tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { uploadImage } from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.match('image.*')) {
        setErrorMessage('Please select an image file');
        return;
      }
      
      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setErrorMessage('Image size should be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
      setErrorMessage('');
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('idle');
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);
      
      const response = await uploadImage(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('success');
      
      // Redirect to visualization page after a short delay
      setTimeout(() => {
        router.push(`/visualize?sessionId=${response.sessionId}`);
      }, 1500);
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage('Upload failed. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      // Create a synthetic event to reuse the file change handler
      const event = {
        target: { files: [droppedFile] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(event);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Your Room Photo</h1>
            <p className="text-lg text-gray-600">
              Transform your space with our AI-powered visualization tool
            </p>
          </div>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-500" />
                Upload Image
              </CardTitle>
              <CardDescription>
                Upload a clear photo of your room to get started. Supported formats: JPG, PNG, WebP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  errorMessage ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                
                {preview ? (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-64 rounded-lg shadow-md object-contain"
                      />
                      {uploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center">
                          <div className="text-white font-medium">Uploading...</div>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{file?.name}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Drag & drop your image here
                    </p>
                    <p className="text-sm text-gray-500 mb-4">or click to browse files</p>
                    <Button variant="outline" size="sm">
                      Select Image
                    </Button>
                  </div>
                )}
                
                {errorMessage && (
                  <div className="mt-4 flex items-center justify-center text-red-500">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">{errorMessage}</span>
                  </div>
                )}
                
                {uploading && (
                  <div className="mt-6">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-gray-500 mt-2">Uploading... {uploadProgress}%</p>
                  </div>
                )}
                
                {uploadStatus === 'success' && (
                  <div className="mt-4 flex items-center justify-center text-green-500">
                    <CheckCircle className="h-5 w-5 mr-1" />
                    <span className="font-medium">Upload successful! Redirecting...</span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="px-8 py-2"
                >
                  {uploading ? 'Uploading...' : 'Upload & Analyze'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold text-lg">1</span>
                  </div>
                  <h3 className="font-medium mb-1">Upload</h3>
                  <p className="text-sm text-gray-600">Upload a photo of your room</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold text-lg">2</span>
                  </div>
                  <h3 className="font-medium mb-1">Analyze</h3>
                  <p className="text-sm text-gray-600">AI identifies surfaces and objects</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-bold text-lg">3</span>
                  </div>
                  <h3 className="font-medium mb-1">Visualize</h3>
                  <p className="text-sm text-gray-600">Apply materials and see results</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
```

#### Visualizer Page

### frontend/src/app/visualize/page.tsx
```tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  getSession, 
  analyzeImage, 
  refineMask, 
  getProducts, 
  applyVisualization,
  saveVisualization
} from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Share, 
  Palette, 
  Layers, 
  Edit3,
  Check,
  Loader2
} from 'lucide-react';
import type { Product, Session, Mask, Visualization } from '@/types';

export default function VisualizerPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [masks, setMasks] = useState<Mask[]>([]);
  const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [visualization, setVisualization] = useState<Visualization | null>(null);
  const [refining, setRefining] = useState(false);
  const [refineMode, setRefineMode] = useState<'click' | 'scribble'>('click');
  const [isDrawing, setIsDrawing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get session data
        const sessionData = await getSession(sessionId);
        setSession(sessionData);
        
        // Get products
        const productsData = await getProducts();
        setProducts(productsData);
        
        // Check if analysis is already done
        if (sessionData.masks && sessionData.masks.length > 0) {
          setMasks(sessionData.masks);
        } else {
          // Start analysis
          await startAnalysis(sessionData.imageUrl);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [sessionId]);
  
  const startAnalysis = async (imageUrl: string) => {
    setAnalyzing(true);
    setAnalysisProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);
      
      const result = await analyzeImage(sessionId, imageUrl);
      
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setMasks(result.masks);
    } catch (error) {
      console.error('Error analyzing image:', error);
    } finally {
      setAnalyzing(false);
    }
  };
  
  const handleMaskSelect = (maskId: string) => {
    setSelectedMaskId(maskId);
    // Reset product selection when changing mask
    setSelectedProductId(null);
    setVisualization(null);
  };
  
  const handleProductSelect = async (productId: string) => {
    if (!selectedMaskId) return;
    
    setSelectedProductId(productId);
    
    try {
      const selectedProduct = products.find(p => p.id === productId);
      if (!selectedProduct) return;
      
      const result = await applyVisualization(
        sessionId,
        selectedMaskId,
        selectedProduct.imageUrl
      );
      
      setVisualization(result);
    } catch (error) {
      console.error('Error applying visualization:', error);
    }
  };
  
  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!refineMode || !selectedMaskId || refining) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setRefining(true);
    
    try {
      const result = await refineMask(sessionId, selectedMaskId, {
        type: 'point',
        x,
        y,
        label: 1 // Positive point
      });
      
      setMasks(result.masks);
    } catch (error) {
      console.error('Error refining mask:', error);
    } finally {
      setRefining(false);
    }
  };
  
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (refineMode !== 'scribble' || !selectedMaskId || refining) return;
    setIsDrawing(true);
  };
  
  const handleCanvasMouseMove = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !selectedMaskId || refining) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // In a real implementation, we'd collect points and send them in batches
    // For simplicity, we'll send each point individually
    try {
      const result = await refineMask(sessionId, selectedMaskId, {
        type: 'point',
        x,
        y,
        label: 1 // Positive point
      });
      
      setMasks(result.masks);
    } catch (error) {
      console.error('Error refining mask:', error);
    }
  };
  
  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };
  
  const handleSaveVisualization = async () => {
    if (!visualization) return;
    
    try {
      await saveVisualization(sessionId, visualization.id);
      alert('Visualization saved successfully!');
    } catch (error) {
      console.error('Error saving visualization:', error);
    }
  };
  
  const handleDownload = () => {
    if (!visualization) return;
    
    const link = document.createElement('a');
    link.href = visualization.imageUrl;
    link.download = `room-visualization-${new Date().getTime()}.png`;
    link.click();
  };
  
  const handleShare = () => {
    if (!visualization) return;
    
    // In a real implementation, this would generate a shareable link
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };
  
  const renderCanvas = () => {
    if (!session || masks.length === 0) return null;
    
    const selectedMask = masks.find(m => m.id === selectedMaskId);
    
    return (
      <div className="relative border rounded-lg overflow-hidden">
        <img
          ref={originalImageRef}
          src={session.imageUrl}
          alt="Room"
          className="w-full h-auto"
          style={{ display: 'none' }}
        />
        
        <canvas
          ref={canvasRef}
          width={session.imageWidth || 800}
          height={session.imageHeight || 600}
          className="w-full h-auto bg-gray-100"
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        />
        
        {visualization && (
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={visualization.imageUrl}
              alt="Visualization"
              className="w-full h-full object-contain"
            />
          </div>
        )}
        
        {refining && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 mx-auto animate-spin mb-4" />
          <p className="text-lg text-gray-700">Loading your session...</p>
        </div>
      </div>
    );
  }
  
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-500">Session Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-4">The requested session could not be found.</p>
            <div className="flex justify-center">
              <Button onClick={() => router.push('/upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center mb-8">
            <Button variant="ghost" onClick={() => router.push('/upload')} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Room Visualizer</h1>
              <p className="text-gray-600">Transform your space with AI</p>
            </div>
          </div>
          
          {analyzing ? (
            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-blue-500 mx-auto animate-spin mb-4" />
                  <h3 className="text-lg font-medium mb-2">Analyzing Your Room</h3>
                  <p className="text-gray-600 mb-4">Our AI is identifying surfaces and objects in your room</p>
                  <Progress value={analysisProgress} className="h-2 mb-2" />
                  <p className="text-sm text-gray-500">{analysisProgress}% complete</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-blue-500" />
                      Room Visualization
                    </CardTitle>
                    <CardDescription>
                      {refineMode === 'click' 
                        ? 'Click on areas to refine the selection' 
                        : 'Draw to refine the selection'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderCanvas()}
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button
                        variant={refineMode === 'click' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRefineMode('click')}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Click Refine
                      </Button>
                      <Button
                        variant={refineMode === 'scribble' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRefineMode('scribble')}
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Scribble Refine
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                {visualization && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-500" />
                        Visualization Complete
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={handleSaveVisualization}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="outline" onClick={handleDownload}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button variant="outline" onClick={handleShare}>
                          <Share className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              <div className="lg:col-span-1">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-blue-500" />
                      Surfaces
                    </CardTitle>
                    <CardDescription>
                      Select a surface to customize
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {masks.map((mask) => (
                        <div
                          key={mask.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedMaskId === mask.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleMaskSelect(mask.id)}
                        >
                          <div className="flex items-center">
                            <div
                              className="w-6 h-6 rounded-full mr-3"
                              style={{ backgroundColor: mask.color }}
                            />
                            <div>
                              <h4 className="font-medium">{mask.label}</h4>
                              <p className="text-sm text-gray-500">
                                {mask.areaPercent}% of room
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {selectedMaskId && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-blue-500" />
                        Materials & Products
                      </CardTitle>
                      <CardDescription>
                        Select a material to apply
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="materials" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="materials">Materials</TabsTrigger>
                          <TabsTrigger value="products">Products</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="materials" className="mt-4">
                          <div className="grid grid-cols-2 gap-3">
                            {products
                              .filter(p => p.type === 'material')
                              .map((product) => (
                                <div
                                  key={product.id}
                                  className={`border rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] ${
                                    selectedProductId === product.id
                                      ? 'ring-2 ring-blue-500'
                                      : ''
                                  }`}
                                  onClick={() => handleProductSelect(product.id)}
                                >
                                  <div className="aspect-square bg-gray-100">
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="p-2">
                                    <p className="text-sm font-medium truncate">
                                      {product.name}
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="products" className="mt-4">
                          <div className="grid grid-cols-2 gap-3">
                            {products
                              .filter(p => p.type === 'product')
                              .map((product) => (
                                <div
                                  key={product.id}
                                  className={`border rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] ${
                                    selectedProductId === product.id
                                      ? 'ring-2 ring-blue-500'
                                      : ''
                                  }`}
                                  onClick={() => handleProductSelect(product.id)}
                                >
                                  <div className="aspect-square bg-gray-100">
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="p-2">
                                    <p className="text-sm font-medium truncate">
                                      {product.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      ${product.price}
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
```

#### Interactive Refine Component

### frontend/src/components/visualize/RefineControls.tsx
```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Eraser, 
  Pencil, 
  Brush, 
  Circle, 
  Square, 
  Minus, 
  Plus,
  RotateCcw
} from 'lucide-react';

interface RefineControlsProps {
  onRefineModeChange: (mode: 'click' | 'scribble') => void;
  onBrushSizeChange: (size: number) => void;
  onAction: (action: 'add' | 'remove' | 'reset') => void;
  refineMode: 'click' | 'scribble';
  brushSize: number;
}

export function RefineControls({
  onRefineModeChange,
  onBrushSizeChange,
  onAction,
  refineMode,
  brushSize
}: RefineControlsProps) {
  const [activeTool, setActiveTool] = useState<'add' | 'remove'>('add');
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pencil className="h-5 w-5 text-blue-500" />
          Refinement Tools
        </CardTitle>
        <CardDescription>
          Fine-tune your selection for more accurate visualization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tools" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tools" className="mt-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Button
                variant={activeTool === 'add' ? 'default' : 'outline'}
                className="h-auto py-3 flex flex-col items-center"
                onClick={() => setActiveTool('add')}
              >
                <Plus className="h-5 w-5 mb-1" />
                <span>Add Area</span>
              </Button>
              <Button
                variant={activeTool === 'remove' ? 'default' : 'outline'}
                className="h-auto py-3 flex flex-col items-center"
                onClick={() => setActiveTool('remove')}
              >
                <Minus className="h-5 w-5 mb-1" />
                <span>Remove Area</span>
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Refinement Mode</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={refineMode === 'click' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onRefineModeChange('click')}
                  >
                    <Circle className="h-4 w-4 mr-1" />
                    Click
                  </Button>
                  <Button
                    variant={refineMode === 'scribble' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onRefineModeChange('scribble')}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Scribble
                  </Button>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Brush Size</h4>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[brushSize]}
                    onValueChange={(value) => onBrushSizeChange(value[0])}
                    max={50}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="w-12 justify-center">
                    {brushSize}
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="mt-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAction('reset')}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset Selection
                  </Button>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Tips</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-start">
                    <Circle className="h-3 w-3 mt-0.5 mr-2 text-blue-500 flex-shrink-0" />
                    <span>Use Click mode for precise adjustments</span>
                  </li>
                  <li className="flex items-start">
                    <Pencil className="h-3 w-3 mt-0.5 mr-2 text-blue-500 flex-shrink-0" />
                    <span>Use Scribble mode for larger areas</span>
                  </li>
                  <li className="flex items-start">
                    <Brush className="h-3 w-3 mt-0.5 mr-2 text-blue-500 flex-shrink-0" />
                    <span>Adjust brush size for better control</span>
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

#### Product Selection UI & Sample Product Card

### frontend/src/components/product/ProductCard.tsx
```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Eye, ShoppingCart, Heart } from 'lucide-react';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  isSelected?: boolean;
  onSelect?: (productId: string) => void;
  onViewDetails?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  onToggleFavorite?: (productId: string) => void;
  isFavorite?: boolean;
}

export function ProductCard({
  product,
  isSelected = false,
  onSelect,
  onViewDetails,
  onAddToCart,
  onToggleFavorite,
  isFavorite = false
}: ProductCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card 
        className={`h-full overflow-hidden transition-all cursor-pointer ${
          isSelected 
            ? 'ring-2 ring-blue-500 shadow-lg' 
            : 'hover:shadow-md'
        }`}
        onClick={() => onSelect?.(product.id)}
      >
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {!isImageLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          
          <img
            src={product.imageUrl}
            alt={product.name}
            className={`w-full h-full object-cover transition-opacity ${
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsImageLoaded(true)}
          />
          
          {product.isNew && (
            <Badge className="absolute top-2 left-2 bg-green-500 hover:bg-green-600">
              New
            </Badge>
          )}
          
          {product.discountPercent && (
            <Badge className="absolute top-2 right-2 bg-red-500 hover:bg-red-600">
              -{product.discountPercent}%
            </Badge>
          )}
          
          <div className="absolute bottom-2 right-2 flex gap-1">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full bg-white/80 hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.(product.id);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            <Button
              size="icon"
              variant="secondary"
              className={`h-8 w-8 rounded-full ${
                isFavorite 
                  ? 'bg-red-100 text-red-500 hover:bg-red-200' 
                  : 'bg-white/80 hover:bg-white'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(product.id);
              }}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
        
        <CardContent className="p-4">
          <div className="mb-2">
            <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
            <p className="text-sm text-gray-500 truncate">{product.category}</p>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {product.discountPercent ? (
                <>
                  <span className="font-medium text-gray-900">
                    ${product.discountedPrice}
                  </span>
                  <span className="text-sm text-gray-500 line-through">
                    ${product.price}
                  </span>
                </>
              ) : (
                <span className="font-medium text-gray-900">
                  ${product.price}
                </span>
              )}
            </div>
            
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart?.(product.id);
              }}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
          
          {product.rating && (
            <div className="flex items-center mt-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating || 0)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-xs text-gray-500 ml-1">
                {product.rating} ({product.reviewCount || 0})
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

#### Visualization Result Component

### frontend/src/components/visualize/VisualizationResult.tsx
```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { 
  Download, 
  Share, 
  Save, 
  Heart, 
  Eye, 
  Copy,
  Mail,
  MessageCircle,
  Facebook,
  Twitter,
  Instagram
} from 'lucide-react';
import type { Visualization, Product } from '@/types';

interface VisualizationResultProps {
  visualization: Visualization;
  products: Product[];
  onSave: (name: string, description?: string) => void;
  onDownload: () => void;
  onShare: (platform: string) => void;
  isSaved?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function VisualizationResult({
  visualization,
  products,
  onSave,
  onDownload,
  onShare,
  isSaved = false,
  isFavorite = false,
  onToggleFavorite
}: VisualizationResultProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [visualizationName, setVisualizationName] = useState('');
  const [visualizationDescription, setVisualizationDescription] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  
  const handleSave = () => {
    if (visualizationName.trim()) {
      onSave(visualizationName, visualizationDescription);
      setSaveDialogOpen(false);
      setVisualizationName('');
      setVisualizationDescription('');
    }
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };
  
  const appliedProducts = visualization.appliedProducts || [];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-blue-500" />
          Your Visualization
        </CardTitle>
        <CardDescription>
          Review and save your room transformation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 rounded-lg overflow-hidden border">
          <img
            src={visualization.imageUrl}
            alt="Room Visualization"
            className="w-full h-auto"
          />
        </div>
        
        <div className="flex flex-wrap gap-3 mb-6">
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant={isSaved ? "outline" : "default"}>
                <Save className="h-4 w-4 mr-2" />
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Visualization</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={visualizationName}
                    onChange={(e) => setVisualizationName(e.target.value)}
                    placeholder="My Room Design"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={visualizationDescription}
                    onChange={(e) => setVisualizationDescription(e.target.value)}
                    placeholder="Add notes about your design..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!visualizationName.trim()}>
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          
          <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Your Design</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Share Link</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={window.location.href} readOnly />
                    <Button onClick={handleCopyLink} size="sm">
                      {copiedLink ? 'Copied!' : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label>Share on Social Media</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onShare('facebook')}
                      className="flex flex-col items-center py-2"
                    >
                      <Facebook className="h-5 w-5 mb-1" />
                      <span className="text-xs">Facebook</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onShare('twitter')}
                      className="flex flex-col items-center py-2"
                    >
                      <Twitter className="h-5 w-5 mb-1" />
                      <span className="text-xs">Twitter</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onShare('instagram')}
                      className="flex flex-col items-center py-2"
                    >
                      <Instagram className="h-5 w-5 mb-1" />
                      <span className="text-xs">Instagram</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onShare('message')}
                      className="flex flex-col items-center py-2"
                    >
                      <MessageCircle className="h-5 w-5 mb-1" />
                      <span className="text-xs">Message</span>
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label>Email</Label>
                  <div className="flex gap-2 mt-1">
                    <Input placeholder="Enter email address" />
                    <Button size="sm">
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {onToggleFavorite && (
            <Button 
              variant="outline" 
              onClick={onToggleFavorite}
              className={isFavorite ? "text-red-500 border-red-200" : ""}
            >
              <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
              {isFavorite ? 'Favorited' : 'Favorite'}
            </Button>
          )}
        </div>
        
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products">Applied Products</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="products" className="mt-4">
            {appliedProducts.length > 0 ? (
              <div className="space-y-4">
                {appliedProducts.map((applied) => {
                  const product = products.find(p => p.id === applied.productId);
                  if (!product) return null;
                  
                  return (
                    <div key={applied.productId} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{product.name}</h4>
                        <p className="text-sm text-gray-500 truncate">{product.category}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{applied.surfaceLabel}</Badge>
                          <span className="text-sm font-medium">
                            ${product.discountedPrice || product.price}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No products applied yet
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="details" className="mt-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Visualization Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p>{new Date(visualization.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Updated</p>
                    <p>{new Date(visualization.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Surfaces</p>
                    <p>{appliedProducts.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p>
                      <Badge variant={isSaved ? "default" : "secondary"}>
                        {isSaved ? "Saved" : "Draft"}
                      </Badge>
                    </p>
                  </div>
                </div>
              </div>
              
              {visualization.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-700">{visualization.description}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

#### API Client Library

### frontend/src/lib/api.ts
```typescript
import axios from 'axios';
import type { 
  Session, 
  Mask, 
  Product, 
  Visualization, 
  RefineRequest,
  AnalyzeResponse,
  VisualizationResponse
} from '@/types';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login or refresh token
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Upload API
export const uploadImage = async (file: File): Promise<{ sessionId: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

// Session API
export const getSession = async (sessionId: string): Promise<Session> => {
  const response = await api.get(`/api/sessions/${sessionId}`);
  return response.data;
};

// Analysis API
export const analyzeImage = async (
  sessionId: string, 
  imageUrl: string
): Promise<AnalyzeResponse> => {
  const response = await api.post('/api/analyze', {
    sessionId,
    imageUrl,
  });
  
  return response.data;
};

// Refinement API
export const refineMask = async (
  sessionId: string,
  maskId: string,
  refineData: RefineRequest
): Promise<{ masks: Mask[] }> => {
  const response = await api.post('/api/refine', {
    sessionId,
    maskId,
    ...refineData,
  });
  
  return response.data;
};

// Products API
export const getProducts = async (
  category?: string,
  type?: 'material' | 'product'
): Promise<Product[]> => {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (type) params.type = type;
  
  const response = await api.get('/api/products', { params });
  return response.data;
};

export const getProduct = async (productId: string): Promise<Product> => {
  const response = await api.get(`/api/products/${productId}`);
  return response.data;
};

// Visualization API
export const applyVisualization = async (
  sessionId: string,
  maskId: string,
  productImageUrl: string
): Promise<VisualizationResponse> => {
  const response = await api.post('/api/visualize', {
    sessionId,
    maskId,
    productImageUrl,
  });
  
  return response.data;
};

export const saveVisualization = async (
  sessionId: string,
  visualizationId: string,
  name?: string,
  description?: string
): Promise<Visualization> => {
  const response = await api.post('/api/save', {
    sessionId,
    visualizationId,
    name,
    description,
  });
  
  return response.data;
};

export const getVisualizations = async (
  sessionId?: string
): Promise<Visualization[]> => {
  const params: Record<string, string> = {};
  if (sessionId) params.sessionId = sessionId;
  
  const response = await api.get('/api/visualizations', { params });
  return response.data;
};

export const getVisualization = async (
  visualizationId: string
): Promise<Visualization> => {
  const response = await api.get(`/api/visualizations/${visualizationId}`);
  return response.data;
};

// User API
export const login = async (
  email: string,
  password: string
): Promise<{ token: string; user: any }> => {
  const response = await api.post('/api/auth/login', {
    email,
    password,
  });
  
  return response.data;
};

export const register = async (
  name: string,
  email: string,
  password: string
): Promise<{ token: string; user: any }> => {
  const response = await api.post('/api/auth/register', {
    name,
    email,
    password,
  });
  
  return response.data;
};

export const getUserProfile = async () => {
  const response = await api.get('/api/auth/profile');
  return response.data;
};

// Health check
export const healthCheck = async () => {
  const response = await api.get('/api/health');
  return response.data;
};
```

### 6. Backend (FastAPI in Python)

#### API Endpoints

### backend/app/api/analyze.py
```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import uuid
from ..core.config import settings
from ..core.security import get_current_active_user
from ..db.session import get_db
from ..models.user import User
from ..models.session import Session as SessionModel
from ..models.mask import Mask
from ..services.storage import StorageService
from ..services.image import ImageService
from ..ml.inference import run_segmentation
from ..schemas.analyze import AnalyzeRequest, AnalyzeResponse, MaskData

router = APIRouter()

@router.post("/", response_model=AnalyzeResponse)
async def analyze_image(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Analyze an uploaded image to generate segmentation masks.
    """
    # Get session from database
    session = db.query(SessionModel).filter(
        SessionModel.id == request.sessionId,
        SessionModel.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Run segmentation
    try:
        # In a production environment, this would be offloaded to a background worker
        # For simplicity, we're running it synchronously here
        masks_data = await run_segmentation(request.imageUrl)
        
        # Save masks to database
        mask_records = []
        for mask_data in masks_data:
            mask_record = Mask(
                id=str(uuid.uuid4()),
                session_id=request.sessionId,
                label=mask_data["label"],
                color=mask_data["color"],
                mask_url=mask_data["maskUrl"],
                area_percent=mask_data["areaPercent"],
                confidence=mask_data["confidence"]
            )
            db.add(mask_record)
            mask_records.append(mask_record)
        
        db.commit()
        
        # Convert mask records to response format
        masks_response = [
            MaskData(
                id=mask.id,
                label=mask.label,
                color=mask.color,
                maskUrl=mask.mask_url,
                areaPercent=mask.area_percent,
                confidence=mask.confidence
            )
            for mask in mask_records
        ]
        
        return AnalyzeResponse(
            sessionId=request.sessionId,
            masks=masks_response
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
```

### backend/app/api/upload.py
```python
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import os
from datetime import datetime
from ..core.config import settings
from ..core.security import get_current_active_user
from ..db.session import get_db
from ..models.user import User
from ..models.session import Session as SessionModel
from ..services.storage import StorageService
from ..schemas.upload import UploadResponse

router = APIRouter()

@router.post("/", response_model=UploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload an image for room visualization.
    """
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Validate file size (10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()  # Get size
    file.file.seek(0)  # Reset position
    
    if file_size > max_size:
        raise HTTPException(status_code=400, detail="File size must be less than 10MB")
    
    # Create a new session
    session_id = str(uuid.uuid4())
    
    # Generate file path
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{session_id}{file_extension}"
    file_path = f"uploads/{unique_filename}"
    
    # Save file to storage
    storage_service = StorageService()
    try:
        image_url = await storage_service.upload_file(
            file.file, 
            file_path, 
            content_type=file.content_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    
    # Get image dimensions (in a real implementation, you would use PIL or OpenCV)
    image_width = 1024  # Placeholder
    image_height = 768  # Placeholder
    
    # Create session record
    session = SessionModel(
        id=session_id,
        user_id=current_user.id,
        image_url=image_url,
        image_width=image_width,
        image_height=image_height,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(session)
    db.commit()
    
    return UploadResponse(
        sessionId=session_id,
        imageUrl=image_url,
        imageWidth=image_width,
        imageHeight=image_height
    )
```

### backend/app/api/visualize.py
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import uuid
from datetime import datetime
from ..core.config import settings
from ..core.security import get_current_active_user
from ..db.session import get_db
from ..models.user import User
from ..models.session import Session as SessionModel
from ..models.mask import Mask
from ..models.visualization import Visualization
from ..models.product import Product
from ..services.storage import StorageService
from ..services.image import ImageService
from ..schemas.visualize import VisualizeRequest, VisualizeResponse, AppliedProduct

router = APIRouter()

@router.post("/", response_model=VisualizeResponse)
async def apply_visualization(
    request: VisualizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Apply a product/material to a segmented surface.
    """
    # Get session from database
    session = db.query(SessionModel).filter(
        SessionModel.id == request.sessionId,
        SessionModel.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get mask from database
    mask = db.query(Mask).filter(
        Mask.id == request.maskId,
        Mask.session_id == request.sessionId
    ).first()
    
    if not mask:
        raise HTTPException(status_code=404, detail="Mask not found")
    
    # Get product from database (if productId is provided)
    product = None
    if hasattr(request, 'productId') and request.productId:
        product = db.query(Product).filter(Product.id == request.productId).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
    
    # Generate visualization
    image_service = ImageService()
    storage_service = StorageService()
    
    try:
        # Generate visualization image
        visualization_id = str(uuid.uuid4())
        file_extension = ".png"  # Always output as PNG
        visualization_filename = f"{visualization_id}{file_extension}"
        visualization_path = f"visualizations/{visualization_filename}"
        
        # Process image with mask and product
        visualization_image = await image_service.apply_visualization(
            original_image_url=session.image_url,
            mask_url=mask.mask_url,
            product_image_url=request.productImageUrl,
            mask_color=mask.color
        )
        
        # Save visualization to storage
        visualization_url = await storage_service.upload_file(
            visualization_image,
            visualization_path,
            content_type="image/png"
        )
        
        # Create visualization record
        applied_products = []
        if product:
            applied_product = AppliedProduct(
                productId=product.id,
                surfaceLabel=mask.label,
                productName=product.name,
                productPrice=product.price,
                productImage=product.image_url
            )
            applied_products.append(applied_product)
        
        visualization = Visualization(
            id=visualization_id,
            session_id=request.sessionId,
            image_url=visualization_url,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(visualization)
        db.commit()
        
        return VisualizeResponse(
            visualizationId=visualization_id,
            imageUrl=visualization_url,
            appliedProducts=applied_products
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visualization failed: {str(e)}")
```

### backend/app/api/refine.py
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime
from ..core.config import settings
from ..core.security import get_current_active_user
from ..db.session import get_db
from ..models.user import User
from ..models.session import Session as SessionModel
from ..models.mask import Mask
from ..services.storage import StorageService
from ..services.image import ImageService
from ..schemas.refine import RefineRequest, RefineResponse, MaskData

router = APIRouter()

@router.post("/", response_model=RefineResponse)
async def refine_mask(
    request: RefineRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Refine a segmentation mask using user input (clicks or scribbles).
    """
    # Get session from database
    session = db.query(SessionModel).filter(
        SessionModel.id == request.sessionId,
        SessionModel.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get mask from database
    mask = db.query(Mask).filter(
        Mask.id == request.maskId,
        Mask.session_id == request.sessionId
    ).first()
    
    if not mask:
        raise HTTPException(status_code=404, detail="Mask not found")
    
    # Refine mask
    image_service = ImageService()
    storage_service = StorageService()
    
    try:
        # Process mask refinement
        refined_mask_image = await image_service.refine_mask(
            original_image_url=session.image_url,
            mask_url=mask.mask_url,
            refine_data=request.dict()
        )
        
        # Save refined mask to storage
        mask_id = str(uuid.uuid4())
        file_extension = ".png"  # Always output as PNG
        mask_filename = f"{mask_id}{file_extension}"
        mask_path = f"masks/{mask_filename}"
        
        refined_mask_url = await storage_service.upload_file(
            refined_mask_image,
            mask_path,
            content_type="image/png"
        )
        
        # Update mask record
        mask.mask_url = refined_mask_url
        mask.updated_at = datetime.utcnow()
        
        db.commit()
        
        # Return updated mask
        mask_data = MaskData(
            id=mask.id,
            label=mask.label,
            color=mask.color,
            maskUrl=mask.mask_url,
            areaPercent=mask.area_percent,
            confidence=mask.confidence
        )
        
        return RefineResponse(
            sessionId=request.sessionId,
            masks=[mask_data]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mask refinement failed: {str(e)}")
```

### backend/app/api/products.py
```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.session import get_db
from ..models.product import Product
from ..schemas.product import Product as ProductSchema

router = APIRouter()

@router.get("/", response_model=List[ProductSchema])
async def get_products(
    category: Optional[str] = Query(None, description="Filter by category"),
    type: Optional[str] = Query(None, description="Filter by type (material or product)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records to return"),
    db: Session = Depends(get_db)
):
    """
    Get a list of products.
    """
    query = db.query(Product)
    
    if category:
        query = query.filter(Product.category == category)
    
    if type:
        query = query.filter(Product.type == type)
    
    products = query.offset(skip).limit(limit).all()
    return products

@router.get("/{product_id}", response_model=ProductSchema)
async def get_product(
    product_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a specific product by ID.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return product
```

### backend/app/api/save.py
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from ..core.config import settings
from ..core.security import get_current_active_user
from ..db.session import get_db
from ..models.user import User
from ..models.session import Session as SessionModel
from ..models.visualization import Visualization
from ..schemas.save import SaveRequest, SaveResponse

router = APIRouter()

@router.post("/", response_model=SaveResponse)
async def save_visualization(
    request: SaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Save a visualization with optional name and description.
    """
    # Get session from database
    session = db.query(SessionModel).filter(
        SessionModel.id == request.sessionId,
        SessionModel.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get visualization from database
    visualization = db.query(Visualization).filter(
        Visualization.id == request.visualizationId,
        Visualization.session_id == request.sessionId
    ).first()
    
    if not visualization:
        raise HTTPException(status_code=404, detail="Visualization not found")
    
    # Update visualization with save details
    visualization.name = request.name
    visualization.description = request.description
    visualization.is_saved = True
    visualization.updated_at = datetime.utcnow()
    
    db.commit()
    
    return SaveResponse(
        visualizationId=visualization.id,
        name=visualization.name,
        description=visualization.description,
        savedAt=visualization.updated_at
    )
```

### backend/app/api/health.py
```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..ml.inference import model_loaded

router = APIRouter()

@router.get("/")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint.
    """
    try:
        # Check database connection
        db.execute("SELECT 1")
        
        # Check if ML model is loaded
        models_ready = model_loaded()
        
        return {
            "status": "healthy",
            "database": "connected",
            "models": "loaded" if models_ready else "not_loaded"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
```

#### Model Server

### backend/ml/model_server.py
```python
import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import Dict, List, Any
import torch
from .inference import (
    load_fastsam_model,
    run_segmentation,
    refine_mask_with_points
)

app = FastAPI(title="AI Room Visualizer Model Server", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variable
model = None

@app.on_event("startup")
async def startup_event():
    """Load the model on startup."""
    global model
    try:
        model = load_fastsam_model()
        print("Model loaded successfully")
    except Exception as e:
        print(f"Failed to load model: {e}")
        # In a production environment, you might want to handle this more gracefully

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/segment")
async def segment_image(request: Dict[str, Any]):
    """
    Segment an image and return masks.
    
    Expected request format:
    {
        "image_url": "https://example.com/image.jpg",
        "options": {
            "confidence": 0.5,
            "iou_threshold": 0.7
        }
    }
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    image_url = request.get("image_url")
    if not image_url:
        raise HTTPException(status_code=400, detail="image_url is required")
    
    options = request.get("options", {})
    confidence = options.get("confidence", 0.5)
    iou_threshold = options.get("iou_threshold", 0.7)
    
    try:
        # Run segmentation
        masks = await run_segmentation(model, image_url, confidence, iou_threshold)
        
        return {
            "success": True,
            "masks": masks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Segmentation failed: {str(e)}")

@app.post("/refine")
async def refine_segmentation(request: Dict[str, Any]):
    """
    Refine a segmentation mask using user input.
    
    Expected request format:
    {
        "image_url": "https://example.com/image.jpg",
        "mask_url": "https://example.com/mask.png",
        "points": [
            {"x": 100, "y": 200, "label": 1},
            {"x": 150, "y": 250, "label": 0}
        ]
    }
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    image_url = request.get("image_url")
    mask_url = request.get("mask_url")
    points = request.get("points", [])
    
    if not image_url or not mask_url:
        raise HTTPException(status_code=400, detail="image_url and mask_url are required")
    
    if not points:
        raise HTTPException(status_code=400, detail="points are required")
    
    try:
        # Run mask refinement
        refined_mask = await refine_mask_with_points(
            model, image_url, mask_url, points
        )
        
        return {
            "success": True,
            "mask_url": refined_mask
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mask refinement failed: {str(e)}")

if __name__ == "__main__":
    # Determine if CUDA is available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Run the server
    uvicorn.run(
        "model_server:app",
        host="0.0.0.0",
        port=8001,
        workers=1,
        log_level="info"
    )
```

### backend/ml/inference.py
```python
import os
import io
import requests
import numpy as np
from PIL import Image
import torch
from fastsam import FastSAM, FastSAMPrompt
import cv2
import uuid
from typing import Dict, List, Any, Tuple, Optional

# Global model variable
_model = None

def load_fastsam_model():
    """Load the FastSAM model."""
    global _model
    
    if _model is not None:
        return _model
    
    # Download model weights if not present
    model_path = "./weights/FastSAM-x.pt"
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    if not os.path.exists(model_path):
        print("Downloading FastSAM model weights...")
        url = "https://github.com/CASIA-IVA-Lab/FastSAM/releases/download/v1.0/FastSAM-x.pt"
        response = requests.get(url, stream=True)
        total_size = int(response.headers.get('content-length', 0))
        
        with open(model_path, 'wb') as f:
            downloaded = 0
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    print(f"Downloading: {downloaded / total_size * 100:.1f}%", end='\r')
            print()
    
    # Load model
    device = "cuda" if torch.cuda.is_available() else "cpu"
    _model = FastSAM(model_path)
    print(f"Model loaded on {device}")
    
    return _model

def model_loaded():
    """Check if the model is loaded."""
    return _model is not None

async def run_segmentation(
    image_url: str, 
    confidence: float = 0.5, 
    iou_threshold: float = 0.7
) -> List[Dict[str, Any]]:
    """
    Run segmentation on an image.
    
    Args:
        image_url: URL of the image to segment
        confidence: Confidence threshold for detections
        iou_threshold: IoU threshold for non-maximum suppression
        
    Returns:
        List of mask dictionaries
    """
    model = load_fastsam_model()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    try:
        # Download image
        response = requests.get(image_url)
        image = Image.open(io.BytesIO(response.content))
        
        # Run inference
        results = model(
            image_url, 
            device=device, 
            retina_masks=True, 
            imgsz=1024, 
            conf=confidence, 
            iou=iou_threshold
        )
        
        # Process results
        prompt_process = FastSAMPrompt(image_url, results, device=device)
        
        # Get all masks
        masks = prompt_process.everything_prompt()
        
        # Convert to our format
        output_masks = []
        for i, mask in enumerate(masks):
            # Generate a color for the mask
            color = f"#{np.random.randint(0, 0xFFFFFF):06x}"
            
            # Calculate area percentage
            mask_area = np.sum(mask)
            total_area = mask.shape[0] * mask.shape[1]
            area_percent = (mask_area / total_area) * 100
            
            # Save mask to a temporary file (in a real implementation, you'd upload to storage)
            mask_image = Image.fromarray((mask * 255).astype(np.uint8))
            mask_filename = f"{uuid.uuid4()}.png"
            mask_path = f"/tmp/{mask_filename}"
            mask_image.save(mask_path)
            
            # In a real implementation, you would upload this to your storage service
            # and get a URL back. For now, we'll use a placeholder.
            mask_url = f"https://example.com/masks/{mask_filename}"
            
            output_masks.append({
                "id": str(uuid.uuid4()),
                "label": f"Object {i+1}",
                "color": color,
                "maskUrl": mask_url,
                "areaPercent": round(area_percent, 2),
                "confidence": confidence
            })
        
        return output_masks
    
    except Exception as e:
        print(f"Error in segmentation: {e}")
        raise e

async def refine_mask_with_points(
    model,
    image_url: str,
    mask_url: str,
    points: List[Dict[str, Any]]
) -> str:
    """
    Refine a mask using point prompts.
    
    Args:
        model: The loaded FastSAM model
        image_url: URL of the original image
        mask_url: URL of the initial mask
        points: List of points with labels (1 for positive, 0 for negative)
        
    Returns:
        URL of the refined mask
    """
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    try:
        # Download image and mask
        image_response = requests.get(image_url)
        image = Image.open(io.BytesIO(image_response.content))
        
        mask_response = requests.get(mask_url)
        mask = Image.open(io.BytesIO(mask_response.content))
        mask = np.array(mask) > 0  # Convert to binary mask
        
        # Convert points to the format expected by FastSAM
        point_coords = []
        point_labels = []
        
        for point in points:
            point_coords.append([point["x"], point["y"]])
            point_labels.append(point["label"])
        
        # Run refinement
        prompt_process = FastSAMPrompt(image_url, None, device=device)
        
        # In a real implementation, you would use the point prompts to refine the mask
        # For now, we'll simulate the refinement
        
        # For demonstration, we'll dilate the mask for positive points and erode for negative points
        kernel = np.ones((5,5), np.uint8)
        
        for point, label in zip(point_coords, point_labels):
            if label == 1:  # Positive point - add to mask
                # Create a small circle around the point
                y, x = int(point[1]), int(point[0])
                cv2.circle(mask, (x, y), 10, 1, -1)
            else:  # Negative point - remove from mask
                # Create a small circle around the point
                y, x = int(point[1]), int(point[0])
                cv2.circle(mask, (x, y), 10, 0, -1)
        
        # Apply morphological operations to smooth the mask
        mask = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        
        # Save refined mask
        refined_mask_image = Image.fromarray((mask * 255).astype(np.uint8))
        refined_mask_filename = f"{uuid.uuid4()}.png"
        refined_mask_path = f"/tmp/{refined_mask_filename}"
        refined_mask_image.save(refined_mask_path)
        
        # In a real implementation, you would upload this to your storage service
        # and get a URL back. For now, we'll use a placeholder.
        refined_mask_url = f"https://example.com/masks/{refined_mask_filename}"
        
        return refined_mask_url
    
    except Exception as e:
        print(f"Error in mask refinement: {e}")
        raise e
```

#### Image Processing Pipeline

### backend/ml/processing.py
```python
import cv2
import numpy as np
import requests
from PIL import Image, ImageDraw, ImageFilter
import io
import uuid
from typing import Dict, List, Any, Tuple, Optional
import asyncio
from .inference import load_fastsam_model

class ImageService:
    """Service for processing images and applying visualizations."""
    
    def __init__(self):
        self.model = load_fastsam_model()
    
    async def apply_visualization(
        self,
        original_image_url: str,
        mask_url: str,
        product_image_url: str,
        mask_color: str = "#3B82F6"
    ) -> io.BytesIO:
        """
        Apply a product/material to a segmented surface.
        
        Args:
            original_image_url: URL of the original room image
            mask_url: URL of the segmentation mask
            product_image_url: URL of the product/material image
            mask_color: Color of the mask (hex)
            
        Returns:
            BytesIO object containing the visualization image
        """
        try:
            # Download images
            original_response = requests.get(original_image_url)
            original_image = Image.open(io.BytesIO(original_response.content))
            
            mask_response = requests.get(mask_url)
            mask_image = Image.open(io.BytesIO(mask_response.content))
            
            product_response = requests.get(product_image_url)
            product_image = Image.open(io.BytesIO(product_response.content))
            
            # Convert to numpy arrays for processing
            original_np = np.array(original_image)
            mask_np = np.array(mask_image)
            
            # Ensure mask is binary
            if len(mask_np.shape) > 2:
                mask_np = mask_np[:, :, 0]  # Take first channel if RGB
            mask_np = (mask_np > 128).astype(np.uint8) * 255
            
            # Apply perspective correction if needed
            # In a real implementation, you would detect the perspective of the surface
            # and apply a transformation to the product image to match
            
            # Resize product to match the size of the mask
            product_image = product_image.resize((original_image.width, original_image.height))
            product_np = np.array(product_image)
            
            # Create a copy of the original image
            result_np = original_np.copy()
            
            # Apply the product to the masked area
            for c in range(3):  # For each RGB channel
                result_np[:, :, c] = np.where(
                    mask_np == 255,
                    product_np[:, :, c],
                    result_np[:, :, c]
                )
            
            # Blend the edges for a more natural look
            # Create a feathered mask
            feathered_mask = cv2.GaussianBlur(mask_np, (15, 15), 0)
            feathered_mask = feathered_mask / 255.0
            
            # Apply feathered blending
            for c in range(3):
                result_np[:, :, c] = (
                    result_np[:, :, c] * (1 - feathered_mask) + 
                    product_np[:, :, c] * feathered_mask
                ).astype(np.uint8)
            
            # Convert back to PIL Image
            result_image = Image.fromarray(result_np)
            
            # Save to BytesIO
            result_bytes = io.BytesIO()
            result_image.save(result_bytes, format="PNG")
            result_bytes.seek(0)
            
            return result_bytes
        
        except Exception as e:
            print(f"Error applying visualization: {e}")
            raise e
    
    async def refine_mask(
        self,
        original_image_url: str,
        mask_url: str,
        refine_data: Dict[str, Any]
    ) -> io.BytesIO:
        """
        Refine a segmentation mask using user input.
        
        Args:
            original_image_url: URL of the original image
            mask_url: URL of the initial mask
            refine_data: Dictionary containing refinement data
            
        Returns:
            BytesIO object containing the refined mask
        """
        try:
            # Download images
            original_response = requests.get(original_image_url)
            original_image = Image.open(io.BytesIO(original_response.content))
            
            mask_response = requests.get(mask_url)
            mask_image = Image.open(io.BytesIO(mask_response.content))
            
            # Convert to numpy arrays
            original_np = np.array(original_image)
            mask_np = np.array(mask_image)
            
            # Ensure mask is binary
            if len(mask_np.shape) > 2:
                mask_np = mask_np[:, :, 0]  # Take first channel if RGB
            mask_np = (mask_np > 128).astype(np.uint8) * 255
            
            # Process refinement data
            refine_type = refine_data.get("type")
            
            if refine_type == "point":
                # Single point refinement
                x = refine_data.get("x")
                y = refine_data.get("y")
                label = refine_data.get("label")  # 1 for positive, 0 for negative
                
                if x is not None and y is not None:
                    # Create a small circle around the point
                    cv2.circle(mask_np, (int(x), int(y)), 10, 255 if label == 1 else 0, -1)
            
            elif refine_type == "scribble":
                # Scribble refinement
                points = refine_data.get("points", [])
                label = refine_data.get("label")  # 1 for positive, 0 for negative
                
                if points:
                    # Draw lines between consecutive points
                    for i in range(len(points) - 1):
                        pt1 = (int(points[i][0]), int(points[i][1]))
                        pt2 = (int(points[i+1][0]), int(points[i+1][1]))
                        cv2.line(mask_np, pt1, pt2, 255 if label == 1 else 0, 10)
            
            # Apply morphological operations to smooth the mask
            kernel = np.ones((5,5), np.uint8)
            mask_np = cv2.morphologyEx(mask_np, cv2.MORPH_OPEN, kernel)
            mask_np = cv2.morphologyEx(mask_np, cv2.MORPH_CLOSE, kernel)
            
            # Convert back to PIL Image
            refined_mask = Image.fromarray(mask_np)
            
            # Save to BytesIO
            result_bytes = io.BytesIO()
            refined_mask.save(result_bytes, format="PNG")
            result_bytes.seek(0)
            
            return result_bytes
        
        except Exception as e:
            print(f"Error refining mask: {e}")
            raise e
    
    async def detect_perspective(
        self,
        image_url: str,
        mask_url: str
    ) -> List[Tuple[int, int]]:
        """
        Detect the perspective of a surface in the image.
        
        Args:
            image_url: URL of the original image
            mask_url: URL of the segmentation mask
            
        Returns:
            List of four points representing the corners of the surface
        """
        try:
            # Download images
            image_response = requests.get(image_url)
            image = Image.open(io.BytesIO(image_response.content))
            
            mask_response = requests.get(mask_url)
            mask_image = Image.open(io.BytesIO(mask_response.content))
            
            # Convert to numpy arrays
            image_np = np.array(image)
            mask_np = np.array(mask_image)
            
            # Ensure mask is binary
            if len(mask_np.shape) > 2:
                mask_np = mask_np[:, :, 0]  # Take first channel if RGB
            mask_np = (mask_np > 128).astype(np.uint8) * 255
            
            # Find contours
            contours, _ = cv2.findContours(mask_np, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                return []
            
            # Find the largest contour
            largest_contour = max(contours, key=cv2.contourArea)
            
            # Approximate the contour to a polygon
            epsilon = 0.02 * cv2.arcLength(largest_contour, True)
            approx = cv2.approxPolyDP(largest_contour, epsilon, True)
            
            # If we have 4 points, we assume it's a rectangle
            if len(approx) == 4:
                # Return the four corners
                corners = [point[0] for point in approx]
                return corners
            
            # If we don't have 4 points, find the minimum area rectangle
            rect = cv2.minAreaRect(largest_contour)
            box = cv2.boxPoints(rect)
            box = np.int0(box)
            
            # Return the four corners of the rectangle
            corners = [point for point in box]
            return corners
        
        except Exception as e:
            print(f"Error detecting perspective: {e}")
            return []
    
    async def apply_perspective_transform(
        self,
        product_image_url: str,
        corners: List[Tuple[int, int]],
        output_size: Tuple[int, int]
    ) -> io.BytesIO:
        """
        Apply a perspective transform to a product image.
        
        Args:
            product_image_url: URL of the product image
            corners: List of four points representing the destination corners
            output_size: Size of the output image (width, height)
            
        Returns:
            BytesIO object containing the transformed image
        """
        try:
            # Download product image
            product_response = requests.get(product_image_url)
            product_image = Image.open(io.BytesIO(product_response.content))
            
            # Convert to numpy array
            product_np = np.array(product_image)
            
            # Define source points (corners of the product image)
            h, w = product_np.shape[:2]
            src_points = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
            
            # Define destination points (corners of the surface)
            dst_points = np.float32(corners)
            
            # Calculate perspective transform matrix
            matrix = cv2.getPerspectiveTransform(src_points, dst_points)
            
            # Apply perspective transform
            transformed = cv2.warpPerspective(
                product_np, 
                matrix, 
                output_size, 
                flags=cv2.INTER_LINEAR,
                borderMode=cv2.BORDER_CONSTANT,
                borderValue=(0, 0, 0, 0)
            )
            
            # Convert back to PIL Image
            transformed_image = Image.fromarray(transformed)
            
            # Save to BytesIO
            result_bytes = io.BytesIO()
            transformed_image.save(result_bytes, format="PNG")
            result_bytes.seek(0)
            
            return result_bytes
        
        except Exception as e:
            print(f"Error applying perspective transform: {e}")
            raise e
```

### 7. Database & Persistence

#### PostgreSQL Schema

### backend/db/migrations/001_initial_schema.py
```python
"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2023-07-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('is_superuser', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    
    # Create products table
    op.create_table(
        'products',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=True),
        sa.Column('price', sa.Float(), nullable=True),
        sa.Column('discounted_price', sa.Float(), nullable=True),
        sa.Column('discount_percent', sa.Integer(), nullable=True),
        sa.Column('image_url', sa.String(length=500), nullable=False),
        sa.Column('rating', sa.Float(), nullable=True),
        sa.Column('review_count', sa.Integer(), nullable=True),
        sa.Column('is_new', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_featured', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create sessions table
    op.create_table(
        'sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('image_url', sa.String(length=500), nullable=False),
        sa.Column('image_width', sa.Integer(), nullable=True),
        sa.Column('image_height', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create masks table
    op.create_table(
        'masks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('label', sa.String(length=100), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=False),
        sa.Column('mask_url', sa.String(length=500), nullable=False),
        sa.Column('area_percent', sa.Float(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create visualizations table
    op.create_table(
        'visualizations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(length=500), nullable=False),
        sa.Column('is_saved', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_favorite', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create applied_products junction table
    op.create_table(
        'applied_products',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('visualization_id', sa.String(length=36), nullable=False),
        sa.Column('product_id', sa.String(length=36), nullable=False),
        sa.Column('mask_id', sa.String(length=36), nullable=False),
        sa.Column('surface_label', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['visualization_id'], ['visualizations.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['mask_id'], ['masks.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create user_favorites junction table
    op.create_table(
        'user_favorites',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('visualization_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['visualization_id'], ['visualizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('user_favorites')
    op.drop_table('applied_products')
    op.drop_table('visualizations')
    op.drop_table('masks')
    op.drop_table('sessions')
    op.drop_table('products')
    op.drop_table('users')
```

#### Database Models

### backend/app/models/user.py
```python
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from ..db.session import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### backend/app/models/session.py
```python
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from ..db.session import Base

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    image_width = Column(Integer, nullable=True)
    image_height = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    masks = relationship("Mask", back_populates="session", cascade="all, delete-orphan")
    visualizations = relationship("Visualization", back_populates="session", cascade="all, delete-orphan")
```

### backend/app/models/product.py
```python
from sqlalchemy import Column, String, Text, Float, Integer, Boolean, DateTime
import uuid
from datetime import datetime
from ..db.session import Base

class Product(Base):
    __tablename__ = "products"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    type = Column(String(50), nullable=True)  # 'material' or 'product'
    price = Column(Float, nullable=True)
    discounted_price = Column(Float, nullable=True)
    discount_percent = Column(Integer, nullable=True)
    image_url = Column(String(500), nullable=False)
    rating = Column(Float, nullable=True)
    review_count = Column(Integer, nullable=True)
    is_new = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### backend/app/models/mask.py
```python
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from ..db.session import Base

class Mask(Base):
    __tablename__ = "masks"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False)
    label = Column(String(100), nullable=False)
    color = Column(String(7), nullable=False)  # Hex color code
    mask_url = Column(String(500), nullable=False)
    area_percent = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="masks")
    applied_products = relationship("AppliedProduct", back_populates="mask")
```

### backend/app/models/visualization.py
```python
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from ..db.session import Base

class Visualization(Base):
    __tablename__ = "visualizations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False)
    name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=False)
    is_saved = Column(Boolean, default=False)
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="visualizations")
    applied_products = relationship("AppliedProduct", back_populates="visualization")
    user_favorites = relationship("UserFavorite", back_populates="visualization")
```

### backend/app/models/applied_product.py
```python
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from ..db.session import Base

class AppliedProduct(Base):
    __tablename__ = "applied_products"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    visualization_id = Column(String(36), ForeignKey("visualizations.id"), nullable=False)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    mask_id = Column(String(36), ForeignKey("masks.id"), nullable=False)
    surface_label = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    visualization = relationship("Visualization", back_populates="applied_products")
    product = relationship("Product")
    mask = relationship("Mask", back_populates="applied_products")
```

### backend/app/models/user_favorite.py
```python
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from ..db.session import Base

class UserFavorite(Base):
    __tablename__ = "user_favorites"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    visualization_id = Column(String(36), ForeignKey("visualizations.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    visualization = relationship("Visualization", back_populates="user_favorites")
```

#### Database Connection

### backend/app/db/session.py
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Get database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/ai_room_visualizer")

# Create engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### Environment Variables

### backend/.env.example
```
# Database
DATABASE_URL=postgresql://postgres:password@localhost/ai_room_visualizer

# Storage (MinIO/S3)
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET_NAME=ai-room-visualizer
STORAGE_REGION=us-east-1

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Model Server
MODEL_SERVER_URL=http://localhost:8001

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Email (for notifications)
SMTP_SERVER=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your-email@example.com
SMTP_PASSWORD=your-email-password
EMAILS_FROM_EMAIL=noreply@example.com
```

### 8. Dev Environment & Local Run

#### Dockerfile for Frontend

### frontend/Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Dockerfile for Backend

### backend/Dockerfile
```dockerfile
# Base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Docker Compose

### infrastructure/docker/docker-compose.yml
```yaml
version: '3.8'

services:
  # Frontend (Next.js)
  frontend:
    build:
      context: ../../frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
    networks:
      - app-network

  # Backend (FastAPI)
  backend:
    build:
      context: ../../backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/ai_room_visualizer
      - STORAGE_ENDPOINT=http://minio:9000
      - STORAGE_ACCESS_KEY=minioadmin
      - STORAGE_SECRET_KEY=minioadmin
      - STORAGE_BUCKET_NAME=ai-room-visualizer
      - MODEL_SERVER_URL=http://model-server:8001
    depends_on:
      - postgres
      - minio
      - model-server
    volumes:
      - ../../backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    networks:
      - app-network

  # Model Server
  model-server:
    build:
      context: ../../backend
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/ai_room_visualizer
    volumes:
      - ../../backend:/app
    command: python -m ml.model_server
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    networks:
      - app-network

  # PostgreSQL
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=ai_room_visualizer
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ../../backend/db/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    networks:
      - app-network

  # MinIO (S3-compatible storage)
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    networks:
      - app-network

  # Redis (for caching and task queue)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - app-network

volumes:
  postgres-data:
  minio-data:

networks:
  app-network:
    driver: bridge
```

### infrastructure/docker/.env
```
# Database
POSTGRES_DB=ai_room_visualizer
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Storage
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BUCKET_NAME=ai-room-visualizer

# Security
SECRET_KEY=your-secret-key-here
```

#### Bootstrap Script

### scripts/bootstrap.sh
```bash
#!/bin/bash

# Exit on error
set -e

echo "🚀 Setting up AI Room Visualizer development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p infrastructure/docker/minio-data
mkdir -p infrastructure/docker/postgres-data

# Copy environment files
echo "📋 Setting up environment files..."
cp infrastructure/docker/.env.example infrastructure/docker/.env
cp backend/.env.example backend/.env

# Build and start services
echo "🏗️ Building and starting services..."
cd infrastructure/docker
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose exec backend alembic upgrade head

# Seed database with sample data
echo "🌱 Seeding database with sample data..."
docker-compose exec backend python scripts/seed.py

echo "✅ Setup complete!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 API Docs: http://localhost:8000/docs"
echo "💾 MinIO Console: http://localhost:9001"
echo ""
echo "To stop the services, run: cd infrastructure/docker && docker-compose down"
echo "To view logs, run: cd infrastructure/docker && docker-compose logs -f [service]"
```

### scripts/seed.py
```python
import asyncio
import sys
import os
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.models.user import User
from app.models.product import Product
from app.core.security import get_password_hash

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost/ai_room_visualizer")

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Create session factory
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed_users():
    async with AsyncSessionLocal() as session:
        # Check if admin user already exists
        admin_user = await session.execute(
            User.__table__.select().where(User.email == "admin@example.com")
        )
        admin_user = admin_user.fetchone()
        
        if not admin_user:
            # Create admin user
            admin_user = User(
                email="admin@example.com",
                name="Admin User",
                hashed_password=get_password_hash("password"),
                is_active=True,
                is_superuser=True
            )
            session.add(admin_user)
            await session.commit()
            print("✅ Created admin user")
        else:
            print("ℹ️ Admin user already exists")
        
        # Check if demo user already exists
        demo_user = await session.execute(
            User.__table__.select().where(User.email == "demo@example.com")
        )
        demo_user = demo_user.fetchone()
        
        if not demo_user:
            # Create demo user
            demo_user = User(
                email="demo@example.com",
                name="Demo User",
                hashed_password=get_password_hash("password"),
                is_active=True,
                is_superuser=False
            )
            session.add(demo_user)
            await session.commit()
            print("✅ Created demo user")
        else:
            print("ℹ️ Demo user already exists")

async def seed_products():
    async with AsyncSessionLocal() as session:
        # Check if products already exist
        products_count = await session.execute(
            "SELECT COUNT(*) FROM products"
        )
        products_count = products_count.fetchone()[0]
        
        if products_count > 0:
            print("ℹ️ Products already exist")
            return
        
        # Sample products
        products = [
            {
                "name": "Modern White Paint",
                "description": "Premium interior paint with a smooth, durable finish",
                "category": "Paint",
                "type": "material",
                "price": 45.99,
                "image_url": "https://example.com/products/white-paint.jpg",
                "rating": 4.5,
                "review_count": 128,
                "is_new": True
            },
            {
                "name": "Hardwood Flooring",
                "description": "Solid oak hardwood flooring with a natural finish",
                "category": "Flooring",
                "type": "material",
                "price": 8.99,
                "image_url": "https://example.com/products/hardwood-flooring.jpg",
                "rating": 4.7,
                "review_count": 89,
                "is_featured": True
            },
            {
                "name": "Modern Sofa",
                "description": "Contemporary 3-seater sofa with premium fabric",
                "category": "Furniture",
                "type": "product",
                "price": 899.99,
                "discounted_price": 799.99,
                "discount_percent": 11,
                "image_url": "https://example.com/products/modern-sofa.jpg",
                "rating": 4.3,
                "review_count": 56
            },
            {
                "name": "Ceramic Wall Tiles",
                "description": "White ceramic tiles for bathrooms and kitchens",
                "category": "Tiles",
                "type": "material",
                "price": 3.49,
                "image_url": "https://example.com/products/ceramic-tiles.jpg",
                "rating": 4.2,
                "review_count": 42
            },
            {
                "name": "Ceiling Lamp",
                "description": "Modern LED ceiling lamp with dimmable light",
                "category": "Lighting",
                "type": "product",
                "price": 129.99,
                "image_url": "https://example.com/products/ceiling-lamp.jpg",
                "rating": 4.6,
                "review_count": 73,
                "is_new": True
            }
        ]
        
        for product_data in products:
            product = Product(**product_data)
            session.add(product)
        
        await session.commit()
        print(f"✅ Created {len(products)} products")

async def main():
    print("🌱 Seeding database...")
    await seed_users()
    await seed_products()
    print("✅ Database seeding complete!")

if __name__ == "__main__":
    asyncio.run(main())
```

### 9. Deployment

#### Production Recommendations

For production deployment, we recommend the following setup:

1. **Frontend (Next.js)**: Deploy on Vercel or Netlify for optimal performance and automatic scaling.
   - Vercel is preferred for Next.js applications as it's built by the same team.
   - Configure environment variables for the API URL and any other frontend-specific settings.
   - Enable automatic deployments from your main branch.

2. **Backend (FastAPI)**: Deploy on a cloud service like Railway, Render, or a self-hosted VPS.
   - Railway and Render offer simple deployment with Docker support.
   - For larger scale, consider Kubernetes on AWS, GCP, or Azure.
   - Configure environment variables for database connection, storage, and security.

3. **Model Server**: Deploy on a GPU-enabled service for optimal inference performance.
   - Options include AWS SageMaker, GCP AI Platform, or specialized services like Replicate.
   - For open-source alternatives, consider using a dedicated GPU server with a FastAPI wrapper.

4. **Database**: Use a managed PostgreSQL service like Amazon RDS, Google Cloud SQL, or Heroku Postgres.
   - These services handle backups, scaling, and maintenance automatically.
   - Configure connection pooling for better performance.

5. **Storage**: Use a cloud storage service like Amazon S3, Google Cloud Storage, or DigitalOcean Spaces.
   - Configure a CDN for faster content delivery.
   - Set up lifecycle policies for automatic cleanup of old files.

6. **Caching**: Use Redis or Memcached for caching and session storage.
   - Consider managed services like Amazon ElastiCache or Google Cloud Memorystore.

7. **Monitoring**: Set up logging and monitoring with tools like:
   - Sentry for error tracking
   - Prometheus + Grafana for metrics
   - ELK stack (Elasticsearch, Logstash, Kibana) for log aggregation

#### CI/CD with GitHub Actions

### .github/workflows/ci.yml
```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      working-directory: ./frontend
      run: npm ci
    
    - name: Run linter
      working-directory: ./frontend
      run: npm run lint
    
    - name: Run tests
      working-directory: ./frontend
      run: npm run test
    
    - name: Build frontend
      working-directory: ./frontend
      run: npm run build

  test-backend:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
        cache: 'pip'
        cache-dependency-path: backend/requirements.txt
    
    - name: Install dependencies
      working-directory: ./backend
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    
    - name: Run linter
      working-directory: ./backend
      run: flake8 .
    
    - name: Run type checker
      working-directory: ./backend
      run: mypy .
    
    - name: Run tests
      working-directory: ./backend
      run: |
        pytest --cov=app --cov-report=xml
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml
        flags: backend
        name: codecov-backend

  build-and-push-docker:
    needs: [test-frontend, test-backend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push frontend
      uses: docker/build-push-action@v4
      with:
        context: ./frontend
        push: true
        tags: ${{ secrets.DOCKER_USERNAME }}/ai-room-visualizer-frontend:latest
        cache-from: type=gha
        cache-to: type=gha,mode=max
    
    - name: Build and push backend
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        push: true
        tags: ${{ secrets.DOCKER_USERNAME }}/ai-room-visualizer-backend:latest
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

### .github/workflows/deploy.yml
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      working-directory: ./frontend
      run: npm ci
    
    - name: Build frontend
      working-directory: ./frontend
      run: npm run build
      env:
        NEXT_PUBLIC_API_URL: ${{ secrets.PRODUCTION_API_URL }}
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        working-directory: ./frontend
        vercel-args: '--prod'

  deploy-backend:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
    
    - name: Deploy to Render
      uses: johnbeynon/render-deploy-action@v0.0.8
      with:
        service-id: ${{ secrets.RENDER_SERVICE_ID }}
        api-key: ${{ secrets.RENDER_API_KEY }}
        wait-for-deploy: true
```

#### Cost & Scaling Trade-offs

1. **Infrastructure Costs**:
   - **Development**: Minimal cost using local development with Docker Compose.
   - **Production**: 
     - Frontend: Vercel Hobby plan ($0-20/month depending on traffic)
     - Backend: Render Starter plan ($7/month) or similar
     - Database: Managed PostgreSQL (~$15-50/month depending on size)
     - Storage: S3 or similar (~$5-20/month depending on usage)
     - Model Server: GPU instance (~$300-1000/month depending on GPU type)

2. **Scaling Strategies**:
   - **Frontend**: Vercel automatically scales based on traffic.
   - **Backend**: Use horizontal scaling with a load balancer. Consider auto-scaling based on CPU/memory usage.
   - **Model Server**: Use queue-based processing with multiple workers. Scale based on queue length.
   - **Database**: Use read replicas for read-heavy workloads. Consider connection pooling.
   - **Caching**: Implement Redis for caching frequent requests and session data.

3. **Optimization Techniques**:
   - **Model Optimization**: Use ONNX or TensorRT for faster inference.
   - **Image Processing**: Implement lazy loading and progressive image rendering.
   - **Database**: Optimize queries and use indexing for frequently accessed data.
   - **CDN**: Use a CDN for static assets and images to reduce latency.

4. **Cost-Saving Measures**:
   - **Spot Instances**: Use spot instances for non-critical workloads like batch processing.
   - **Reserved Instances**: Consider reserved instances for predictable workloads.
   - **Autoscaling**: Implement autoscaling to scale down during off-peak hours.
   - **Caching**: Aggressive caching can reduce database and compute costs.

### 10. Testing & QA

#### Frontend Tests

### frontend/src/components/__tests__/Upload.test.tsx
```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import UploadPage from '../app/upload/page';

// Mock the API module
jest.mock('@/lib/api', () => ({
  uploadImage: jest.fn(),
}));

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('UploadPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders upload page correctly', () => {
    render(
      <BrowserRouter>
        <UploadPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Upload Your Room Photo')).toBeInTheDocument();
    expect(screen.getByText('Transform your space with our AI-powered visualization tool')).toBeInTheDocument();
    expect(screen.getByText('Upload & Analyze')).toBeInTheDocument();
  });

  test('allows file selection', async () => {
    const { uploadImage } = require('@/lib/api');
    uploadImage.mockResolvedValue({ sessionId: 'test-session-id' });

    render(
      <BrowserRouter>
        <UploadPage />
      </BrowserRouter>
    );

    const fileInput = screen.getByLabelText(/select image/i, { selector: 'input[type="file"]' });
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });
  });

  test('shows error for invalid file type', async () => {
    render(
      <BrowserRouter>
        <UploadPage />
      </BrowserRouter>
    );

    const fileInput = screen.getByLabelText(/select image/i, { selector: 'input[type="file"]' });
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('Please select an image file')).toBeInTheDocument();
    });
  });

  test('shows error for large file', async () => {
    render(
      <BrowserRouter>
        <UploadPage />
      </BrowserRouter>
    );

    const fileInput = screen.getByLabelText(/select image/i, { selector: 'input[type="file"]' });
    
    // Create a large file (11MB)
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    
    userEvent.upload(fileInput, largeFile);

    await waitFor(() => {
      expect(screen.getByText('Image size should be less than 10MB')).toBeInTheDocument();
    });
  });

  test('uploads file and redirects on success', async () => {
    const { uploadImage } = require('@/lib/api');
    const mockPush = jest.fn();
    
    uploadImage.mockResolvedValue({ sessionId: 'test-session-id' });
    
    require('next/navigation').useRouter.mockReturnValue({
      push: mockPush,
    });

    render(
      <BrowserRouter>
        <UploadPage />
      </BrowserRouter>
    );

    const fileInput = screen.getByLabelText(/select image/i, { selector: 'input[type="file"]' });
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    userEvent.upload(fileInput, file);

    // Wait for preview to appear
    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });

    // Click upload button
    const uploadButton = screen.getByText('Upload & Analyze');
    userEvent.click(uploadButton);

    // Wait for upload to complete
    await waitFor(() => {
      expect(uploadImage).toHaveBeenCalledWith(file);
    });

    // Check if redirect was called
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/visualize?sessionId=test-session-id');
    });
  });
});
```

#### Backend Tests

### backend/tests/api/test_upload.py
```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import Base, get_db
from app.models.user import User
from app.core.security import get_password_hash

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture
def test_user():
    db = TestingSessionLocal()
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password=get_password_hash("password"),
        is_active=True,
        is_superuser=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user

@pytest.fixture
def auth_headers(test_user):
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "password"}
    )
    token = response.json()["token"]
    return {"Authorization": f"Bearer {token}"}

def test_upload_image_success(auth_headers):
    # Create a test image file
    files = {"file": ("test.jpg", b"fake image content", "image/jpeg")}
    
    response = client.post(
        "/api/upload",
        files=files,
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "sessionId" in data
    assert "imageUrl" in data
    assert data["imageWidth"] > 0
    assert data["imageHeight"] > 0

def test_upload_invalid_file_type(auth_headers):
    # Create a test text file
    files = {"file": ("test.txt", b"fake text content", "text/plain")}
    
    response = client.post(
        "/api/upload",
        files=files,
        headers=auth_headers
    )
    
    assert response.status_code == 400
    assert "File must be an image" in response.json()["detail"]

def test_upload_too_large_file(auth_headers):
    # Create a large test image file (11MB)
    large_content = b"x" * (11 * 1024 * 1024)
    files = {"file": ("large.jpg", large_content, "image/jpeg")}
    
    response = client.post(
        "/api/upload",
        files=files,
        headers=auth_headers
    )
    
    assert response.status_code == 400
    assert "File size must be less than 10MB" in response.json()["detail"]

def test_upload_unauthorized():
    # Create a test image file
    files = {"file": ("test.jpg", b"fake image content", "image/jpeg")}
    
    response = client.post(
        "/api/upload",
        files=files
    )
    
    assert response.status_code == 401
```

### backend/tests/ml/test_inference.py
```python
import pytest
import numpy as np
from PIL import Image
import io
from ml.inference import load_fastsam_model, run_segmentation

@pytest.fixture
def test_image():
    # Create a simple test image
    image = Image.new('RGB', (100, 100), color='red')
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format='JPEG')
    img_byte_arr = img_byte_arr.getvalue()
    return img_byte_arr

@pytest.fixture
def mock_model(monkeypatch):
    # Mock the model and its methods
    class MockModel:
        def __call__(self, *args, **kwargs):
            # Mock results
            class MockResults:
                def __init__(self):
                    pass
                
                def __getitem__(self, idx):
                    return self
                
                def __len__(self):
                    return 1
            
            return MockResults()
    
    class MockPromptProcess:
        def __init__(self, *args, **kwargs):
            pass
        
        def everything_prompt(self):
            # Return a simple mask
            mask = np.zeros((100, 100), dtype=bool)
            mask[40:60, 40:60] = True  # A white square in the middle
            return [mask]
    
    # Mock FastSAMPrompt
    monkeypatch.setattr("ml.inference.FastSAMPrompt", MockPromptProcess)
    
    return MockModel()

def test_load_model():
    model = load_fastsam_model()
    assert model is not None

@pytest.mark.asyncio
async def test_run_segmentation(mock_model, test_image, tmp_path, monkeypatch):
    # Mock requests.get to return our test image
    import requests
    
    class MockResponse:
        def __init__(self, content):
            self.content = content
    
    def mock_get(*args, **kwargs):
        return MockResponse(test_image)
    
    monkeypatch.setattr(requests, "get", mock_get)
    
    # Mock uuid.uuid4 to return a predictable value
    import uuid
    monkeypatch.setattr(uuid, "uuid4", lambda: uuid.UUID('12345678-1234-5678-1234-567812345678'))
    
    # Mock saving the mask
    def mock_save(*args, **kwargs):
        pass
    
    monkeypatch.setattr(Image.Image, "save", mock_save)
    
    # Run segmentation
    masks = await run_segmentation("http://example.com/test.jpg")
    
    # Check results
    assert len(masks) == 1
    assert masks[0]["id"] == "12345678-1234-5678-1234-567812345678"
    assert masks[0]["label"] == "Object 1"
    assert masks[0]["color"] is not None
    assert masks[0]["maskUrl"] is not None
    assert 0 < masks[0]["areaPercent"] < 100
    assert masks[0]["confidence"] > 0
```

#### Test Commands

### scripts/test.sh
```bash
#!/bin/bash

# Exit on error
set -e

echo "🧪 Running tests..."

# Frontend tests
echo "📱 Running frontend tests..."
cd frontend
npm test -- --coverage --watchAll=false
cd ..

# Backend tests
echo "🔧 Running backend tests..."
cd backend
pytest --cov=app --cov-report=html --cov-report=term
cd ..

# Integration tests
echo "🔗 Running integration tests..."
cd infrastructure/docker
docker-compose exec backend pytest tests/integration/
cd ../..

echo "✅ All tests passed!"
```

### 11. Observability & Logging

#### Basic Logging Setup

### backend/app/core/logging.py
```python
import logging
import sys
from datetime import datetime
from typing import Dict, Any
import json

class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""
    
    def format(self, record):
        log_object = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add extra fields if available
        if hasattr(record, 'user_id'):
            log_object["user_id"] = record.user_id
        
        if hasattr(record, 'request_id'):
            log_object["request_id"] = record.request_id
        
        if hasattr(record, 'session_id'):
            log_object["session_id"] = record.session_id
        
        # Add exception info if available
        if record.exc_info:
            log_object["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_object)

def setup_logging():
    """Set up logging configuration."""
    # Create root logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # Create formatter and add it to the handler
    formatter = JSONFormatter()
    console_handler.setFormatter(formatter)
    
    # Add the handler to the logger
    logger.addHandler(console_handler)
    
    # Set up specific loggers
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger.handlers = []
    uvicorn_logger.propagate = True
    
    return logger

def get_logger(name: str):
    """Get a logger with the specified name."""
    return logging.getLogger(name)
```

#### Logging Integration

### backend/app/main.py
```python
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import time
import uuid
from .core.config import settings
from .core.logging import setup_logging, get_logger
from .api import (
    upload,
    analyze,
    visualize,
    refine,
    products,
    save,
    health
)

# Set up logging
setup_logging()
logger = get_logger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI Room Visualizer API",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Generate request ID
    request_id = str(uuid.uuid4())
    
    # Add request ID to logger context
    logger.info(
        "Request started",
        extra={
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "user_agent": request.headers.get("user-agent")
        }
    )
    
    # Start timer
    start_time = time.time()
    
    # Process request
    try:
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Log successful request
        logger.info(
            "Request completed",
            extra={
                "request_id": request_id,
                "status_code": response.status_code,
                "process_time": process_time
            }
        )
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response
    except Exception as e:
        # Calculate processing time
        process_time = time.time() - start_time
        
        # Log failed request
        logger.error(
            "Request failed",
            extra={
                "request_id": request_id,
                "error": str(e),
                "process_time": process_time
            },
            exc_info=True
        )
        
        raise

# Exception handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error(
        f"HTTP exception: {exc.detail}",
        extra={
            "request_id": request.headers.get("X-Request-ID"),
            "status_code": exc.status_code
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(
        f"Validation error: {exc}",
        extra={
            "request_id": request.headers.get("X-Request-ID"),
            "errors": exc.errors()
        }
    )
    
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )

# Include API routers
app.include_router(
    upload.router,
    prefix=f"{settings.API_V1_STR}/upload",
    tags=["upload"]
)

app.include_router(
    analyze.router,
    prefix=f"{settings.API_V1_STR}/analyze",
    tags=["analyze"]
)

app.include_router(
    visualize.router,
    prefix=f"{settings.API_V1_STR}/visualize",
    tags=["visualize"]
)

app.include_router(
    refine.router,
    prefix=f"{settings.API_V1_STR}/refine",
    tags=["refine"]
)

app.include_router(
    products.router,
    prefix=f"{settings.API_V1_STR}/products",
    tags=["products"]
)

app.include_router(
    save.router,
    prefix=f"{settings.API_V1_STR}/save",
    tags=["save"]
)

app.include_router(
    health.router,
    prefix=f"{settings.API_V1_STR}/health",
    tags=["health"]
)

@app.get("/")
async def root():
    return {"message": "AI Room Visualizer API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

#### Metrics Endpoint

### backend/app/api/metrics.py
```python
from fastapi import APIRouter, Depends
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from ..core.security import get_current_active_user
from ..models.user import User

router = APIRouter()

@router.get("/")
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(
        content=generate_latest().decode("utf-8"),
        media_type=CONTENT_TYPE_LATEST
    )
```

### 12. Performance & Optimization

#### ONNX/TorchScript Conversion

### backend/ml/convert_model.py
```python
import torch
from fastsam import FastSAM
import os

def convert_to_onnx():
    """Convert FastSAM model to ONNX format."""
    # Load the model
    model = FastSAM('./weights/FastSAM-x.pt')
    model.eval()
    
    # Create dummy input
    dummy_input = torch.randn(1, 3, 1024, 1024)
    
    # Export to ONNX
    onnx_path = './weights/FastSAM-x.onnx'
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    
    print(f"Model converted to ONNX and saved to {onnx_path}")

def convert_to_torchscript():
    """Convert FastSAM model to TorchScript format."""
    # Load the model
    model = FastSAM('./weights/FastSAM-x.pt')
    model.eval()
    
    # Convert to TorchScript
    scripted_model = torch.jit.script(model)
    
    # Save the model
    torchscript_path = './weights/FastSAM-x.pt2'
    scripted_model.save(torchscript_path)
    
    print(f"Model converted to TorchScript and saved to {torchscript_path}")

if __name__ == "__main__":
    # Create weights directory if it doesn't exist
    os.makedirs('./weights', exist_ok=True)
    
    print("Converting model to ONNX...")
    convert_to_onnx()
    
    print("Converting model to TorchScript...")
    convert_to_torchscript()
    
    print("Model conversion complete!")
```

#### Optimized Inference

### backend/ml/inference_optimized.py
```python
import os
import io
import requests
import numpy as np
from PIL import Image
import torch
import onnxruntime as ort
from typing import Dict, List, Any, Tuple, Optional

# Global model variable
_onnx_model = None
_torchscript_model = None
_model_type = None  # 'onnx' or 'torchscript'

def load_onnx_model():
    """Load the ONNX model."""
    global _onnx_model
    
    if _onnx_model is not None:
        return _onnx_model
    
    # Download model weights if not present
    model_path = "./weights/FastSAM-x.onnx"
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"ONNX model not found at {model_path}")
    
    # Create ONNX Runtime session
    providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
    _onnx_model = ort.InferenceSession(model_path, providers=providers)
    
    print(f"ONNX model loaded with providers: {_onnx_model.get_providers()}")
    
    return _onnx_model

def load_torchscript_model():
    """Load the TorchScript model."""
    global _torchscript_model
    
    if _torchscript_model is not None:
        return _torchscript_model
    
    # Download model weights if not present
    model_path = "./weights/FastSAM-x.pt2"
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"TorchScript model not found at {model_path}")
    
    # Load model
    device = "cuda" if torch.cuda.is_available() else "cpu"
    _torchscript_model = torch.jit.load(model_path)
    _torchscript_model.to(device)
    _torchscript_model.eval()
    
    print(f"TorchScript model loaded on {device}")
    
    return _torchscript_model

def load_optimized_model(model_type='onnx'):
    """Load the optimized model (ONNX or TorchScript)."""
    global _model_type
    
    _model_type = model_type
    
    if model_type == 'onnx':
        return load_onnx_model()
    elif model_type == 'torchscript':
        return load_torchscript_model()
    else:
        raise ValueError(f"Unsupported model type: {model_type}")

def model_loaded():
    """Check if the model is loaded."""
    return _onnx_model is not None or _torchscript_model is not None

async def run_segmentation_optimized(
    image_url: str, 
    confidence: float = 0.5, 
    iou_threshold: float = 0.7,
    model_type='onnx'
) -> List[Dict[str, Any]]:
    """
    Run segmentation on an image using the optimized model.
    
    Args:
        image_url: URL of the image to segment
        confidence: Confidence threshold for detections
        iou_threshold: IoU threshold for non-maximum suppression
        model_type: Type of model to use ('onnx' or 'torchscript')
        
    Returns:
        List of mask dictionaries
    """
    model = load_optimized_model(model_type)
    
    try:
        # Download image
        response = requests.get(image_url)
        image = Image.open(io.BytesIO(response.content))
        
        # Preprocess image
        image_np = np.array(image)
        
        # Resize to model input size
        input_size = 1024
        image_resized = Image.fromarray(image_np).resize((input_size, input_size))
        image_tensor = np.array(image_resized).transpose(2, 0, 1) / 255.0
        image_tensor = np.expand_dims(image_tensor, axis=0).astype(np.float32)
        
        # Run inference
        if model_type == 'onnx':
            # ONNX inference
            inputs = {model.get_inputs()[0].name: image_tensor}
            outputs = model.run(None, inputs)
            
            # Process outputs
            # This is a simplified example - actual processing would depend on the model output format
            masks = outputs[0]
        else:
            # TorchScript inference
            device = "cuda" if torch.cuda.is_available() else "cpu"
            image_tensor_torch = torch.from_numpy(image_tensor).to(device)
            
            with torch.no_grad():
                outputs = model(image_tensor_torch)
            
            # Process outputs
            # This is a simplified example - actual processing would depend on the model output format
            masks = outputs[0].cpu().numpy()
        
        # Convert to our format
        output_masks = []
        for i in range(masks.shape[0]):
            # Generate a color for the mask
            color = f"#{np.random.randint(0, 0xFFFFFF):06x}"
            
            # Calculate area percentage
            mask = masks[i]
            mask_area = np.sum(mask)
            total_area = mask.shape[0] * mask.shape[1]
            area_percent = (mask_area / total_area) * 100
            
            # Save mask to a temporary file (in a real implementation, you'd upload to storage)
            mask_image = Image.fromarray((mask * 255).astype(np.uint8))
            mask_filename = f"mask_{i}.png"
            mask_path = f"/tmp/{mask_filename}"
            mask_image.save(mask_path)
            
            # In a real implementation, you would upload this to your storage service
            # and get a URL back. For now, we'll use a placeholder.
            mask_url = f"https://example.com/masks/{mask_filename}"
            
            output_masks.append({
                "id": f"mask_{i}",
                "label": f"Object {i+1}",
                "color": color,
                "maskUrl": mask_url,
                "areaPercent": round(area_percent, 2),
                "confidence": confidence
            })
        
        return output_masks
    
    except Exception as e:
        print(f"Error in optimized segmentation: {e}")
        raise e
```

#### Image Processing Optimization

### backend/ml/processing_optimized.py
```python
import cv2
import numpy as np
import requests
from PIL import Image, ImageDraw, ImageFilter
import io
import uuid
from typing import Dict, List, Any, Tuple, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

class ImageServiceOptimized:
    """Optimized service for processing images and applying visualizations."""
    
    def __init__(self, max_workers=4):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
    
    async def apply_visualization(
        self,
        original_image_url: str,
        mask_url: str,
        product_image_url: str,
        mask_color: str = "#3B82F6"
    ) -> io.BytesIO:
        """
        Apply a product/material to a segmented surface.
        
        This optimized version uses parallel processing for downloading images
        and optimized numpy operations for blending.
        """
        try:
            # Download images in parallel
            download_tasks = [
                self._download_image(original_image_url),
                self._download_image(mask_url),
                self._download_image(product_image_url)
            ]
            
            original_image, mask_image, product_image = await asyncio.gather(*download_tasks)
            
            # Convert to numpy arrays in parallel
            convert_tasks = [
                self._convert_to_numpy(original_image),
                self._convert_to_numpy(mask_image),
                self._convert_to_numpy(product_image)
            ]
            
            original_np, mask_np, product_np = await asyncio.gather(*convert_tasks)
            
            # Ensure mask is binary
            if len(mask_np.shape) > 2:
                mask_np = mask_np[:, :, 0]  # Take first channel if RGB
            mask_np = (mask_np > 128).astype(np.uint8) * 255
            
            # Apply perspective correction if needed
            # In a real implementation, you would detect the perspective of the surface
            # and apply a transformation to the product image to match
            
            # Resize product to match the size of the mask
            product_image = product_image.resize((original_image.width, original_image.height))
            product_np = np.array(product_image)
            
            # Create a copy of the original image
            result_np = original_np.copy()
            
            # Apply the product to the masked area using vectorized operations
            mask_bool = mask_np.astype(bool)
            
            # Apply product to masked areas for each channel
            for c in range(3):  # For each RGB channel
                result_np[:, :, c] = np.where(
                    mask_bool,
                    product_np[:, :, c],
                    result_np[:, :, c]
                )
            
            # Create a feathered mask for blending
            # Using a larger kernel for smoother blending
            feathered_mask = cv2.GaussianBlur(mask_np, (25, 25), 0)
            feathered_mask = feathered_mask / 255.0
            
            # Apply feathered blending using vectorized operations
            for c in range(3):
                result_np[:, :, c] = (
                    result_np[:, :, c] * (1 - feathered_mask) + 
                    product_np[:, :, c] * feathered_mask
                ).astype(np.uint8)
            
            # Convert back to PIL Image
            result_image = Image.fromarray(result_np)
            
            # Save to BytesIO
            result_bytes = io.BytesIO()
            result_image.save(result_bytes, format="PNG", optimize=True)
            result_bytes.seek(0)
            
            return result_bytes
        
        except Exception as e:
            print(f"Error applying visualization: {e}")
            raise e
    
    async def _download_image(self, url: str) -> Image.Image:
        """Download an image from a URL."""
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            self.executor,
            lambda: requests.get(url)
        )
        image = await loop.run_in_executor(
            self.executor,
            lambda: Image.open(io.BytesIO(response.content))
        )
        return image
    
    async def _convert_to_numpy(self, image: Image.Image) -> np.ndarray:
        """Convert a PIL Image to a numpy array."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor,
            lambda: np.array(image)
        )
    
    async def batch_process_images(
        self,
        image_urls: List[str],
        process_func: callable,
        **kwargs
    ) -> List[Any]:
        """
        Process multiple images in parallel.
        
        Args:
            image_urls: List of image URLs to process
            process_func: Function to apply to each image
            **kwargs: Additional arguments for the process function
            
        Returns:
            List of processed results
        """
        tasks = [process_func(url, **kwargs) for url in image_urls]
        return await asyncio.gather(*tasks)
```

### 13. Accessibility, Privacy, and Compliance

#### Accessibility Checklist

### frontend/src/components/ui/accessibility.tsx
```tsx
import React from 'react';

// Accessibility utility functions
export const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('aria-hidden', 'false');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  
  document.body.appendChild(announcement);
  announcement.textContent = message;
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

export const useKeyboardNavigation = () => {
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };
  
  return { handleKeyDown };
};

// Accessible button component
export const AccessibleButton = ({ 
  children, 
  onClick, 
  ariaLabel, 
  ...props 
}: { 
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel?: string;
  [key: string]: any;
}) => {
  const { handleKeyDown } = useKeyboardNavigation();
  
  return (
    <button
      onClick={onClick}
      onKeyDown={(e) => handleKeyDown(e, onClick)}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
};

// Accessible image component
export const AccessibleImage = ({ 
  src, 
  alt, 
  ...props 
}: { 
  src: string;
  alt: string;
  [key: string]: any;
}) => {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      {...props}
    />
  );
};
```

#### Privacy and Compliance

### backend/app/core/privacy.py
```python
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..db.session import get_db
from ..models.user import User
from ..models.session import Session as SessionModel
from ..models.visualization import Visualization

logger = logging.getLogger(__name__)

class PrivacyManager:
    """Manages privacy and compliance-related operations."""
    
    def __init__(self, retention_days: int = 30):
        self.retention_days = retention_days
    
    async def delete_user_data(self, user_id: str, db: Session) -> bool:
        """
        Delete all data associated with a user.
        
        Args:
            user_id: ID of the user whose data should be deleted
            db: Database session
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            # Delete user's sessions
            db.query(SessionModel).filter(SessionModel.user_id == user_id).delete()
            
            # Delete user's visualizations
            db.query(Visualization).filter(Visualization.user_id == user_id).delete()
            
            # Delete user account
            db.query(User).filter(User.id == user_id).delete()
            
            db.commit()
            
            logger.info(f"Deleted all data for user {user_id}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting user data for {user_id}: {e}")
            return False
    
    async def delete_expired_sessions(self, db: Session) -> int:
        """
        Delete sessions that have expired based on retention policy.
        
        Args:
            db: Database session
            
        Returns:
            Number of sessions deleted
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=self.retention_days)
            
            # Get count before deletion
            count = db.query(SessionModel).filter(
                SessionModel.created_at < cutoff_date
            ).count()
            
            # Delete expired sessions
            db.query(SessionModel).filter(
                SessionModel.created_at < cutoff_date
            ).delete()
            
            db.commit()
            
            logger.info(f"Deleted {count} expired sessions")
            return count
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting expired sessions: {e}")
            return 0
    
    async def anonymize_user_data(self, user_id: str, db: Session) -> bool:
        """
        Anonymize user data instead of deleting it.
        
        Args:
            user_id: ID of the user whose data should be anonymized
            db: Database session
            
        Returns:
            True if anonymization was successful, False otherwise
        """
        try:
            # Anonymize user account
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.email = f"anonymous_{user_id}@example.com"
                user.name = "Anonymous User"
                user.hashed_password = ""
                
            # Anonymize session data (remove user reference)
            db.query(SessionModel).filter(SessionModel.user_id == user_id).update({
                "user_id": None
            })
            
            db.commit()
            
            logger.info(f"Anonymized data for user {user_id}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error anonymizing user data for {user_id}: {e}")
            return False
    
    async def export_user_data(self, user_id: str, db: Session) -> Optional[Dict[str, Any]]:
        """
        Export all data associated with a user.
        
        Args:
            user_id: ID of the user whose data should be exported
            db: Database session
            
        Returns:
            Dictionary containing user data or None if user not found
        """
        try:
            # Get user data
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return None
            
            # Get user's sessions
            sessions = db.query(SessionModel).filter(SessionModel.user_id == user_id).all()
            
            # Get user's visualizations
            visualizations = db.query(Visualization).filter(Visualization.user_id == user_id).all()
            
            # Format data for export
            export_data = {
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name,
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                    "updated_at": user.updated_at.isoformat() if user.updated_at else None
                },
                "sessions": [
                    {
                        "id": session.id,
                        "image_url": session.image_url,
                        "image_width": session.image_width,
                        "image_height": session.image_height,
                        "created_at": session.created_at.isoformat() if session.created_at else None,
                        "updated_at": session.updated_at.isoformat() if session.updated_at else None
                    }
                    for session in sessions
                ],
                "visualizations": [
                    {
                        "id": viz.id,
                        "name": viz.name,
                        "description": viz.description,
                        "image_url": viz.image_url,
                        "is_saved": viz.is_saved,
                        "is_favorite": viz.is_favorite,
                        "created_at": viz.created_at.isoformat() if viz.created_at else None,
                        "updated_at": viz.updated_at.isoformat() if viz.updated_at else None
                    }
                    for viz in visualizations
                ]
            }
            
            logger.info(f"Exported data for user {user_id}")
            return export_data
            
        except Exception as e:
            logger.error(f"Error exporting user data for {user_id}: {e}")
            return None

# Create a global instance
privacy_manager = PrivacyManager(retention_days=int(os.getenv("DATA_RETENTION_DAYS", "30")))
```

### 14. UX / UI Polish

#### UI Spec

### frontend/src/styles/theme.ts
```typescript
export const theme = {
  colors: {
    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },
    secondary: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86EFAC',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#14532D',
    },
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    error: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
      800: '#991B1B',
      900: '#7F1D1D',
    },
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.625',
    },
  },
  spacing: {
    px: '1px',
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    7: '1.75rem',   // 28px
    8: '2rem',      // 32px
    9: '2.25rem',   // 36px
    10: '2.5rem',   // 40px
    11: '2.75rem',  // 44px
    12: '3rem',     // 48px
    14: '3.5rem',   // 56px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
    28: '7rem',     // 112px
    32: '8rem',     // 128px
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },
  boxShadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none',
  },
  zIndex: {
    auto: 'auto',
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
  },
  transition: {
    property: {
      common: 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform',
      colors: 'background-color, border-color, color, fill, stroke',
      opacity: 'opacity',
      shadow: 'box-shadow',
      transform: 'transform',
    },
    timingFunction: {
      DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    duration: {
      75: '75ms',
      100: '100ms',
      150: '150ms',
      200: '200ms',
      300: '300ms',
      500: '500ms',
      700: '700ms',
      1000: '1000ms',
    },
  },
};
```

#### Component Examples

### frontend/src/components/ui/Header.tsx
```tsx
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Home, 
  Upload, 
  Palette, 
  User, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface HeaderProps {
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    // In a real app, this would call a logout API
    localStorage.removeItem('auth_token');
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">AI Room Visualizer</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-600 hover:text-gray-900 transition-colors flex items-center"
            >
              <Home className="h-4 w-4 mr-1" />
              Home
            </Link>
            <Link 
              href="/upload" 
              className="text-gray-600 hover:text-gray-900 transition-colors flex items-center"
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Link>
            <Link 
              href="/dashboard" 
              className="text-gray-600 hover:text-gray-900 transition-colors flex items-center"
            >
              <Palette className="h-4 w-4 mr-1" />
              My Designs
            </Link>
          </nav>

          <div className="flex items-center">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center space-x-4">
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Get started</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
            <Link 
              href="/" 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="h-4 w-4 inline mr-2" />
              Home
            </Link>
            <Link 
              href="/upload" 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Upload
            </Link>
            <Link 
              href="/dashboard" 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Palette className="h-4 w-4 inline mr-2" />
              My Designs
            </Link>
            
            {!user && (
              <>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <Link 
                    href="/login" 
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link 
                    href="/register" 
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get started
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
```

### frontend/src/components/product/ProductCard.tsx
```tsx
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Heart, 
  ShoppingCart, 
  Eye, 
  Star,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string) => void;
  onToggleFavorite?: (productId: string) => void;
  onViewDetails?: (productId: string) => void;
  isFavorite?: boolean;
  className?: string;
}

export function ProductCard({
  product,
  onAddToCart,
  onToggleFavorite,
  onViewDetails,
  isFavorite = false,
  className = ""
}: ProductCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart?.(product.id);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(product.id);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onViewDetails?.(product.id);
  };

  const renderStars = () => {
    if (!product.rating) return null;
    
    return (
      <div className="flex items-center">
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i < Math.floor(product.rating || 0)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-500 ml-1">
          {product.rating} ({product.reviewCount || 0})
        </span>
      </div>
    );
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className={`h-full ${className}`}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Link href={`/products/${product.id}`}>
        <Card className="h-full overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="relative aspect-square overflow-hidden bg-gray-50">
            {!isImageLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className={`object-cover transition-transform duration-300 ${
                isHovered ? 'scale-105' : 'scale-100'
              }`}
              onLoad={() => setIsImageLoaded(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {product.isNew && (
                <Badge className="bg-green-500 hover:bg-green-600 text-white">
                  New
                </Badge>
              )}
              {product.isFeatured && (
                <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
                  Featured
                </Badge>
              )}
            </div>
            
            {product.discountPercent && (
              <Badge className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white">
                -{product.discountPercent}%
              </Badge>
            )}
            
            {/* Hover overlay */}
            {isHovered && (
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleViewDetails}
                  className="bg-white/90 hover:bg-white text-gray-900"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Quick View
                </Button>
              </div>
            )}
          </div>
          
          <CardContent className="p-4">
            <div className="mb-2">
              <h3 className="font-medium text-gray-900 line-clamp-1">
                {product.name}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-1">
                {product.category}
              </p>
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {product.discountPercent ? (
                  <>
                    <span className="font-medium text-gray-900">
                      ${product.discountedPrice}
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      ${product.price}
                    </span>
                  </>
                ) : (
                  <span className="font-medium text-gray-900">
                    ${product.price}
                  </span>
                )}
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleFavorite}
                className={`p-1 h-8 w-8 ${
                  isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-gray-500'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
            </div>
            
            {renderStars()}
            
            <div className="mt-3 flex items-center justify-between">
              <Button
                size="sm"
                onClick={handleAddToCart}
                className="text-xs"
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                Add to Cart
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleViewDetails}
                className="text-xs"
              >
                Details
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
```

### frontend/src/components/visualize/CanvasOverlay.tsx
```tsx
import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Mask } from '@/types';

interface CanvasOverlayProps {
  masks: Mask[];
  selectedMaskId?: string;
  onMaskSelect: (maskId: string) => void;
  onCanvasClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasMouseDown?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasMouseMove?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasMouseUp?: () => void;
  imageUrl: string;
  visualizationUrl?: string;
  isRefining?: boolean;
  refineMode?: 'click' | 'scribble';
}

export function CanvasOverlay({
  masks,
  selectedMaskId,
  onMaskSelect,
  onCanvasClick,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  imageUrl,
  visualizationUrl,
  isRefining = false,
  refineMode = 'click'
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Draw masks on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Apply zoom and position
      ctx.save();
      ctx.translate(position.x, position.y);
      ctx.scale(zoom, zoom);
      
      // Draw image
      ctx.drawImage(img, 0, 0);
      
      // Draw masks
      masks.forEach(mask => {
        if (mask.id === selectedMaskId) {
          // Draw selected mask with highlight
          ctx.fillStyle = `${mask.color}80`; // Add transparency
          
          // In a real implementation, you would load and draw the actual mask image
          // For this example, we'll draw a simple rectangle
          ctx.fillRect(
            img.width * 0.2, 
            img.height * 0.2, 
            img.width * 0.6, 
            img.height * 0.6
          );
          
          // Draw border
          ctx.strokeStyle = mask.color;
          ctx.lineWidth = 3;
          ctx.strokeRect(
            img.width * 0.2, 
            img.height * 0.2, 
            img.width * 0.6, 
            img.height * 0.6
          );
        }
      });
      
      ctx.restore();
    };
  }, [masks, selectedMaskId, imageUrl, zoom, position]);
  
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  };
  
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };
  
  const handleResetView = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Only left mouse button
    if (refineMode === 'click') {
      onCanvasClick?.(e);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      onCanvasMouseDown?.(e);
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
    onCanvasMouseMove?.(e);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    onCanvasMouseUp?.();
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      {/* Canvas container */}
      <div className="relative overflow-hidden border rounded-lg bg-gray-100">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto cursor-crosshair"
          onClick={onCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        
        {/* Visualization overlay */}
        {visualizationUrl && (
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={visualizationUrl}
              alt="Visualization"
              className="w-full h-full object-contain"
            />
          </div>
        )}
        
        {/* Refining overlay */}
        {isRefining && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="text-white font-medium">Refining selection...</div>
          </div>
        )}
        
        {/* Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="bg-white/80 hover:bg-white"
            onClick={handleZoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="bg-white/80 hover:bg-white"
            onClick={handleZoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="bg-white/80 hover:bg-white"
            onClick={handleResetView}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="bg-white/80 hover:bg-white"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Zoom indicator */}
        <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {Math.round(zoom * 100)}%
        </div>
        
        {/* Refine mode indicator */}
        <div className="absolute bottom-4 right-4">
          <Badge variant="outline" className="bg-white/80">
            {refineMode === 'click' ? 'Click Mode' : 'Scribble Mode'}
          </Badge>
        </div>
      </div>
      
      {/* Mask selector */}
      <div className="mt-4 flex flex-wrap gap-2">
        {masks.map((mask) => (
          <motion.button
            key={mask.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedMaskId === mask.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => onMaskSelect(mask.id)}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: mask.color }}
            />
            {mask.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
```

### 15. Final Implementation Checklist & Timeline

#### Milestones

**MVP (2 weeks)**:
- Upload room photos
- Basic segmentation using FastSAM
- Simple overlay of products/materials
- Save visualization results

**Phase 2 (2 weeks)**:
- Interactive refinement tools (click/scribble)
- Product catalog with categories
- User authentication and profiles
- Save/share functionality

**Phase 3 (2 weeks)**:
- Performance optimization (ONNX/TorchScript)
- Advanced UI/UX polish
- Analytics dashboard
- Deployment to production

#### Sprint Plan (2 weeks)

**Week 1**:
- Days 1-2: Set up project structure and development environment
- Days 3-4: Implement image upload and basic segmentation
- Days 5-7: Create visualization canvas and product overlay

**Week 2**:
- Days 1-3: Implement interactive refinement tools
- Days 4-5: Add product catalog and selection UI
- Days 6-7: Implement save/share functionality and testing

### 16. Final Artifacts

#### Bootstrap Script

### bootstrap.sh
```bash
#!/bin/bash

# AI Room Visualizer Bootstrap Script
# This script sets up the development environment for the AI Room Visualizer project

set -e

echo "🚀 Setting up AI Room Visualizer development environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p infrastructure/docker/minio-data
mkdir -p infrastructure/docker/postgres-data

# Copy environment files
echo "📋 Setting up environment files..."
cp infrastructure/docker/.env.example infrastructure/docker/.env
cp backend/.env.example backend/.env

# Build and start services
echo "🏗️ Building and starting services..."
cd infrastructure/docker
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose exec backend alembic upgrade head

# Seed database with sample data
echo "🌱 Seeding database with sample data..."
docker-compose exec backend python scripts/seed.py

echo "✅ Setup complete!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📊 API Docs: http://localhost:8000/docs"
echo "💾 MinIO Console: http://localhost:9001"
echo ""
echo "To stop the services, run: cd infrastructure/docker && docker-compose down"
echo "To view logs, run: cd infrastructure/docker && docker-compose logs -f [service]"
```

#### Docker Compose

### infrastructure/docker/docker-compose.yml
```yaml
version: '3.8'

services:
  # Frontend (Next.js)
  frontend:
    build:
      context: ../../frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
    networks:
      - app-network

  # Backend (FastAPI)
  backend:
    build:
      context: ../../backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/ai_room_visualizer
      - STORAGE_ENDPOINT=http://minio:9000
      - STORAGE_ACCESS_KEY=minioadmin
      - STORAGE_SECRET_KEY=minioadmin
      - STORAGE_BUCKET_NAME=ai-room-visualizer
      - MODEL_SERVER_URL=http://model-server:8001
    depends_on:
      - postgres
      - minio
      - model-server
    volumes:
      - ../../backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    networks:
      - app-network

  # Model Server
  model-server:
    build:
      context: ../../backend
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/ai_room_visualizer
    volumes:
      - ../../backend:/app
    command: python -m ml.model_server
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    networks:
      - app-network

  # PostgreSQL
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=ai_room_visualizer
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ../../backend/db/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    networks:
      - app-network

  # MinIO (S3-compatible storage)
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=minioadmin
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    networks:
      - app-network

  # Redis (for caching and task queue)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - app-network

volumes:
  postgres-data:
  minio-data:

networks:
  app-network:
    driver: bridge
```

#### Environment Example

### backend/.env.example
```
# Database
DATABASE_URL=postgresql://postgres:password@localhost/ai_room_visualizer

# Storage (MinIO/S3)
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET_NAME=ai-room-visualizer
STORAGE_REGION=us-east-1

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Model Server
MODEL_SERVER_URL=http://localhost:8001

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Email (for notifications)
SMTP_SERVER=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your-email@example.com
SMTP_PASSWORD=your-email-password
EMAILS_FROM_EMAIL=noreply@example.com
```

#### API Examples

### API Examples

**Upload Image**
```bash
curl -X POST "http://localhost:8000/api/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/your/image.jpg"
```

**Response**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "imageUrl": "http://localhost:9000/ai-room-visualizer/uploads/550e8400-e29b-41d4-a716-446655440000.jpg",
  "imageWidth": 1024,
  "imageHeight": 768
}
```

**Analyze Image**
```bash
curl -X POST "http://localhost:8000/api/analyze" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "imageUrl": "http://localhost:9000/ai-room-visualizer/uploads/550e8400-e29b-41d4-a716-446655440000.jpg"
  }'
```

**Response**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "masks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "label": "Wall",
      "color": "#3B82F6",
      "maskUrl": "http://localhost:9000/ai-room-visualizer/masks/550e8400-e29b-41d4-a716-446655440001.png",
      "areaPercent": 45.2,
      "confidence": 0.92
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "label": "Floor",
      "color": "#10B981",
      "maskUrl": "http://localhost:9000/ai-room-visualizer/masks/550e8400-e29b-41d4-a716-446655440002.png",
      "areaPercent": 32.7,
      "confidence": 0.89
    }
  ]
}
```

**Apply Visualization**
```bash
curl -X POST "http://localhost:8000/api/visualize" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "maskId": "550e8400-e29b-41d4-a716-446655440001",
    "productImageUrl": "http://localhost:9000/ai-room-visualizer/products/blue-paint.jpg"
  }'
```

**Response**
```json
{
  "visualizationId": "550e8400-e29b-41d4-a716-446655440003",
  "imageUrl": "http://localhost:9000/ai-room-visualizer/visualizations/550e8400-e29b-41d4-a716-446655440003.png",
  "appliedProducts": [
    {
      "productId": "550e8400-e29b-41d4-a716-446655440004",
      "surfaceLabel": "Wall",
      "productName": "Modern Blue Paint",
      "productPrice": 45.99,
      "productImage": "http://localhost:9000/ai-room-visualizer/products/blue-paint.jpg"
    }
  ]
}
```

**Refine Mask**
```bash
curl -X POST "http://localhost:8000/api/refine" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "maskId": "550e8400-e29b-41d4-a716-446655440001",
    "type": "point",
    "x": 500,
    "y": 300,
    "label": 1
  }'
```

**Response**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "masks": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "label": "Wall",
      "color": "#3B82F6",
      "maskUrl": "http://localhost:9000/ai-room-visualizer/masks/550e8400-e29b-41d4-a716-446655440001-refined.png",
      "areaPercent": 46.8,
      "confidence": 0.94
    }
  ]
}
```

**Get Products**
```bash
curl -X GET "http://localhost:8000/api/products?type=material&category=Paint" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "name": "Modern Blue Paint",
    "description": "Premium interior paint with a smooth, durable finish",
    "category": "Paint",
    "type": "material",
    "price": 45.99,
    "image_url": "http://localhost:9000/ai-room-visualizer/products/blue-paint.jpg",
    "rating": 4.5,
    "review_count": 128,
    "is_new": true
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "name": "Classic White Paint",
    "description": "Timeless white paint for any room",
    "category": "Paint",
    "type": "material",
    "price": 42.99,
    "image_url": "http://localhost:9000/ai-room-visualizer/products/white-paint.jpg",
    "rating": 4.7,
    "review_count": 203
  }
]
```

**Save Visualization**
```bash
curl -X POST "http://localhost:8000/api/save" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "visualizationId": "550e8400-e29b-41d4-a716-446655440003",
    "name": "My Room Design",
    "description": "Blue walls with hardwood floors"
  }'
```

**Response**
```json
{
  "visualizationId": "550e8400-e29b-41d4-a716-446655440003",
  "name": "My Room Design",
  "description": "Blue walls with hardwood floors",
  "savedAt": "2023-07-01T12:34:56.789Z"
}
```

#### FAQ/Troubleshooting

### FAQ and Troubleshooting

**Q: The model server is taking a long time to start or keeps crashing.**
A: This is likely due to insufficient GPU memory or not having a GPU. You can run the model server in CPU-only mode by modifying the Dockerfile or docker-compose.yml to remove GPU requirements. Note that inference will be significantly slower.

**Q: I'm getting CORS errors when the frontend tries to connect to the backend.**
A: Make sure the backend's CORS settings include your frontend URL. Check the `ALLOWED_ORIGINS` environment variable in the backend's .env file.

**Q: The segmentation results are poor or inaccurate.**
A: FastSAM works best with clear, well-lit images. Try uploading a higher quality image with good lighting. You can also try adjusting the confidence and IoU thresholds in the analyze endpoint.

**Q: I'm running out of disk space when running the application.**
A: The application stores uploaded images and generated visualizations. You can set up a cleanup process to remove old files, or configure automatic lifecycle policies in your storage service.

**Q: The application is slow when processing images.**
A: Image processing can be resource-intensive. Make sure you have sufficient CPU/GPU resources. You can also try optimizing the image processing pipeline by reducing image sizes or using more efficient algorithms.

**Q: I can't connect to the database.**
A: Check that the PostgreSQL container is running and that the DATABASE_URL in your backend .env file is correct. The default credentials are username: postgres, password: password.

**Q: I'm getting permission errors when accessing MinIO.**
A: Make sure you're using the correct credentials (username: minioadmin, password: minioadmin) and that the MinIO container is running. You can access the MinIO console at http://localhost:9001.

**Q: How do I add new products to the catalog?**
A: You can add products directly to the database using the admin interface or by running the seed script with additional product data. The product images should be uploaded to your storage service.

**Q: Can I use a different segmentation model?**
A: Yes, the architecture is designed to be model-agnostic. You can replace FastSAM with another model by modifying the model server and inference code. Make sure to update the model loading and inference functions accordingly.

**Q: How do I deploy the application to production?**
A: The project includes deployment configurations for Vercel (frontend) and various cloud services (backend). Refer to the deployment section of the documentation for detailed instructions.

**Q: How can I improve the performance of the application?**
A: There are several ways to improve performance:
1. Use ONNX or TorchScript for faster model inference
2. Implement caching for frequently accessed data
3. Use a CDN for serving static assets
4. Optimize image processing with GPU acceleration
5. Use connection pooling for database connections

**Q: I'm getting authentication errors.**
A: Make sure you're including a valid JWT token in the Authorization header of your API requests. You can obtain a token by logging in via the /api/auth/login endpoint.

**Q: How do I customize the UI?**
A: The UI is built with Tailwind CSS and React components. You can customize the appearance by modifying the Tailwind configuration and component styles. The theme is defined in frontend/src/styles/theme.ts.

---

This completes the comprehensive project documentation for the AI Room Visualizer web application. The documentation includes all the necessary components to set up, develop, and deploy the application, including code examples, API specifications, and troubleshooting guidance.#   P V C _ P a n e l _ A I  
 