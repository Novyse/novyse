import { useContext, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TextInputKeyPressEvent,
  ViewStyle,
  TextStyle,
} from "react-native";
import { ThemeContext } from "@/src/context/ThemeContext";

interface OtpDigitsInputProps {
  value?: string[];
  onChange: (otp: string[]) => void;
  error?: boolean;
  inputCount?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  inputErrorStyle?: TextStyle;
  autoFocus?: boolean;
  allowLetters?: boolean;
}

const OtpDigitsInput = ({
  value = ["", "", "", "", "", ""],
  onChange,
  error,
  inputCount = 6,
  style,
  inputStyle,
  inputErrorStyle,
  autoFocus = false,
  allowLetters = false,
}: OtpDigitsInputProps) => {
  const refs = useRef<(TextInput | null)[]>([]);
  const { theme } = useContext(ThemeContext);
  const styles = createStyle(theme);

  const isValidChar = (text: string): boolean => {
    if (allowLetters) {
      return /^[A-Za-z0-9]$/.test(text);
    }
    return /^\d$/.test(text);
  };

  const isValidFullInput = (text: string): boolean => {
    if (allowLetters) {
      return new RegExp(`^[A-Za-z0-9]{${inputCount}}$`).test(text);
    }
    return new RegExp(`^\\d{${inputCount}}$`).test(text);
  };

  const handleChange = (text: string, index: number): void => {
    const newOtp = [...value];

    if (text.length === 1 && isValidChar(text)) {
      const char = allowLetters ? text.toUpperCase() : text;
      newOtp[index] = char;
      onChange(newOtp);
      if (index < inputCount - 1) {
        refs.current[index + 1]?.focus();
      }
    } else if (text.length === inputCount && isValidFullInput(text)) {
      const upperText = allowLetters ? text.toUpperCase() : text;
      for (let i = 0; i < inputCount; i++) {
        newOtp[i] = upperText.charAt(i);
      }
      onChange(newOtp);
      const lastFilledIndex = inputCount - 1;
      refs.current[lastFilledIndex]?.focus();
    } else if (text.length === 0) {
      newOtp[index] = "";
      onChange(newOtp);
    }
    // Ignora qualsiasi altro input senza fare nulla
  };

  const handleKeyPress = (e: TextInputKeyPressEvent, index: number): void => {
    if (e.nativeEvent.key === "Backspace") {
      if (value[index] === "" && index > 0) {
        refs.current[index - 1]?.focus();
        const newOtp = [...value];
        newOtp[index - 1] = "";
        onChange(newOtp);
      }
    } else if (e.nativeEvent.key === "ArrowRight") {
      if (index < inputCount - 1) refs.current[index + 1]?.focus();
    } else if (e.nativeEvent.key === "ArrowLeft") {
      if (index > 0) refs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={[styles.otpContainer, style]}>
      {Array.from({ length: inputCount }).map((_, index) => (
        <TextInput
          key={index}
          style={[
            styles.otpInput,
            inputStyle,
            error ? [styles.inputError, inputErrorStyle] : null,
          ]}
          value={value[index]}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          keyboardType={allowLetters ? "default" : "numeric"}
          maxLength={inputCount}
          ref={(el) => {
            refs.current[index] = el;
          }}
          autoFocus={autoFocus && index === 0}
          caretHidden={false}
        />
      ))}
    </View>
  );
};

const createStyle = (theme: any) => StyleSheet.create({
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 300,
    marginBottom: 20,
  },
  otpInput: {
    width: 40,
    height: 50,
    borderWidth: 1.5,
    borderRadius: 6,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    color: theme.text,
    backgroundColor: theme.backgroundInput,
    outlineStyle: "none",
  } as any,
  inputError: {
    borderColor: theme.dangerText,
    backgroundColor: theme.backgroundDanger,
  },
});

export default OtpDigitsInput;
