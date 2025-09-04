"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Grid3X3, List } from "lucide-react";

interface Product {
  id: string;
  name: string;
  type: string;
  category: string;
  imageUrl: string;
  thumbnailUrl: string;
  price: number;
  brand: string;
  colors: string[];
  description: string;
  material?: string;
  finish?: string;
  dimensions?: string;
  coverage?: string;
}

const products: Product[] = [
  // PVC Panel Products
  {
    id: "pvc-1",
    name: "Modern White PVC Panel",
    type: "pvc-panel",
    category: "wall",
    imageUrl: "/products/pvc-panels/white-panel.png",
    thumbnailUrl: "/products/pvc-panels/thumbs/white-panel.png",
    price: 24.99,
    brand: "PanelPro",
    colors: ["#FFFFFF", "#F8F8FF", "#F5F5F5"],
    description: "High-quality white PVC panel perfect for modern interiors",
    material: "PVC",
    finish: "Matte",
    dimensions: "2440mm x 1220mm",
    coverage: "2.98m²"
  },
  {
    id: "pvc-2",
    name: "Wood Grain PVC Panel",
    type: "pvc-panel",
    category: "wall",
    imageUrl: "/products/pvc-panels/wood-grain.png",
    thumbnailUrl: "/products/pvc-panels/thumbs/wood-grain.png",
    price: 29.99,
    brand: "PanelPro",
    colors: ["#8B4513", "#A0522D", "#CD853F"],
    description: "Realistic wood grain finish PVC panel",
    material: "PVC",
    finish: "Wood Grain",
    dimensions: "2440mm x 1220mm",
    coverage: "2.98m²"
  },
  {
    id: "pvc-3",
    name: "Marble Effect PVC Panel",
    type: "pvc-panel",
    category: "wall",
    imageUrl: "/products/pvc-panels/marble-effect.png",
    thumbnailUrl: "/products/pvc-panels/thumbs/marble-effect.png",
    price: 34.99,
    brand: "PanelPro",
    colors: ["#E0E0E0", "#D3D3D3", "#C0C0C0"],
    description: "Elegant marble effect PVC panel for luxury interiors",
    material: "PVC",
    finish: "Marble Effect",
    dimensions: "2440mm x 1220mm",
    coverage: "2.98m²"
  },
  {
    id: "pvc-4",
    name: "Geometric Pattern PVC Panel",
    type: "pvc-panel",
    category: "wall",
    imageUrl: "/products/pvc-panels/geometric.png",
    thumbnailUrl: "/products/pvc-panels/thumbs/geometric.png",
    price: 27.99,
    brand: "PanelPro",
    colors: ["#2C3E50", "#34495E", "#5D6D7E"],
    description: "Modern geometric pattern PVC panel",
    material: "PVC",
    finish: "Geometric",
    dimensions: "2440mm x 1220mm",
    coverage: "2.98m²"
  },

  // Wallpaper Products
  {
    id: "wallpaper-1",
    name: "Modern Blue Wallpaper",
    type: "wallpaper",
    category: "wall",
    imageUrl: "/products/wallpapers/blue-modern.png",
    thumbnailUrl: "/products/wallpapers/thumbs/blue-modern.png",
    price: 49.99,
    brand: "HomeDecor",
    colors: ["#3b82f6", "#1e40af", "#93c5fd"],
    description: "Contemporary blue wallpaper with subtle patterns",
    material: "Non-woven",
    finish: "Matte",
    dimensions: "10m x 0.53m",
    coverage: "5.3m² per roll"
  },
  {
    id: "wallpaper-2",
    name: "Floral Pattern Wallpaper",
    type: "wallpaper",
    category: "wall",
    imageUrl: "/products/wallpapers/floral-pattern.png",
    thumbnailUrl: "/products/wallpapers/thumbs/floral-pattern.png",
    price: 39.99,
    brand: "HomeDecor",
    colors: ["#FF69B4", "#FFB6C1", "#FFC0CB"],
    description: "Beautiful floral pattern wallpaper for elegant spaces",
    material: "Non-woven",
    finish: "Satin",
    dimensions: "10m x 0.53m",
    coverage: "5.3m² per roll"
  },
  {
    id: "wallpaper-3",
    name: "Striped Wallpaper",
    type: "wallpaper",
    category: "wall",
    imageUrl: "/products/wallpapers/striped.png",
    thumbnailUrl: "/products/wallpapers/thumbs/striped.png",
    price: 44.99,
    brand: "HomeDecor",
    colors: ["#2C3E50", "#34495E", "#5D6D7E"],
    description: "Classic striped wallpaper for traditional interiors",
    material: "Non-woven",
    finish: "Matte",
    dimensions: "10m x 0.53m",
    coverage: "5.3m² per roll"
  },
  {
    id: "wallpaper-4",
    name: "Abstract Art Wallpaper",
    type: "wallpaper",
    category: "wall",
    imageUrl: "/products/wallpapers/abstract-art.png",
    thumbnailUrl: "/products/wallpapers/thumbs/abstract-art.png",
    price: 54.99,
    brand: "HomeDecor",
    colors: ["#E74C3C", "#F39C12", "#F1C40F"],
    description: "Bold abstract art wallpaper for statement walls",
    material: "Non-woven",
    finish: "Gloss",
    dimensions: "10m x 0.53m",
    coverage: "5.3m² per roll"
  },

  // Paint Products
  {
    id: "paint-1",
    name: "Pure White Paint",
    type: "paint",
    category: "wall",
    imageUrl: "/products/paints/white-pure.png",
    thumbnailUrl: "/products/paints/thumbs/white-pure.png",
    price: 29.99,
    brand: "PaintPro",
    colors: ["#FFFFFF", "#F8F8FF", "#F5F5F5"],
    description: "Premium pure white paint for clean, modern look",
    material: "Acrylic",
    finish: "Matte",
    coverage: "12m² per liter",
    dimensions: "5L can"
  },
  {
    id: "paint-2",
    name: "Navy Blue Paint",
    type: "paint",
    category: "wall",
    imageUrl: "/products/paints/navy-blue.png",
    thumbnailUrl: "/products/paints/thumbs/navy-blue.png",
    price: 34.99,
    brand: "PaintPro",
    colors: ["#000080", "#191970", "#00008B"],
    description: "Rich navy blue paint for sophisticated interiors",
    material: "Acrylic",
    finish: "Matte",
    coverage: "12m² per liter",
    dimensions: "5L can"
  },
  {
    id: "paint-3",
    name: "Sage Green Paint",
    type: "paint",
    category: "wall",
    imageUrl: "/products/paints/sage-green.png",
    thumbnailUrl: "/products/paints/thumbs/sage-green.png",
    price: 32.99,
    brand: "PaintPro",
    colors: ["#9CAF88", "#8FBC8F", "#90EE90"],
    description: "Calming sage green paint for peaceful spaces",
    material: "Acrylic",
    finish: "Matte",
    coverage: "12m² per liter",
    dimensions: "5L can"
  },
  {
    id: "paint-4",
    name: "Warm Beige Paint",
    type: "paint",
    category: "wall",
    imageUrl: "/products/paints/warm-beige.png",
    thumbnailUrl: "/products/paints/thumbs/warm-beige.png",
    price: 31.99,
    brand: "PaintPro",
    colors: ["#F5F5DC", "#DEB887", "#D2B48C"],
    description: "Warm beige paint for cozy, inviting interiors",
    material: "Acrylic",
    finish: "Matte",
    coverage: "12m² per liter",
    dimensions: "5L can"
  }
];

