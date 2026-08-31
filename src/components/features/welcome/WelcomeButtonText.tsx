import Typography from "@/src/components/ui/typography/Typography";
import { LoginColors, LoginTheme } from "@/constants/LoginColors";

type WelcomeButtonTextType = "submit" | "back";

interface WelcomeButtonTextProps {
  type: WelcomeButtonTextType;
  label?: string;
  translationKey?: string;
}

const WelcomeButtonText = ({
  type,
  label,
  translationKey,
}: WelcomeButtonTextProps) => {
  const loginTheme: LoginTheme = "default";

  return (
    <Typography
      weight="semibold"
      color={
        type === "submit"
          ? LoginColors[loginTheme].submitButtonTextColor
          : LoginColors[loginTheme].backButtonTextColor
      }
      text={label}
      translationKey={translationKey}
    />
  );
};

export default WelcomeButtonText;
