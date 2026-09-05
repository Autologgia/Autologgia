"use client";

import type { AnchorHTMLAttributes } from "react";
import {
  trackGA4Event,
  type SafeAnalyticsParameters,
} from "@/lib/analytics";

type TrackedLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "onClick"> & {
  eventName: "click_phone" | "click_whatsapp" | "click_maps";
  eventParameters: SafeAnalyticsParameters;
};

export default function TrackedLink({
  eventName,
  eventParameters,
  children,
  ...anchorProps
}: TrackedLinkProps) {
  return (
    <a
      {...anchorProps}
      onClick={() => trackGA4Event(eventName, eventParameters)}
    >
      {children}
    </a>
  );
}
