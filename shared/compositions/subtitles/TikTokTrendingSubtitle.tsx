import React from "react";

/**
 * TikTokTrendingSubtitle
 * - Top line: white text, bold, black outline
 * - Bottom line: yellow text, bold, black outline
 * - Both lines: uppercase, heavy sans-serif, shadow, animated pop-in
 * - backgroundColor: optional (default: none)
 * - position: bottom (default)
 */
export const TikTokTrendingSubtitle: React.FC<{
  text: string;
  backgroundColor?: string;
  position?: "bottom" | "top" | "center";
  style?: React.CSSProperties;
  animationFrame?: number;
  fontFamily?: string; // NEW: Custom font family support
  config?: Record<string, unknown>;
}> = ({
  text,
  backgroundColor,
  position: _position,
  style = {},
  animationFrame = 0,
  fontFamily, // NEW: Custom font family
  config,
}) => {
  // Support both '\n' and '\\n' as line breaks
  const cleanText = text.replace(/\\n/g, '\n');
  const [top, bottom] = cleanText.split("\n").length > 1
    ? cleanText.split("\n")
    : [cleanText, ""];

  // Animation: pop-in with scale and fade
  const anim = {
    transform: `scale(${0.8 + 0.2 * Math.min(animationFrame / 10, 1)})`,
    opacity: Math.min(animationFrame / 10, 1),
    transition: "all 0.4s cubic-bezier(.5,1.8,.5,1)",
  };

  const resolvedFontSize = (config?.fontSize as string) || '48px';
  const parsedFontSize = Number.parseFloat(resolvedFontSize);
  const fontSize = Number.isFinite(parsedFontSize) ? parsedFontSize : 48;
  const resolvedBackgroundColor =
    (config?.backgroundColor as string) || backgroundColor || undefined;
  const resolvedFontFamily =
    (config?.fontFamily as string) || fontFamily || "Roboto, 'Segoe UI', Arial, sans-serif";
  const resolvedTopTextColor = (config?.textColor as string) || '#fff';
  const resolvedBottomTextColor = (config?.textColor as string) || '#ffe600';

  // Default background for this style: none (text has outline)
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    pointerEvents: "none",
    ...style,
    ...anim,
  };

  const fontWeight = 700;

  return (
    <div style={containerStyle}>
      <span
        style={{
          fontFamily: resolvedFontFamily,
          fontWeight,
          fontSize,
          color: resolvedTopTextColor,
          textTransform: "uppercase",
          textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)",
          textAlign: "center",
          letterSpacing: 0,
          lineHeight: 1.2,
          marginBottom: bottom ? 6 : 0,
          padding: resolvedBackgroundColor ? "8px 24px" : 0,
          background: resolvedBackgroundColor,
          borderRadius: resolvedBackgroundColor ? 16 : 0,
        }}
      >
        {top}
      </span>
      {bottom && (
        <span
          style={{
            fontFamily: resolvedFontFamily,
            fontWeight,
            fontSize,
            color: resolvedBottomTextColor,
            textTransform: "uppercase",
            textShadow: "1px 1px 2px rgba(0, 0, 0, 0.8)",
            textAlign: "center",
            letterSpacing: 0,
            lineHeight: 1.2,
            marginTop: 2,
            padding: resolvedBackgroundColor ? "8px 24px" : 0,
            background: resolvedBackgroundColor,
            borderRadius: resolvedBackgroundColor ? 16 : 0,
          }}
        >
          {bottom}
        </span>
      )}
    </div>
  );
};

// Register for subtitle registry (if needed)
export const TikTokTrendingSubtitleMeta = {
  name: "tiktok_trending",
  displayName: "TikTok Trending",
  defaultBackground: undefined, // no background by default
  allowsBackground: true,
  defaultPosition: "bottom",
  animated: true,
};
