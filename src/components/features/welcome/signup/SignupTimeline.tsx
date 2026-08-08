import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Typography from "@/src/components/ui/typography/Typography";
import { LoginColors, LoginTheme } from "@/constants/LoginColors";

interface Props {
  steps: { id: number }[];
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
                    ? {
                        backgroundColor:
                          LoginColors[loginTheme as LoginTheme]
                            .completedBackground,
                        borderColor:
                          LoginColors[loginTheme as LoginTheme].completedBorder,
                      }
                    : isCurrent
                      ? {
                          backgroundColor:
                            LoginColors[loginTheme as LoginTheme]
                              .currentBackground,
                          borderColor:
                            LoginColors[loginTheme as LoginTheme].currentBorder,
                        }
                      : {
                          backgroundColor:
                            LoginColors[loginTheme as LoginTheme]
                              .pendingBackground,
                          borderColor:
                            LoginColors[loginTheme as LoginTheme].pendingBorder,
                        },
                ]}
                onPress={isAccessible ? () => onStepPress(index) : undefined}
                disabled={!isAccessible}
              >
                <Typography
                  style={[
                    styles.number,
                    {
                      color:
                        LoginColors[loginTheme as LoginTheme].timelineNumber,
                    },
                  ]}
                  text={String(step.id)}
                />
              </Pressable>
            </View>
            {!isLast && (
              <View
                style={[
                  styles.line,
                  {
                    backgroundColor:
                      LoginColors[loginTheme as LoginTheme].backgroundTimeline,
                  },
                ]}
              />
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
  line: {
    flex: 1,
    height: 2,
    marginHorizontal: 8,
    marginTop: 22,
  },
});
