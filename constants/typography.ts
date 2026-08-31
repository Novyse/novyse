import type { Theme } from "@/src/context/ThemeContext";

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    hero: 32,
  },
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
} as const;

export type TypographySize = keyof typeof typography.sizes;
export type TypographyWeight = keyof typeof typography.weights;

export type TypographyVariant =
  | "default"
  | "subtitle"
  | "link"
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "warning"
  | "info";

export const typographyDefaults = {
  size: "md" satisfies TypographySize,
  weight: "regular" satisfies TypographyWeight,
  variant: "default" satisfies TypographyVariant,
} as const;

export const getTypographyColor = (
  theme: Theme,
  variant: TypographyVariant,
): string => {
  switch (variant) {
    case "subtitle":
      return theme.subtitle;
    case "link":
      return theme.textLink;
    case "primary":
      return theme.primary;
    case "secondary":
      return theme.secondary;
    case "danger":
      return theme.dangerText;
    case "success":
      return theme.successText;
    case "warning":
      return theme.warningText;
    case "info":
      return theme.infoText;
    case "default":
    default:
      return theme.text;
  }
};
