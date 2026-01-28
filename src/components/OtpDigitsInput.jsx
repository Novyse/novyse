import React, { useRef } from "react";
import { View, TextInput, StyleSheet } from "react-native";

const OtpDigitsInput = ({
  value = ["", "", "", "", "", ""],
  onChange,
  error,
  inputCount = 6,
  style,
  inputStyle,
  inputErrorStyle,
  autoFocus = false,
}) => {
  const refs = useRef([]);

  const handleChange = (text, index) => {
    const newOtp = [...value];

    if (text.length === 1 && /^\d$/.test(text)) {
      newOtp[index] = text;
      onChange(newOtp);
      if (index < inputCount - 1) {
        refs.current[index + 1]?.focus();
      }
    } else if (text.length === 6 && /^\d{6}$/.test(text)) {
      for (let i = 0; i < inputCount; i++) {
        newOtp[i] = text.charAt(i);
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

  const handleKeyPress = (e, index) => {
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
          keyboardType="numeric"
          maxLength={inputCount}
          ref={(el) => (refs.current[index] = el)}
          autoFocus={autoFocus && index === 0}
          caretHidden={false}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
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
    borderColor: "#ccc",
    borderRadius: 6,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    color: "#222",
    backgroundColor: "white",
    outlineStyle: "none",
  },
  inputError: {
    borderColor: "rgba(255, 99, 99, 0.8)",
    backgroundColor: "rgba(255, 99, 99, 0.1)",
  },
});

export default OtpDigitsInput;