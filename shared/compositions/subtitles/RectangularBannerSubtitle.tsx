import React from "react";

/**
 * RectangularBannerSubtitle - Individual subtitle with sharp corners
 * - Works as individual subtitles that appear sequentially and can overlap
 * - Sharp rectangular corners (0px border radius) - MAIN DIFFERENCE from ArabicBanner
 * - Same styling and animation as ArabicBanner but for single lines
 */
export const RectangularBannerSubtitle: React.FC<{
  text: string;
  backgroundColor?: string;
  position?: "bottom" | "top" | "center";
  style?: React.CSSProperties;
  fontFamily?: string;
  animationFrame?: number;
  config?: Record<string, unknown>;
}> = ({
  text,
  backgroundColor = "#ff8800",
  position: _position,
  style = {},
  fontFamily,
  animationFrame = 0,
  config,
}) => {
  // Detect Arabic
  const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);

  // Simple entrance animation (like ArabicBanner)
  const animationProgress = Math.max(0, Math.min(animationFrame / 15, 1));
  const animationStyle = {
    transform: `scale(${0.8 + 0.2 * animationProgress}) translateY(${20 * (1 - animationProgress)}px)`,
    opacity: animationProgress,
  };

  const resolvedFontSize = (config?.fontSize as string) || '54px';
  const parsedFontSize = Number.parseFloat(resolvedFontSize);
  const fontSize = Number.isFinite(parsedFontSize) ? parsedFontSize : 54;
  const resolvedBackgroundColor =
    (config?.backgroundColor as string) || backgroundColor || '#ff8800';
  const resolvedTextColor = (config?.textColor as string) || '#fff';
  const resolvedFontFamily =
    (config?.fontFamily as string) ||
    fontFamily ||
    (isArabic
      ? 'Cairo, "Noto Sans Arabic", "Amiri", "Scheherazade", sans-serif'
      : 'Roboto, "Open Sans", Arial, sans-serif');

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    pointerEvents: "none",
    gap: 12,
    ...style,
  };

  const textStyle: React.CSSProperties = {
    fontFamily: resolvedFontFamily,
    fontWeight: 900,
    fontSize,
    color: resolvedTextColor,
    background: resolvedBackgroundColor,
    borderRadius: 0, // RECTANGULAR - Main difference from ArabicBanner (which uses 32px)
    padding: "10px 32px",
    textAlign: "center",
    direction: isArabic ? "rtl" : "ltr",
    textTransform: isArabic ? undefined : "uppercase",
    boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
    letterSpacing: 1.2,
    // Apply animation
    ...animationStyle,
  };

  return (
    <div style={containerStyle}>
      <span style={textStyle}>
        {text}
      </span>
    </div>
  );
};
