import React from "react";

/**
 * RectangularSubtitle
 * - Rectangular background with no border radius
 * - Text shadow behind the text
 * - Supports multiple fonts for Arabic and English
 * - Clean, professional appearance
 */

export const RectangularSubtitle: React.FC<{
  text: string;
  backgroundColor?: string;
  textColor?: string;
  position?: "bottom" | "top" | "center";
  style?: React.CSSProperties;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  config?: Record<string, unknown>;
}> = ({
  text,
  backgroundColor = "#000000", // Default black background
  textColor = "#ffffff", // Default white text
  position: _position,
  style = {},
  fontFamily,
  fontSize = 48,
  fontWeight = "bold",
  config,
}) => {

  // Detect if text contains Arabic characters
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);

  // Font selection logic
  const getFinalFontFamily = () => {
    if (fontFamily) {
      return fontFamily; // Use custom font if specified
    }

    if (hasArabic) {
      return "Cairo, 'Noto Sans Arabic', 'Arabic Typesetting', Arial, sans-serif";
    } else {
      return "Roboto, 'Segoe UI', Arial, sans-serif";
    }
  };

  const resolvedFontFamily =
    (config?.fontFamily as string) || fontFamily || getFinalFontFamily();
  const resolvedFontSize = (config?.fontSize as string) || `${fontSize}px`;
  const parsedFontSize = Number.parseFloat(resolvedFontSize);
  const finalFontSize = Number.isFinite(parsedFontSize) ? parsedFontSize : fontSize;
  const resolvedBackgroundColor =
    (config?.backgroundColor as string) || backgroundColor || "#000000";
  const resolvedTextColor = (config?.textColor as string) || textColor || "#ffffff";

  const containerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "0 8px",
    pointerEvents: "none",
    ...style,
  };

  const textStyle: React.CSSProperties = {
    fontFamily: resolvedFontFamily,
    fontSize: finalFontSize,
    fontWeight,
    color: resolvedTextColor,
    backgroundColor: resolvedBackgroundColor,
    padding: "12px 24px", // Generous padding for rectangular look
    borderRadius: 0, // No border radius for rectangular appearance
    textAlign: "center",
    textTransform: "none",
    letterSpacing: 0.5,
    lineHeight: 1.3,
    maxWidth: "80%",
    wordWrap: "break-word",
    direction: hasArabic ? "rtl" : "ltr", // RTL for Arabic text
    textShadow: "2px 2px 4px rgba(0, 0, 0, 0.7)", // Shadow behind text
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)", // Shadow behind background
    display: "inline-block",
  };

  return (
    <div style={containerStyle}>
      <div style={textStyle}>
        {text}
      </div>
    </div>
  );
};

// Metadata for the subtitle style
export const RectangularSubtitleMeta = {
  name: "rectangular",
  displayName: "Rectangular",
  defaultBackground: "#000000", // Default black background
  defaultTextColor: "#ffffff", // Default white text
  allowsBackground: true,
  allowsTextColor: true,
  defaultPosition: "bottom",
  animated: false,
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
