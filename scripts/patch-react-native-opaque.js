const fs = require("fs");
const path = require("path");

const cmakePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-opaque",
  "android",
  "CMakeLists.txt",
);

if (!fs.existsSync(cmakePath)) {
  console.log("[patch-react-native-opaque] Skipped: package not installed");
  process.exit(0);
}

let cmake = fs.readFileSync(cmakePath, "utf8");

cmake = cmake.replace("CMAKE_CXX_STANDARD 11", "CMAKE_CXX_STANDARD 20");

const pathFix = `if(DEFINED NODE_MODULES_DIR)
  file(TO_CMAKE_PATH "\${NODE_MODULES_DIR}" NODE_MODULES_DIR)
endif()`;

if (!cmake.includes('file(TO_CMAKE_PATH "${NODE_MODULES_DIR}" NODE_MODULES_DIR)')) {
  cmake = cmake.replace(
    "cmake_minimum_required(VERSION 3.4.1)\n",
    `cmake_minimum_required(VERSION 3.4.1)\n\n${pathFix}\n`,
  );
}

fs.writeFileSync(cmakePath, cmake, "utf8");
console.log(
  "[patch-react-native-opaque] Patched CMakeLists.txt for Windows paths and C++20",
);
