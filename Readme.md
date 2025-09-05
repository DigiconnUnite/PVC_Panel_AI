# AI Room Visualizer

A cutting-edge web application for visualizing interior design products on room images using advanced AI segmentation and realistic rendering.

## 🚀 Features

### Advanced AI Segmentation
- **Multi-Model Support**: FastSAM, SAM, DeepLab, YOLOv8
- **Room Element Recognition**: Automatic detection of walls, floors, ceilings
- **Intelligent Classification**: Position and shape-based surface identification

### Professional Annotation Tools
- **Brush Tool**: Variable size painting with smooth strokes
- **Eraser Tool**: Precise removal with adjustable size
- **Lasso Tool**: Free-form selection with live preview
- **Magic Wand**: Intelligent area selection based on color similarity
- **Multi-Selection**: Select multiple surfaces simultaneously

### Realistic Visualization
- **3D Perspective Correction**: Surface-aware texture mapping
- **Advanced Lighting**: Multiple light sources with material-specific responses
- **Boundary-Aware Blending**: Edge-preserving texture application
- **Color Correction**: Intelligent lighting matching

### User Experience
- **Keyboard Shortcuts**: S/B/E/L/W for tool switching
- **Visual Feedback**: Real-time tool indicators and status
- **Responsive Design**: Works on all devices
- **Professional UI**: Clean, intuitive interface

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **AI/ML**: FastSAM, SAM, DeepLab, YOLOv8
- **Image Processing**: Sharp, Canvas API
- **Deployment**: Vercel (Serverless Functions)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-room-visualizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

## 🚀 Deployment to Vercel

### Method 1: Vercel CLI
1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow the prompts** to configure your project

### Method 2: GitHub Integration
1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect Next.js and configure deployment

### Method 3: Manual Upload
1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy using Vercel CLI**
   ```bash
   vercel --prod
   ```

## ⚙️ Configuration

### Environment Variables
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
FASTSAM_WEIGHTS=FastSAM-s.pt
SAM_MODEL_TYPE=vit_b
DEEPLAB_MODEL=deeplabv3_resnet101
```

### Product Images
Place product images in these directories:
```
public/products/
├── wallpapers/          # Wallpaper textures
├── paints/             # Paint color samples
├── pvc-panels/         # PVC panel designs
└── thumbs/             # Thumbnail images
```

## 🎯 Usage

1. **Upload Room Image**: Drag & drop or click to upload
2. **AI Analysis**: Automatic segmentation of room surfaces
3. **Select Tool**: Choose from brush, lasso, magic wand, etc.
4. **Create Selection**: Paint or select areas to modify
5. **Choose Product**: Select wallpaper, paint, or PVC panel
6. **Apply Visualization**: See realistic preview instantly

## 🔧 API Endpoints

- `POST /api/upload` - Upload room images
- `POST /api/analyze` - Run AI segmentation
- `POST /api/visualize` - Apply product visualization
- `GET /api/products` - Get available products

## 🎨 Customization

### Adding New Products
1. Add images to `public/products/[category]/`
2. Add thumbnails to `public/products/[category]/thumbs/`
3. Update product data in `app/api/products/route.ts`

### Modifying AI Models
- Update model configurations in `backend/app/services/model_manager.py`
- Adjust segmentation parameters in `backend/app/services/analysis.py`

## 📱 Keyboard Shortcuts

- `S` - Selection mode
- `B` - Brush tool
- `E` - Eraser tool
- `L` - Lasso tool
- `W` - Magic wand
- `[ ]` - Adjust brush size
- `Esc` - Clear selection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **FastSAM**: For efficient segmentation
- **SAM (Segment Anything)**: For advanced masking
- **DeepLab**: For semantic segmentation
- **YOLOv8**: For object detection
- **Next.js & Vercel**: For the amazing deployment platform

---

**Built with ❤️ for interior designers and homeowners**# PVC_Panel_AI
