import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { LoginColors, LoginTheme } from "@/constants/LoginColors";

interface Props {
  steps: { id: number }[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepPress: (index: number) => void;
  loginTheme?: LoginTheme;
}

export default function SignupTimeline({
  steps,
  currentStep,
  completedSteps,
  onStepPress,
  loginTheme = "default",
}: Props) {
  const styles = createStyles(loginTheme);

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
                    ? styles.circleCompleted
                    : isCurrent
                      ? styles.circleCurrent
                      : styles.circlePending,
                ]}
                onPress={isAccessible ? () => onStepPress(index) : undefined}
                disabled={!isAccessible}
              >
                <Typography
                  size="md"
                  weight="bold"
                  color={LoginColors[loginTheme].timelineNumber}
                  text={String(step.id)}
                />
              </Pressable>
            </View>
            {!isLast && <View style={styles.line} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function createStyles(loginTheme: LoginTheme) {
  return StyleSheet.create({
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
    circleCompleted: {
      backgroundColor: LoginColors[loginTheme].completedBackground,
      borderColor: LoginColors[loginTheme].completedBorder,
    },
    circleCurrent: {
      backgroundColor: LoginColors[loginTheme].currentBackground,
      borderColor: LoginColors[loginTheme].currentBorder,
    },
    circlePending: {
      backgroundColor: LoginColors[loginTheme].pendingBackground,
      borderColor: LoginColors[loginTheme].pendingBorder,
    },
    line: {
      flex: 1,
      height: 2,
      marginHorizontal: 8,
      marginTop: 22,
      backgroundColor: LoginColors[loginTheme].backgroundTimeline,
    },
  });
}
