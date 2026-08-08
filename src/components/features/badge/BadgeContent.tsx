import { useContext } from "react";
import { ThemeContext } from "@/src/context/ThemeContext";
import Typography from "@/src/components/ui/typography/Typography";
import Icon from "@/src/components/ui/icon/Icon";

const BadgeContent = ({ name, icon, textColor }: any) => {
  const { theme } = useContext(ThemeContext);
  const defaultTextColor = textColor || theme.text;
  return (
    <>
      {icon && <Icon name={icon} size={12} color={defaultTextColor} />}
      <Typography
        color={defaultTextColor}
        size="xs"
        weight="bold"
        text={name}
      />
    </>
  );
};

export default BadgeContent;