export default function LibraryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getProductsByType = (type: string) => {
    return filteredProducts.filter(product => product.type === type);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Product Library</h1>
        <p className="text-gray-600">Explore our comprehensive collection of interior materials</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="wall">Wall</option>
            <option value="floor">Floor</option>
            <option value="ceiling">Ceiling</option>
          </select>
          
          <div className="flex border border-gray-300 rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Product Tabs */}
      <Tabs defaultValue="pvc-panel" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="pvc-panel" className="text-lg font-semibold">
            PVC Panels
          </TabsTrigger>
          <TabsTrigger value="wallpaper" className="text-lg font-semibold">
            Wallpapers
          </TabsTrigger>
          <TabsTrigger value="paint" className="text-lg font-semibold">
            Paints
          </TabsTrigger>
        </TabsList>

        {/* PVC Panel Tab */}
        <TabsContent value="pvc-panel" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getProductsByType("pvc-panel").map((product) => (
              <ProductCard key={product.id} product={product} viewMode={viewMode} />
            ))}
          </div>
        </TabsContent>

        {/* Wallpaper Tab */}
        <TabsContent value="wallpaper" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getProductsByType("wallpaper").map((product) => (
              <ProductCard key={product.id} product={product} viewMode={viewMode} />
            ))}
          </div>
        </TabsContent>

        {/* Paint Tab */}
        <TabsContent value="paint" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getProductsByType("paint").map((product) => (
              <ProductCard key={product.id} product={product} viewMode={viewMode} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductCard({ product, viewMode }: { product: Product; viewMode: "grid" | "list" }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
      <div className="aspect-square overflow-hidden rounded-t-lg">
        <img
          src={product.thumbnailUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
              {product.name}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mb-2">
              {product.description}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="ml-2">
            {product.brand}
          </Badge>
        </div>
        
        {/* Product Details */}
        <div className="space-y-2 text-sm text-gray-600">
          {product.material && (
            <div className="flex justify-between">
              <span className="font-medium">Material:</span>
              <span>{product.material}</span>
            </div>
          )}
          {product.finish && (
            <div className="flex justify-between">
              <span className="font-medium">Finish:</span>
              <span>{product.finish}</span>
            </div>
          )}
          {product.dimensions && (
            <div className="flex justify-between">
              <span className="font-medium">Dimensions:</span>
              <span>{product.dimensions}</span>
            </div>
          )}
          {product.coverage && (
            <div className="flex justify-between">
              <span className="font-medium">Coverage:</span>
              <span>{product.coverage}</span>
            </div>
          )}
        </div>

        {/* Color Swatches */}
        <div className="flex gap-2 mt-3">
          {product.colors.map((color, index) => (
            <div
              key={index}
              className="w-6 h-6 rounded-full border-2 border-gray-200"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-gray-900">
            ${product.price}
          </span>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            Add to Project
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
