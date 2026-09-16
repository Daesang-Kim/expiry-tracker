// Android's Force Dark feature can invert the background/text color of any
// TextInput that doesn't set them explicitly, which made placeholders
// invisible on Android (fine on iOS, which has no such feature). Every
// TextInput's style should spread `inputStyle` and pass
// `placeholderTextColor={PLACEHOLDER_COLOR}` to stay visible regardless of
// the device's system theme.
export const PLACEHOLDER_COLOR = "#999";

export const inputStyle = {
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 8,
  padding: 12,
  backgroundColor: "#fff",
  color: "#111",
} as const;
