import React from "react";

/**
 * ArabicBannerSubtitle
 * - Two lines, both bold, uppercase (if not Arabic), centered
 * - Top line: backgroundColor (default: black), white text, rounded pill
 * - Bottom line: white background, colored text (backgroundColor or orange), rounded pill
 * - RTL support for Arabic
 * - backgroundColor: required for top, used for bottom text color if present
 */
export const ArabicBannerSubtitle: React.FC<{
  text: string;
  backgroundColor?: string;
  position?: "bottom" | "top" | "center";
  style?: React.CSSProperties;
  animationFrame?: number;
  showTop?: boolean;
  showBottom?: boolean;
  topBg?: string;
  bottomColor?: string;
  bottomBg?: string;
  fontFamily?: string; // NEW: Custom font family support
  config?: Record<string, unknown>;
}> = ({
  text,
  backgroundColor: _backgroundColor,
  position: _position,
  style = {},
  animationFrame = 0,
  showTop = true,
  showBottom = true,
  topBg,
  bottomColor,
  bottomBg = "#fff",
  fontFamily, // NEW: Custom font family
  config,
}) => {
  // Split text into two lines
  const [top, bottom] = text.split("\n").length > 1
    ? text.split("\n")
    : [text, ""];

  // Detect Arabic
  const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);

  // Staggered animation: first line appears first, then second line joins
  const firstLineDelay = 0; // First line starts immediately
  const secondLineDelay = 15; // Second line starts after 15 frames (0.5 seconds at 30fps)

  // First line animation
  const firstLineProgress = Math.max(0, Math.min((animationFrame - firstLineDelay) / 15, 1));
  const firstLineAnim = {
    transform: `scale(${0.8 + 0.2 * firstLineProgress}) translateY(${20 * (1 - firstLineProgress)}px)`,
    opacity: firstLineProgress,
  };

  // Second line animation (starts later)
  const secondLineProgress = Math.max(0, Math.min((animationFrame - secondLineDelay) / 15, 1));
  const secondLineAnim = {
    transform: `scale(${0.8 + 0.2 * secondLineProgress}) translateY(${20 * (1 - secondLineProgress)}px)`,
    opacity: secondLineProgress,
  };

  const resolvedBackgroundColor =
    (config?.backgroundColor as string) || _backgroundColor || '#ff8800';
  const resolvedFontSize = (config?.fontSize as string) || '54px';
  const parsedFontSize = Number.parseFloat(resolvedFontSize);
  const fontSize = Number.isFinite(parsedFontSize) ? parsedFontSize : 54;
  const resolvedFontFamily =
    (config?.fontFamily as string) ||
    fontFamily ||
    (isArabic
      ? 'Cairo, "Noto Sans Arabic", "Amiri", "Scheherazade", sans-serif'
      : 'Roboto, "Open Sans", Arial, sans-serif');
  const resolvedTopBg = topBg || resolvedBackgroundColor;
  const resolvedBottomColor = bottomColor || resolvedBackgroundColor;

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    pointerEvents: "none",
    gap: 12,
    ...style,
  };

  const fontWeight = 900;

  return (
    <div style={containerStyle}>
      {showTop && top && (
        <span
          style={{
            fontFamily: resolvedFontFamily,
            fontWeight,
            fontSize,
            color: "#fff",
            background: resolvedTopBg,
            borderRadius: 32,
            padding: "10px 32px",
            marginBottom: 6,
            textAlign: "center",
            direction: isArabic ? "rtl" : "ltr",
            textTransform: isArabic ? undefined : "uppercase",
            boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
            letterSpacing: 1.2,
            // Apply first line animation
            ...firstLineAnim,
          }}
        >
          {top}
        </span>
      )}
      {showBottom && bottom && (
        <span
          style={{
            fontFamily: resolvedFontFamily,
            fontWeight,
            fontSize,
            color: resolvedBottomColor,
            background: bottomBg,
            borderRadius: 32,
            padding: "10px 32px",
            textAlign: "center",
            direction: isArabic ? "rtl" : "ltr",
            textTransform: isArabic ? undefined : "uppercase",
            boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
            letterSpacing: 1.2,
            // Apply second line animation (delayed)
            ...secondLineAnim,
          }}
        >
          {bottom}
        </span>
      )}
    </div>
  );
};

export const ArabicBannerSubtitleMeta = {
  name: "arabic_banner",
  displayName: "Arabic Banner",
  defaultBackground: "#000",
  allowsBackground: true,
  defaultPosition: "bottom",
  animated: true,
};
