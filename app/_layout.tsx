// // app/_layout.tsx
// import { Stack } from "expo-router";
// import React from "react";
// import { Provider as PaperProvider } from "react-native-paper";

// export default function RootLayout() {
//   return (
//     <PaperProvider>
//       <Stack>
//         <Stack.Screen name="ScanPage" options={{ title: "扫描设备" }} />
//         <Stack.Screen name="MainPage" options={{ title: "设备详情" }} />
//       </Stack>
//     </PaperProvider>
//   );
// }

// app/_layout.tsx
// import { Stack } from "expo-router";
// import React from "react";
// import { Provider as PaperProvider } from "react-native-paper";

// export default function RootLayout() {
//   return (
//     <PaperProvider>
//      <Stack />
//     </PaperProvider>
//   );
// }


import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import * as RNLocalize from "react-native-localize";
import { PaperProvider } from "react-native-paper";
import { useScreenTitle } from "../sdk/hooks/useScreenTitle";
import i18n from "../src/i18n"; // 注意路径

export default function RootLayout() {
  const title = useScreenTitle();

  useEffect(() => {
    const locales = RNLocalize.getLocales();
    if (locales?.length) {
      const languageCode = locales[0].languageCode;
      i18n.changeLanguage(languageCode.startsWith("zh") ? "zh" : "en");
    }
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <PaperProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#6200ee" },
            headerTintColor: "white",
            title: title, // 动态标题
          }}
        />
      </PaperProvider>
    </I18nextProvider>
  );
}




