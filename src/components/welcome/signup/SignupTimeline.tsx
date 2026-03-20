import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LoginColors } from "@/constants/LoginColors";

interface Step {
  id: number;
  label: string;
}

interface Props {
  steps: Step[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepPress: (index: number) => void;
  loginTheme?: string;
}

export default function SignupTimeline({
  steps,
  currentStep,
  completedSteps,
  onStepPress,
  loginTheme = "default",
}: Props) {
  return (
    <View style={styles.timeline}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCompleted = completedSteps.has(index) && index !== currentStep;
        const isCurrent = index === currentStep;
        const isAccessible = completedSteps.has(index) || isCurrent;

        return (
          <React.Fragment key={step.id}>
            <View style={styles.dotContainer}>
              <Pressable
                style={[
                  styles.circle,
                  isCompleted
                    ? { backgroundColor: LoginColors[loginTheme].completedBackground, borderColor: LoginColors[loginTheme].completedBorder }
                    : isCurrent
                      ? { backgroundColor: LoginColors[loginTheme].currentBackground, borderColor: LoginColors[loginTheme].currentBorder }
                      : { backgroundColor: LoginColors[loginTheme].pendingBackground, borderColor: LoginColors[loginTheme].pendingBorder },
                ]}
                onPress={isAccessible ? () => onStepPress(index) : undefined}
                disabled={!isAccessible}
              >
                <Text style={[styles.number, { color: LoginColors[loginTheme].timelineNumber }]} selectable={false}>
                  {step.id}
                </Text>
              </Pressable>
            </View>
            {!isLast && (
              <View style={[styles.line, { backgroundColor: LoginColors[loginTheme].backgroundTimeline }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 32,
    maxWidth: 300,
  },
  dotContainer: {
    alignItems: "center",
    gap: 6,
  },
  circle: {
    width: 45,
    height: 45,
    borderRadius: 999,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  number: {
    fontWeight: "bold",
    fontSize: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
  },
  line: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    marginTop: 22,
  },
});
