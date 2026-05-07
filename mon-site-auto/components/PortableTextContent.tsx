import { PortableText } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import type { PortableTextComponents } from "@portabletext/react";

const components: PortableTextComponents = {
  block: {
    normal:  ({ children }) => <p className="leading-relaxed">{children}</p>,
    h2:      ({ children }) => <p className="font-heading text-2xl font-light leading-snug">{children}</p>,
    h3:      ({ children }) => <p className="font-heading text-xl font-light leading-snug">{children}</p>,
    small:   ({ children }) => <p className="text-sm leading-relaxed">{children}</p>,
    center:  ({ children }) => <p className="text-center leading-relaxed">{children}</p>,
    right:   ({ children }) => <p className="text-right leading-relaxed">{children}</p>,
    justify: ({ children }) => <p className="text-justify leading-relaxed">{children}</p>,
  },
  marks: {
    strong:    ({ children }) => <strong className="font-bold">{children}</strong>,
    em:        ({ children }) => <em className="italic">{children}</em>,
    underline: ({ children }) => <span className="underline underline-offset-2">{children}</span>,
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc space-y-1 pl-5 leading-relaxed">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal space-y-1 pl-5 leading-relaxed">{children}</ol>,
    dash:   ({ children }) => <ul className="space-y-1 pl-5 leading-relaxed" style={{ listStyleType: '"— "' }}>{children}</ul>,
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
    dash:   ({ children }) => <li>{children}</li>,
  },
};

type Value = PortableTextBlock[] | string | undefined | null;

export function ptToPlainText(value: Value): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value
    .filter((b) => b._type === "block")
    .map((b) =>
      ((b as { children?: Array<{ text?: string }> }).children ?? [])
        .map((c) => c.text ?? "")
        .join("")
    )
    .join(" ")
    .trim();
}

export default function PortableTextContent({
  value,
  className = "",
}: {
  value: Value;
  className?: string;
}) {
  if (!value) return null;
  if (typeof value === "string") {
    return <p className={`whitespace-pre-line leading-relaxed ${className}`}>{value}</p>;
  }
  if (value.length === 0) return null;
  return (
    <div className={`space-y-3 ${className}`}>
      <PortableText value={value} components={components} />
    </div>
  );
}
