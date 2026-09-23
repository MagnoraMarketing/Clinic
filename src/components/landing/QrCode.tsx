"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Real, scannable QR code (SVG) – used on reception cards and in the admin. */
export function QrCode({ value, className = "", dark = "#07110f", light = "#ffffff" }: { value: string; className?: string; dark?: string; light?: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    const url = value.startsWith("http") ? value : `${window.location.origin}${value}`;
    QRCode.toString(url, { type: "svg", margin: 1, color: { dark, light }, errorCorrectionLevel: "M" }).then(setSvg).catch(() => setSvg(""));
  }, [value, dark, light]);
  return <div className={`[&>svg]:h-full [&>svg]:w-full ${className}`} aria-label={`QR code for ${value}`} role="img" dangerouslySetInnerHTML={{ __html: svg }} />;
}
