import React from "react";
import { useCurrentFrame } from "remotion";

/**
 * RoundedProgressiveSubtitle
 * - Exactly like ProgressiveHighlightSubtitle but with rounded borders
 * - Word-by-word highlighting animation
 * - Multi-language support (Arabic RTL)
 * - Rounded border radius for softer appearance
 */

export const RoundedProgressiveSubtitle: React.FC<{
  text: string;
  backgroundColor?: string;
  position?: "bottom" | "top" | "center";
  style?: React.CSSProperties;
  fontFamily?: string;
  startFrame: number;
  endFrame: number;
  config?: Record<string, unknown>;
  words?: Array<{
    word: string;
    start_frame: number;
    end_frame: number;
  }>;
}> = ({
  text,
  backgroundColor = "#007acc", // Default blue background (same as progressive highlight)
  position: _position,
  style = {},
  fontFamily,
  startFrame,
  endFrame,
  config,
  words,
}) => {
  const currentFrame = useCurrentFrame();
  const resolvedFontFamily = (config?.fontFamily as string) || fontFamily;

  const fallbackWords = text.trim().split(/\s+/).filter(Boolean);
  const displayWords = words && words.length > 0 ? words.map((w) => w.word) : fallbackWords;

  const getActiveWordIndex = (
    frame: number,
    timedWords: Array<{word: string; start_frame: number; end_frame: number}> | undefined,
    fallbackText: string,
    segmentStartFrame: number,
    segmentEndFrame: number,
  ): number => {
    if (timedWords && timedWords.length > 0) {
      for (let i = 0; i < timedWords.length; i++) {
        const wordStart = timedWords[i].start_frame;
        const wordEnd = i < timedWords.length - 1 ? timedWords[i + 1].start_frame : segmentEndFrame;
        if (frame >= wordStart && frame < wordEnd) {
          return i;
        }
      }
      if (frame < timedWords[0].start_frame) {
        return -1;
      }
      return timedWords.length - 1;
    }

    const splitWords = fallbackText.trim().split(/\s+/).filter(Boolean);
    if (splitWords.length === 0) {
      return -1;
    }

    const totalFrames = Math.max(1, segmentEndFrame - segmentStartFrame);
    const framesPerWord = totalFrames / splitWords.length;
    return Math.min(
      Math.floor((frame - segmentStartFrame) / framesPerWord),
      splitWords.length - 1,
    );
  };

  const currentWordIndex = getActiveWordIndex(currentFrame, words, text, startFrame, endFrame);

  const resolvedFontSize = (config?.fontSize as string) || "48px";
  const parsedFontSize = Number.parseFloat(resolvedFontSize);
  const fontSize = Number.isFinite(parsedFontSize) ? parsedFontSize : 48;
  const resolvedBackgroundColor =
    (config?.backgroundColor as string) || backgroundColor || "#007acc";

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    gap: 0, // No gap between words for natural spacing
    padding: "0 8px",
    pointerEvents: "none",
    ...style,
  };

  // Detect if text contains Arabic characters
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);

  // Font selection logic with multi-language support
  const getFinalFontFamily = () => {
    if (resolvedFontFamily) {
      return resolvedFontFamily; // Use custom font if specified
    }

    if (hasArabic) {
      return "Cairo, 'Noto Sans Arabic', 'Arabic Typesetting', Arial, sans-serif";
    } else {
      return "Roboto, 'Segoe UI', Arial, sans-serif";
    }
  };

  const finalFontFamily = getFinalFontFamily();
  const fontWeight = 700;

  return (
    <div style={containerStyle}>
      {displayWords.map((word, index) => {
        const isHighlighted = index === currentWordIndex;

        const wordStyle: React.CSSProperties = {
          fontFamily: finalFontFamily,
          fontSize,
          fontWeight,
          color: "#ffffff",
          padding: "4px 6px", // Same tight spacing as progressive highlight
          margin: "0 0.5px", // Same tight margin as progressive highlight
          borderRadius: 8, // ROUNDED BORDER - Main difference from progressive highlight
          backgroundColor: isHighlighted ? resolvedBackgroundColor : "transparent",
          transition: "background-color 0.2s ease",
          textTransform: "none",
          letterSpacing: 0, // No extra letter spacing
          lineHeight: 1.2,
          // Multi-layer text-shadow to create 2px black outline without affecting font rendering
          textShadow:
            "-2px -2px 0 rgba(0, 0, 0, 0.8), " +
            "2px -2px 0 rgba(0, 0, 0, 0.8), " +
            "-2px 2px 0 rgba(0, 0, 0, 0.8), " +
            "2px 2px 0 rgba(0, 0, 0, 0.8), " +
            "0px -2px 0 rgba(0, 0, 0, 0.8), " +
            "0px 2px 0 rgba(0, 0, 0, 0.8), " +
            "-2px 0px 0 rgba(0, 0, 0, 0.8), " +
            "2px 0px 0 rgba(0, 0, 0, 0.8), " +
            "-1px -1px 0 rgba(0, 0, 0, 0.8), " +
            "1px -1px 0 rgba(0, 0, 0, 0.8), " +
            "-1px 1px 0 rgba(0, 0, 0, 0.8), " +
            "1px 1px 0 rgba(0, 0, 0, 0.8), " +
            "3px 3px 4px rgba(0, 0, 0, 0.5)", // Drop shadow for depth
          boxShadow: isHighlighted ? "0 2px 8px rgba(0,0,0,0.4)" : "none", // Enhanced shadow
          transform: isHighlighted ? "scale(1.05)" : "scale(1)",
          display: "inline-block",
          direction: hasArabic ? "rtl" : "ltr", // RTL support for Arabic
        };

        return (
          <span key={index} style={wordStyle}>
            {word}
          </span>
        );
      })}
    </div>
  );
};

// Metadata for the subtitle style
export const RoundedProgressiveSubtitleMeta = {
  name: "rounded_progressive",
  displayName: "Rounded Progressive",
  defaultBackground: "#007acc", // Default blue background (same as progressive highlight)
  allowsBackground: true,
  defaultPosition: "bottom",
  animated: true,
  supportsMultiLanguage: true,
  supportedFonts: [
    // Arabic fonts
    "Cairo",
    "Amiri",
    "Scheherazade New",
    "Noto Sans Arabic",
    "Arabic Typesetting",
    "Tahoma",
    // English fonts
    "Roboto",
    "Open Sans",
    "Montserrat",
    "Lato",
    "Source Sans Pro",
    "Inter",
    "Poppins",
  ],
};
