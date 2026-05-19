import Platform from "@/src/utils/device/type";

export let rpc: any = null;

if (Platform === "desktop" && typeof window !== "undefined") {
  const { Electroview } = require("electrobun/view");

  rpc = Electroview.defineRPC({
    maxRequestTime: Infinity,
    handlers: {
      requests: {},
    },
  });

  new Electroview({ rpc });
}