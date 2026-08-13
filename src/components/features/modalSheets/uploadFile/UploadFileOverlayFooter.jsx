import { View } from "react-native";
import Button from "@/src/components/ui/button/Button";

const UploadFileOverlayFooter = ({
  leftButtonText,
  rightButtonText,
  leftBtnOnPress,
  rightButtonOnPress,
  leftBtnDisabled,
  rightBtnDisabled,
}) => {
  return (
    <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 25 }}>
      <Button
        text={leftButtonText}
        onPress={leftBtnOnPress}
        disabled={leftBtnDisabled}
      />
      <Button
        text={rightButtonText}
        onPress={rightButtonOnPress}
        disabled={rightBtnDisabled}
      />
    </View>
  );
};

export default UploadFileOverlayFooter;
