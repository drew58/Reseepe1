import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate } from "remotion";

// Adjust these until only the phone screen is visible
const CROP_SCALE = 1.8;      // zoom level
const CROP_X = -50;          // % shift left/right (negative = move left)
const CROP_Y = 10;           // % shift up/down (negative = move up)

export const Demo: React.FC = () => {
  const frame = useCurrentFrame();
  const introScale = interpolate(frame, [0, 30], [1.05, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${introScale})`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: `scale(${CROP_SCALE}) translate(${CROP_X}%, ${CROP_Y}%)`,
            transformOrigin: "center",
          }}
        >
          <OffthreadVideo src={staticFile("demo.mp4")} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};