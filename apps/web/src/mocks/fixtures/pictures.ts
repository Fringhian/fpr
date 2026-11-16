/**
 * An invented profile picture: two overlapping discs on a pale ground, as
 * an SVG file, drawn from the person's colour number.
 */
export function fixturePicture(color: number): File {
  const hue = (color * 37) % 360;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">`,
    `<rect width="96" height="96" fill="hsl(${hue} 60% 88%)"/>`,
    `<circle cx="38" cy="40" r="26" fill="hsl(${hue} 55% 55%)"/>`,
    `<circle cx="62" cy="62" r="22" fill="hsl(${(hue + 40) % 360} 50% 40%)" opacity="0.8"/>`,
    "</svg>",
  ].join("");
  return new File([svg], "picture.svg", { type: "image/svg+xml" });
}
