import type { Theme } from "@/src/context/ThemeContext";
import type { TypographyVariant } from "@/constants/typography";
import { getTypographyColor } from "@/constants/typography";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "warning"
  | "info";

export type ButtonVariantStyle = {
  backgroundColor?: string;
  hoveredBackgroundColor: string;
  pressedBackgroundColor: string;
  typographyVariant: TypographyVariant;
};

export const buttonDefaults = {
  variant: "primary" satisfies ButtonVariant,
} as const;

export const getButtonVariantStyle = (
  theme: Theme,
  variant: ButtonVariant,
): ButtonVariantStyle => {
  switch (variant) {
    case "danger":
      return {
        // backgroundColor: theme.backgroundDanger,
        hoveredBackgroundColor: theme.iconHovered,
        pressedBackgroundColor: theme.iconPressed,
        typographyVariant: "danger",
      };
    case "primary":
    default:
      return {
        // backgroundColor: theme.primary,
        hoveredBackgroundColor: theme.iconHovered,
        pressedBackgroundColor: theme.iconPressed,
        typographyVariant: "primary",
      };
  }
};

export const resolveButtonTypographyVariant = (
  variantStyle: ButtonVariantStyle,
): TypographyVariant => variantStyle.typographyVariant;
