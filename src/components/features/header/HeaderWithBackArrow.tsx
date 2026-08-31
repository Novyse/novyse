import { View } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import AppHeader from "@/src/components/features/header/AppHeader";
import { headerIconButtonStyle } from "@/src/components/features/header/AppHeaderRow";
import Icon from "@/src/components/ui/icon/Icon";

interface HeaderWithBackArrowProps {
  title?: string;
  translationKey?: string;
  onBack?: () => void;
}

const HeaderWithBackArrow = ({
  title,
  translationKey,
  onBack,
}: HeaderWithBackArrowProps) => {
  const titleNode = translationKey ? (
    <Typography
      weight="semibold"
      translationKey={translationKey}
      numberOfLines={1}
    />
  ) : title ? (
    <Typography weight="semibold" text={title} numberOfLines={1} />
  ) : null;

  return (
    <AppHeader
      left={
        onBack ? (
          <Icon
            name="ArrowLeft02Icon"
            onPress={onBack}
            style={headerIconButtonStyle.iconButton}
          />
        ) : undefined
      }
      center={titleNode}
      right={<View style={headerIconButtonStyle.iconButton} />}
    />
  );
};

export default HeaderWithBackArrow;
