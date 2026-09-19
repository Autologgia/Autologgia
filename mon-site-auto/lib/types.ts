import type { PortableTextBlock } from "@portabletext/types";

export type SanityImage = {
  _key: string;
  asset: {
    _ref: string;
    _type: "reference";
  };
};

export type DeliveryImage = {
  _key: string;
  url: string;
  altText: string;
  width?: number | null;
  height?: number | null;
};

export type CarImage = SanityImage | DeliveryImage;

export type Car = {
  name: string;
  slug: string;
  price?: string | number;
  year: string | number;
  mileage: string | number;
  transmission: string;
  fuel: string;
  power: string | number;
  images: CarImage[];
  description?: PortableTextBlock[] | string;
  status?: string;
  location?: string;
  critAir?: string;
  options?: string[];
  brand?: string;
  model?: string;
  category?: string;
  numericPrice?: number | string;
  historyText?: PortableTextBlock[] | string;
  historyFile?: { asset: { url: string } };
  hasHistoryFile?: boolean;
  updatedAt?: string;
};
