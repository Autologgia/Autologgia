import type { PortableTextBlock } from "@portabletext/types";

export type SanityImage = {
  _key: string;
  asset: {
    _ref: string;
    _type: "reference";
  };
};

export type Car = {
  name: string;
  slug: string;
  price: string;
  year: number;
  mileage: string;
  transmission: string;
  fuel: string;
  power: string;
  images: SanityImage[];
  description?: PortableTextBlock[] | string;
  status?: string;
  location?: string;
  critAir?: string;
  options?: string[];
  brand?: string;
  model?: string;
  category?: string;
  numericPrice?: number;
  historyText?: PortableTextBlock[] | string;
  historyFile?: { asset: { url: string } };
};
