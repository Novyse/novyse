// const { shareAsync, isAvailableAsync } = require("expo-sharing");
// if (await isAvailableAsync()) {
//   const { File, Paths } = require("expo-file-system");
//   const originalFile = new File(uri);
//   const copiedFile = new File(Paths.cache, fileName);
//   try {
//     await originalFile.copy(copiedFile);
//   } catch (_) {}
//   await shareAsync(copiedFile.uri, {
//     mimeType,
//     dialogTitle: "Share file",
//   });
// } else {
//   console.error("Android download failed: Sharing is not available");
// }
