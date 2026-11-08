import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";

/**
 * ProgressiveHighlightSubtitle
 * - White text with progressive word highlighting
 * - Each word gets a background color in sequence based on timing
 * - Background color moves from word to word over the duration
 * - Clean, modern style similar to the reference image
 * - PERFORMANCE OPTIMIZED: No CSS transitions, memoized calculations
 */
export const ProgressiveHighlightSubtitle: React.FC<{
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
  backgroundColor = "#007acc", // Default blue background (same as first phrase)
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

  // Memoize expensive calculations to prevent recalculation on every frame
  const { displayWords, hasArabic, finalFontFamily } = useMemo(() => {
    const fallbackWords = text.trim().split(/\s+/).filter(Boolean);
    const displayWords = words && words.length > 0 ? words.map((w) => w.word) : fallbackWords;

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

    return {
      displayWords,
      hasArabic,
      finalFontFamily: getFinalFontFamily()
    };
  }, [text, resolvedFontFamily, words]);

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
  const resolvedTextColor = (config?.textColor as string) || "#ffffff";

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    gap: 0, // No gap between words for natural spacing
    padding: "0 8px",
    pointerEvents: "none",
    // Add GPU acceleration for better performance
    willChange: "transform",
    transform: "translateZ(0)",
    backfaceVisibility: "hidden",
    ...style,
  };

  const fontWeight = 700;

  return (
    <div style={containerStyle}>
      {displayWords.map((word, index) => {
        const isHighlighted = index === currentWordIndex;

        const wordStyle: React.CSSProperties = {
          fontFamily: finalFontFamily,
          fontSize,
          fontWeight,
          color: isHighlighted ? resolvedTextColor : "#ffffff",
          padding: "4px 6px", // Reduced horizontal padding for tighter spacing
          margin: "0 0.5px", // Even smaller margin between words
          borderRadius: 1, // Small 1px border radius as requested
          backgroundColor: isHighlighted ? backgroundColor : "transparent",
          // REMOVED: transition: "background-color 0.2s ease", // Causes stuttering in Remotion
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
          // REMOVED: transform: isHighlighted ? "scale(1.05)" : "scale(1)", // Causes stuttering
          display: "inline-block",
          direction: hasArabic ? "rtl" : "ltr", // RTL support for Arabic
          // Add GPU acceleration for better performance
          willChange: "background-color",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
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

export const ProgressiveHighlightSubtitleMeta = {
  name: "progressive_highlight",
  displayName: "Progressive Highlight",
  defaultBackground: "#007acc", // Default blue background (same as first phrase)
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
