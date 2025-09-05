# 🏠 AI Room Visualizer

A cutting-edge AI-powered web application for visualizing interior design products on room photos. Upload room images, let AI detect surfaces (walls, floors, ceilings), and apply realistic product visualizations with professional tools.

![AI Room Visualizer](https://img.shields.io/badge/AI-Powered-blue) ![Next.js](https://img.shields.io/badge/Next.js-15-black) ![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-green) ![YOLOv8](https://img.shields.io/badge/YOLOv8-Segmentation-red) ![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)

## ✨ Features

### 🎨 AI-Powered Segmentation
- **Multi-Model AI**: FastSAM, YOLOv8, SAM, DeepLab integration
- **Room Element Detection**: Automatic walls, floors, ceilings recognition
- **Advanced Processing**: CLAHE enhancement, edge detection, surface classification
- **Real-time Analysis**: Instant segmentation results

### 🛠️ Professional Tools
- **Selection Tools**: Select, brush, eraser, lasso, magic wand
- **Multi-Surface Support**: Apply materials to multiple areas
- **Real-time Preview**: Live feedback and brush size controls
- **Keyboard Shortcuts**: Professional workflow shortcuts

### 🎯 Product Visualization
- **Dynamic Products**: Wallpapers, paints, PVC panels
- **Realistic Rendering**: 3D lighting, perspective correction, material properties
- **Customizable Overlays**: Adjustable opacity, positioning, layering
- **High-Quality Output**: Professional visualization results

### ☁️ Cloud Integration
- **Free Storage**: Cloudinary/Firebase integration
- **Image Optimization**: Compression, resizing, caching
- **Scalable Architecture**: Serverless deployment ready
- **Global CDN**: Fast worldwide delivery

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- Git

### 1. Clone Repository
```bash
git clone https://github.com/DigiconnUnite/PVC_Panel_AI.git
cd PVC_Panel_AI
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Backend Setup
```bash
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Start backend server
python ../start_backend.py
```

### 4. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## 📁 Project Structure

```
ai-room-visualizer/
├── app/                          # Next.js frontend
│   ├── api/                      # API routes
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── visualizer/              # Visualizer page
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── main.py             # FastAPI application
│   │   ├── services/           # Business logic
│   │   └── models/             # Data models
│   └── requirements.txt         # Python dependencies
├── components/                   # React components
├── public/                       # Static assets
│   └── products/                # Product images
├── YOLO_SETUP_GUIDE.md          # YOLO training guide
├── start_backend.py             # Backend startup script
└── vercel.json                  # Vercel configuration
```

## 🧠 AI Model Setup

### YOLO Model Training
See [YOLO_SETUP_GUIDE.md](YOLO_SETUP_GUIDE.md) for comprehensive training instructions.

### Model Configuration
```python
# Model parameters in backend/app/services/analysis.py
model.predict(
    imgsz=1280,          # High resolution
    conf=0.08,           # Low confidence threshold
    iou=0.3,             # IoU threshold
    max_det=150,         # Maximum detections
    agnostic_nms=False,  # Class-specific NMS
    augment=True         # Data augmentation
)
```

## 🎨 Product Management

### Adding New Products
1. **Images**: Place in `public/products/{category}/`
2. **Thumbnails**: Auto-generated or manual in `thumbs/` subfolder
3. **Metadata**: Update `backend/app/main.py` products endpoint

### Supported Categories
- **Wallpapers**: `/products/wallpapers/`
- **Paints**: `/products/paints/`
- **PVC Panels**: `/products/pvc-panels/`

## ☁️ Cloud Storage Setup

### Cloudinary Integration
```bash
# Install SDK
npm install cloudinary

# Configure environment
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Firebase Storage
```bash
# Install SDK
npm install firebase

# Configure in .env.local
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
```

## 🚀 Deployment

### Vercel (Recommended)
1. **Connect Repository**: Import to Vercel
2. **Auto-Deployment**: Vercel detects Next.js automatically
3. **Environment Variables**: Set in Vercel dashboard
4. **Deploy**: Automatic on git push

### Manual Deployment
```bash
# Build frontend
npm run build

# Start production server
npm start

# Backend (separate server)
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

## 🔧 Configuration

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
PYTHONPATH=backend

# Production
VERCEL_URL=https://your-app.vercel.app
```

### Vercel Configuration
```json
{
  "regions": ["iad1"],
  "env": {
    "PYTHONPATH": "backend"
  }
}
```

## 🛠️ Development

### Available Scripts
```bash
# Frontend
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # Code linting

# Backend
python start_backend.py    # Start FastAPI server
```

### Testing AI Models
```bash
# Test segmentation
curl http://localhost:8000/api/test-segmentation

# Health check
curl http://localhost:8000/health
```

## 📊 Performance Optimization

### Image Processing
- **Compression**: Automatic image optimization
- **Caching**: Browser and CDN caching
- **Lazy Loading**: Progressive image loading
- **WebP Support**: Modern image formats

### AI Model Optimization
- **Model Selection**: yolov8x-seg for accuracy
- **Batch Processing**: Efficient inference
- **GPU Acceleration**: CUDA support
- **Model Caching**: Pre-loaded models

## 🔒 Security

### API Security
- **CORS Configuration**: Proper origin validation
- **Input Validation**: File type and size limits
- **Rate Limiting**: Request throttling
- **Error Handling**: Secure error responses

### Data Protection
- **File Upload Security**: Type validation
- **Secure Storage**: Encrypted cloud storage
- **Access Control**: Proper authentication
- **Privacy Compliance**: GDPR considerations

## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Error**
   ```bash
   # Check backend is running
   curl http://localhost:8000/health

   # Start backend
   python start_backend.py
   ```

2. **Model Loading Issues**
   ```bash
   # Check model files exist
   ls backend/models/

   # Reinstall dependencies
   pip install -r backend/requirements.txt
   ```

3. **Vercel Deployment Issues**
   - Check `vercel.json` configuration
   - Verify environment variables
   - Check build logs in Vercel dashboard

4. **Memory Issues**
   ```python
   # Reduce model size
   model = YOLO('yolov8m-seg.pt')  # Use medium model
   ```

## 📈 Monitoring & Analytics

### Application Metrics
- **API Response Times**: Backend performance
- **Model Accuracy**: Detection success rates
- **User Interactions**: Feature usage analytics
- **Error Rates**: System reliability monitoring

### AI Model Metrics
- **mAP Scores**: Model accuracy metrics
- **Inference Time**: Processing speed
- **Memory Usage**: Resource consumption
- **Detection Confidence**: Prediction reliability

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. **Open** Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Ensure cross-browser compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ultralytics** for YOLOv8 models
- **Meta** for Segment Anything Model
- **PyTorch** for deep learning framework
- **Next.js** for React framework
- **FastAPI** for Python web framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/DigiconnUnite/PVC_Panel_AI/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DigiconnUnite/PVC_Panel_AI/discussions)
- **Documentation**: [Wiki](https://github.com/DigiconnUnite/PVC_Panel_AI/wiki)

---

**Built with ❤️ for interior design professionals and homeowners**

🎨 **Transform spaces with AI-powered visualization!** 🏠✨
