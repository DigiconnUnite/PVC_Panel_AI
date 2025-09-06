"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Grid3X3, List, Loader2 } from "lucide-react";
import useSWR from "swr";
import { getProducts, Product } from "@/lib/api";

// Product interface imported from API

// Products will be fetched from API

export default function LibraryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: products, isLoading: loadingProducts, error: productsError } = useSWR("products", getProducts, {
    fallbackData: []
  });

  const filteredProducts = products?.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const getProductsByType = (type: string) => {
    return filteredProducts.filter((product: Product) => product.type === type);
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
          {loadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-gray-600">Loading products...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {getProductsByType("pvc-panel").map((product) => (
                <ProductCard key={product.id} product={product} viewMode={viewMode} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Wallpaper Tab */}
        <TabsContent value="wallpaper" className="space-y-6">
          {loadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-gray-600">Loading products...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {getProductsByType("wallpaper").map((product) => (
                <ProductCard key={product.id} product={product} viewMode={viewMode} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Paint Tab */}
        <TabsContent value="paint" className="space-y-6">
          {loadingProducts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-gray-600">Loading products...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {getProductsByType("paint").map((product) => (
                <ProductCard key={product.id} product={product} viewMode={viewMode} />
              ))}
            </div>
          )}
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
          src={product.thumbnailUrl || "/placeholder.svg"}
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
              {product.type} product
            </CardDescription>
          </div>
          <Badge variant="secondary" className="ml-2">
            {product.brand || "Custom"}
          </Badge>
        </div>

        {/* Color Swatches */}
        <div className="flex gap-2 mt-3">
          {product.colors?.map((color, index) => (
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
