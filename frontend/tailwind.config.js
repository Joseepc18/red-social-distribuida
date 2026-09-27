import tokens from "./resources/style-guide.json" with { type: "json" };
const fontFamily = ['"Plus Jakarta Sans Variable"', "sans-serif"];
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      ...tokens,
      fontFamily: {
        ...Object.fromEntries(
          Object.keys(tokens.fontFamily).map((role) => [role, fontFamily]),
        ),
        sans: fontFamily,
      },
    },
  },
};
