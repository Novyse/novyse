import { Text, View} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useRouter } from "expo-router";


export default function emailCheck() {

    const router = useRouter();
    
    return (
        <SafeAreaProvider>
            <SafeAreaView>
                <View>
                    <Text>Ciao</Text>
                </View>
            </SafeAreaView>
        </SafeAreaProvider>
    )
}