import type { Product, ProductsResponse } from "@/types/product";

export const mockProduct: Product = {
  id: 1,
  title: "Essence Mascara Lash Princess",
  description: "The Essence Mascara Lash Princess is a popular mascara.",
  category: "beauty",
  price: 9.99,
  discountPercentage: 7.17,
  rating: 4.94,
  stock: 5,
  tags: ["beauty", "mascara"],
  brand: "Essence",
  sku: "BEA-ESS-ESS-001",
  weight: 2,
  dimensions: { width: 15.14, height: 13.08, depth: 22.99 },
  warrantyInformation: "No warranty",
  shippingInformation: "Ships in 1 month",
  availabilityStatus: "In Stock",
  reviews: [],
  returnPolicy: "No return policy",
  minimumOrderQuantity: 24,
  meta: {
    createdAt: "2024-05-23T08:56:21.618Z",
    updatedAt: "2024-05-23T08:56:21.618Z",
    barcode: "9164035109868",
    qrCode: "https://dummyjson.com/public/qr-code.png",
  },
  images: ["https://cdn.dummyjson.com/products/images/beauty/1/1.png"],
  thumbnail: "https://cdn.dummyjson.com/products/images/beauty/1/thumbnail.png",
};

export const mockProductsResponse: ProductsResponse = {
  products: [mockProduct],
  total: 1,
  skip: 0,
  limit: 30,
};
