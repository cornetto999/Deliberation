const path = require("path");

module.exports = {
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  style: {
    postcss: {
      mode: "extends",
    },
  },
  devServer: {
    port: 8080,
    host: "::",
  },
};
