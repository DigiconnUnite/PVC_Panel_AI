# AI Room Visualizer - Product Library System

## Overview

The AI Room Visualizer now includes a comprehensive product library system with three main categories:

1. **PVC Panels** - Modern wall cladding solutions
2. **Wallpapers** - Decorative wall coverings  
3. **Paints** - Interior paint options

## Project Structure

```
ai-room-visualizer/
├── app/
│   ├── library/           # New library page
│   │   └── page.tsx      # Library with tabs
│   ├── upload/            # Image upload page
│   ├── visualizer/        # Room visualization page
│   └── page.tsx          # Enhanced home page
├── components/
│   ├── navigation.tsx     # Navigation component
│   └── ui/               # UI components
├── public/
│   └── products/         # Organized product images
│       ├── pvc-panels/   # PVC panel products
│       │   ├── thumbs/   # Thumbnails
│       │   └── *.png     # Full-size images
│       ├── wallpapers/   # Wallpaper products
│       │   ├── thumbs/   # Thumbnails
│       │   └── *.png     # Full-size images
│       └── paints/       # Paint products
│           ├── thumbs/   # Thumbnails
│           └── *.png     # Full-size images
├── backend/
│   └── app/
│       ├── main.py       # Updated API endpoints
│       └── services/     # Backend services
└── scripts/
    └── generate-product-images.py  # Image generation script
```

## Features

### 🏠 Enhanced Home Page
- **Feature Cards**: Three main sections highlighting Library, Upload, and Visualizer
- **Quick Actions**: Direct links to start projects or explore materials
- **Modern Design**: Clean, professional interface with hover effects

### 📚 Product Library
- **Three Main Tabs**: PVC Panels, Wallpapers, and Paints
- **Search & Filter**: Find products by name, brand, or description
- **Category Filtering**: Filter by wall, floor, or ceiling applications
- **View Modes**: Grid and list view options
- **Product Details**: Complete information including materials, finishes, dimensions, and coverage
- **Color Swatches**: Visual color representation for each product
- **Responsive Design**: Works on desktop and mobile devices

### 🧭 Navigation
- **Global Navigation**: Consistent navigation across all pages
- **Active States**: Visual feedback for current page
- **Mobile Menu**: Responsive hamburger menu for mobile devices
- **Brand Identity**: AI Room Visualizer logo and branding

## Product Categories

### PVC Panels
- **Modern White PVC Panel** - Clean, minimalist design
- **Wood Grain PVC Panel** - Natural wood appearance
- **Marble Effect PVC Panel** - Luxury marble finish
- **Geometric Pattern PVC Panel** - Contemporary geometric designs

**Specifications:**
- Material: PVC
- Dimensions: 2440mm x 1220mm
- Coverage: 2.98m² per panel
- Finishes: Matte, Wood Grain, Marble Effect, Geometric

### Wallpapers
- **Modern Blue Wallpaper** - Contemporary blue patterns
- **Floral Pattern Wallpaper** - Elegant floral designs
- **Striped Wallpaper** - Classic striped patterns
- **Abstract Art Wallpaper** - Bold artistic statements

**Specifications:**
- Material: Non-woven
- Dimensions: 10m x 0.53m per roll
- Coverage: 5.3m² per roll
- Finishes: Matte, Satin, Gloss

### Paints
- **Pure White Paint** - Clean, modern white
- **Navy Blue Paint** - Sophisticated navy
- **Sage Green Paint** - Calming sage green
- **Warm Beige Paint** - Cozy, inviting beige

**Specifications:**
- Material: Acrylic
- Coverage: 12m² per liter
- Container: 5L cans
- Finish: Matte

## API Endpoints

### Products
- `GET /api/products` - Returns organized product data by category
- `POST /api/upload-product` - Upload new product images
- `POST /api/upload-texture` - Upload texture files for visualization

### Room Processing
- `POST /api/upload` - Upload room images
- `POST /api/analyze` - Analyze room for segmentation
- `POST /api/refine` - Refine segmentation masks
- `POST /api/visualize` - Apply materials to room

## Getting Started

### 1. Start the Backend
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Start the Frontend
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

### 3. Access the Library
Navigate to `/library` to explore the product catalog.

### 4. Upload and Visualize
1. Go to `/upload` to upload a room photo
2. Use `/visualizer` to apply materials from the library

## Adding New Products

### 1. Generate Images
```bash
python scripts/generate-product-images.py
```

### 2. Update Backend Data
Edit `backend/app/main.py` to add new products to the API response.

### 3. Update Frontend
Edit `app/library/page.tsx` to include new products in the frontend data.

## Customization

### Product Images
- **Main Images**: 800x600 pixels (recommended)
- **Thumbnails**: 300x300 pixels (recommended)
- **Format**: PNG with transparency support

### Product Data
Each product should include:
- Unique ID
- Name and description
- Category and type
- Image URLs
- Price and brand
- Color palette
- Material specifications
- Dimensions and coverage

### Styling
The library uses Tailwind CSS with custom components. Modify:
- `components/ui/` for component styling
- `app/globals.css` for global styles
- Tailwind classes in component files

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile**: Responsive design for iOS and Android
- **JavaScript**: ES6+ features required

## Performance

- **Image Optimization**: Thumbnails for faster loading
- **Lazy Loading**: Images load as needed
- **Responsive Images**: Different sizes for different devices
- **Caching**: Browser caching for static assets

## Troubleshooting

### Common Issues

1. **Images Not Loading**
   - Check file paths in `public/products/`
   - Verify image file names match API data
   - Check browser console for 404 errors

2. **Backend Not Starting**
   - Ensure Python dependencies are installed
   - Check port availability
   - Verify module imports

3. **Navigation Issues**
   - Check Next.js routing configuration
   - Verify component imports
   - Check for TypeScript errors

### Development Tips

- Use browser dev tools to inspect network requests
- Check console for JavaScript errors
- Verify API responses in Network tab
- Test responsive design with browser dev tools

## Contributing

1. Follow the existing code structure
2. Add new products to both frontend and backend
3. Generate appropriate images for new products
4. Test on multiple devices and browsers
5. Update documentation as needed

## License

Created by Digiconn Unite Pvt. Ltd.
