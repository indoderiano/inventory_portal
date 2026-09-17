/**
 * Types describing the DummyJSON `products` resource.
 * @see https://dummyjson.com/docs/products
 */

export interface ProductDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface ProductReview {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  reviewerEmail: string;
}

export interface ProductMeta {
  createdAt: string;
  updatedAt: string;
  barcode: string;
  qrCode: string;
}

export type ProductAvailabilityStatus =
  | "In Stock"
  | "Low Stock"
  | "Out of Stock";

export interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  tags: string[];
  brand?: string;
  sku: string;
  weight: number;
  dimensions: ProductDimensions;
  warrantyInformation: string;
  shippingInformation: string;
  availabilityStatus: ProductAvailabilityStatus;
  reviews: ProductReview[];
  returnPolicy: string;
  minimumOrderQuantity: number;
  meta: ProductMeta;
  images: string[];
  thumbnail: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

export interface ProductCategory {
  slug: string;
  name: string;
  url: string;
}

export type ProductSortField =
  | "title"
  | "price"
  | "rating"
  | "stock"
  | "category"
  | "brand";

export type SortOrder = "asc" | "desc";

export interface GetProductsArgs {
  limit?: number;
  skip?: number;
  q?: string;
  category?: string;
  sortBy?: ProductSortField;
  order?: SortOrder;
}

/** Fields accepted by DummyJSON's mock "add product" endpoint. */
export type CreateProductRequest = Partial<
  Omit<Product, "id" | "meta" | "reviews" | "rating">
> &
  Pick<Product, "title">;

/** Fields accepted by DummyJSON's mock "update product" endpoint. */
export type UpdateProductRequest = Partial<Omit<Product, "id">> & {
  id: number;
};
