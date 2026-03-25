import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

const sans =
  'ui-sans-serif, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181b",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "86%",
            height: "86%",
            borderRadius: "22%",
            background: "linear-gradient(145deg, #3f3f46 0%, #18181b 100%)",
          }}
        >
          <span
            style={{
              fontSize: 200,
              fontWeight: 800,
              color: "#fafafa",
              letterSpacing: "-0.06em",
              fontFamily: sans,
            }}
          >
            dF
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
