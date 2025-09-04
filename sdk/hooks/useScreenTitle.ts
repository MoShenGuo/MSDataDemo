import { usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import { screenConfig } from "../screens";
export function useScreenTitle() {
   const { t } = useTranslation();
  const pathname = usePathname(); // 当前路由路径，例如 "/pages/BasicInformationPage"
   const key = screenConfig[pathname] ?? "设备详情";
  // 用 t() 翻译
  return t(key);
}

