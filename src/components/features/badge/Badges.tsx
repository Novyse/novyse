import { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import gateway from "@/src/utils/backend-services/api-gateway";

import AnimatedGradientBadge from "./AnimatedGradientBadge";
import StaticGradientBadge from "./StaticGradientBadge";
import SolidBadge from "./SolidBadge";

export const BadgeRenderer = ({ badge }: any) => {
  if (!badge?.color?.type) return null;

  switch (badge.color.type) {
    case "gradient-animated":
      return <AnimatedGradientBadge badge={badge} />;
    case "gradient-static":
      return <StaticGradientBadge badge={badge} />;
    case "solid":
    default:
      return <SolidBadge badge={badge} />;
  }
};

export default function Badges({ userUUID }: { userUUID: string }) {
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchBadges = async () => {
      if (!userUUID) return;

      try {
        const { success, badges: apiBadges } =    // @SamueleOrazioDurante @MatteoMagnani7 quando abbiamo voglia diamogli i types che l'api resituisce, così va via l'errore di tipizzazione
          await gateway.user.profile.badges.get(userUUID);

        if (success && isMounted) {
          setBadges(apiBadges || []);
        }
      } catch (err) {
        console.error("Error fetching badges:", err);
      }
    };

    fetchBadges();

    return () => {
      isMounted = false;
    };
  }, [userUUID]);

  if (!badges || badges.length === 0) return null;

  return (
    <View style={styles.badgesWrapper}>
      {badges.map((b) => (
        <BadgeRenderer key={b.badge_id} badge={b} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badgesWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 30,
    justifyContent: "center",
    pointerEvents: "none",
  },
});
