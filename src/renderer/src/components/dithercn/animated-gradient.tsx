import { createMemo, mergeProps, splitProps } from "solid-js";

import { cssColor, DitherShader } from "@/lib/dither";
import type {
  DitherColor,
  DitherPalette,
  DitherShaderProps,
} from "@/lib/dither";

/** The pattern the swirl folds: a checkerboard, bands, or one soft edge. */
export type AnimatedGradientShape = "Checks" | "Stripes" | "Edge";

export type AnimatedGradientPreset =
  | "Prism"
  | "Lava"
  | "Plasma"
  | "Pulse"
  | "Vortex"
  | "Mist";

/** Every value a preset sets. Numbers use the 0 to 100 scale of the knobs. */
export interface AnimatedGradientParams {
  color1: DitherColor;
  color2: DitherColor;
  color3: DitherColor;
  rotation: number;
  proportion: number;
  scale: number;
  speed: number;
  distortion: number;
  swirl: number;
  swirlIterations: number;
  softness: number;
  offset: number;
  shape: AnimatedGradientShape;
  shapeSize: number;
}

export type AnimatedGradientProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback" | "speed"
> &
  Partial<AnimatedGradientParams> & {
    /** Starting values. Any prop you set overrides the preset's. Default `"Prism"`. */
    preset?: AnimatedGradientPreset;
  };

/** A colour that follows the theme: `light` on light pages, `dark` on dark. */
const themed = (light: string, dark: string) => `light-dark(${light}, ${dark})`;

export const ANIMATED_GRADIENT_PRESETS: Record<
  AnimatedGradientPreset,
  AnimatedGradientParams
> = {
  Prism: {
    color1: themed("#FAFAFA", "#050505"),
    color2: "#66B3FF",
    color3: themed("#050505", "#FFFFFF"),
    rotation: -50,
    proportion: 1,
    scale: 0.01,
    speed: 30,
    distortion: 0,
    swirl: 50,
    swirlIterations: 16,
    softness: 47,
    offset: -299,
    shape: "Checks",
    shapeSize: 45,
  },
  Lava: {
    color1: "#FF9F21",
    color2: "#FF0303",
    color3: themed("#FAFAFA", "#000000"),
    rotation: 114,
    proportion: 100,
    scale: 0.52,
    speed: 30,
    distortion: 7,
    swirl: 18,
    swirlIterations: 20,
    softness: 100,
    offset: 717,
    shape: "Edge",
    shapeSize: 12,
  },
  Plasma: {
    color1: "#B566FF",
    color2: themed("#FAFAFA", "#000000"),
    color3: themed("#FAFAFA", "#000000"),
    rotation: 0,
    proportion: 63,
    scale: 0.75,
    speed: 30,
    distortion: 5,
    swirl: 61,
    swirlIterations: 5,
    softness: 100,
    offset: -168,
    shape: "Checks",
    shapeSize: 28,
  },
  Pulse: {
    color1: "#66FF85",
    color2: themed("#FAFAFA", "#000000"),
    color3: themed("#FAFAFA", "#000000"),
    rotation: -167,
    proportion: 92,
    scale: 0,
    speed: 20,
    distortion: 54,
    swirl: 75,
    swirlIterations: 3,
    softness: 28,
    offset: -813,
    shape: "Checks",
    shapeSize: 79,
  },
  Vortex: {
    color1: themed("#FAFAFA", "#000000"),
    color2: themed("#000000", "#FFFFFF"),
    color3: themed("#FAFAFA", "#000000"),
    rotation: 50,
    proportion: 41,
    scale: 0.4,
    speed: 20,
    distortion: 0,
    swirl: 100,
    swirlIterations: 3,
    softness: 5,
    offset: -744,
    shape: "Stripes",
    shapeSize: 80,
  },
  Mist: {
    color1: themed("#FAFAFA", "#050505"),
    color2: "#FF66B8",
    color3: themed("#FAFAFA", "#050505"),
    rotation: 0,
    proportion: 33,
    scale: 0.48,
    speed: 39,
    distortion: 4,
    swirl: 65,
    swirlIterations: 5,
    softness: 100,
    offset: -235,
    shape: "Edge",
    shapeSize: 48,
  },
};

export const ANIMATED_GRADIENT_PRESET_NAMES = Object.keys(
  ANIMATED_GRADIENT_PRESETS
) as AnimatedGradientPreset[];

export const ANIMATED_GRADIENT_SHAPES = [
  "Checks",
  "Stripes",
  "Edge",
] as const satisfies readonly AnimatedGradientShape[];

const SHAPES = {
  Checks: 0,
  Edge: 2,
  Stripes: 1,
} as const satisfies Record<AnimatedGradientShape, number>;

// The original shader, run once per dither cell. `px` rebuilds its CSS
// pixel coordinates, so the pattern keeps its size at any cell size. The
// three-colour blend becomes a tone: 0 is color1, 0.5 color2, 1 color3.
const FIELD = `
vec2 gradientRotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

float gradientRandom(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float gradientNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = gradientRandom(i);
  float b = gradientRandom(i + vec2(1.0, 0.0));
  float c = gradientRandom(i + vec2(0.0, 1.0));
  float d = gradientRandom(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float field(vec2 uv, vec2 res, float time) {
  vec2 px = res * gradientCell;
  float t = 0.5 * (time * gradientRate + gradientOffset);
  float noiseScale = 0.0005 + 0.006 * gradientScale;

  vec2 p = (uv - 0.5) * noiseScale * px;
  p = gradientRotate(p, gradientRotation * 0.5 * 3.14159265358979);
  p += 0.5;

  float n1 = gradientNoise(p + t);
  float n2 = gradientNoise(p * 2.0 - t);
  float angle = n1 * 6.28318530718;
  p.x += 4.0 * gradientDistortion * n2 * cos(angle);
  p.y += 4.0 * gradientDistortion * n2 * sin(angle);

  float swirl = clamp(gradientSwirl, 0.0, 2.0);
  for (int k = 1; k <= 30; k++) {
    float i = float(k);
    if (i > gradientIterations) {
      break;
    }
    p.x += swirl / i * cos(t + i * 1.5 * p.y);
    p.y += swirl / i * cos(t + i * p.x);
  }

  float proportion = clamp(gradientProportion, 0.0, 1.0);
  float bias = 0.48 * sign(proportion - 0.5) * pow(abs(proportion - 0.5), 0.5);
  float mixer = 0.0;
  if (gradientShape < 0.5) {
    vec2 q = p * (0.5 + 3.5 * gradientShapeScale);
    mixer = 0.5 + 0.5 * sin(q.x) * cos(q.y) + bias;
  } else if (gradientShape < 1.5) {
    float f = fract(p.y * (0.25 + 3.0 * gradientShapeScale));
    mixer = smoothstep(0.0, 0.55, f) * smoothstep(1.0, 0.45, f) + bias;
  } else {
    float sh = (0.5 - p.y) / (noiseScale * px.y) + 0.5;
    float spread = 0.2 * (1.0 - gradientShapeScale);
    mixer = smoothstep(0.45 - spread, 0.55 + spread, sh + 0.3 * (proportion - 0.5));
  }

  float edges = 1.0 - clamp(gradientSoftness, 0.0, 1.0);
  float blur = 0.01 + 0.01 * gradientScale;
  float r1 = smoothstep(0.35 * edges, 0.7 - 0.35 * edges + 0.5 * blur, mixer);
  float r2 = smoothstep(0.3 + 0.35 * edges, 1.0 - 0.35 * edges + blur, mixer);
  return 0.5 * r1 + 0.5 * r2;
}
`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const mix = (from: DitherColor, to: DitherColor) =>
  `color-mix(in srgb, ${cssColor(from)}, ${cssColor(to)})`;

/** color1, its blend with color2, color2, its blend with color3, color3. */
const gradientPalette = (
  color1: DitherColor,
  color2: DitherColor,
  color3: DitherColor
): DitherPalette => [color1, mix(color1, color2), color2, mix(color2, color3), color3];

/**
 * A slow, swirling three-colour gradient, drawn as a dither. A port of
 * Animated Gradient from solid-thinking-orbs. Decorative and full-bleed:
 * size it with `class`, usually `absolute inset-0`. Pick a `preset`, then
 * override any of its values with props.
 */
export const AnimatedGradient = (props: AnimatedGradientProps) => {
  const merged = mergeProps(
    {
      preset: "Prism" as AnimatedGradientPreset,
      matrix: "bayer8" as const,
      // Prism is dark for most of its loop; this moment shows the colour.
      stillTime: 2.5,
    },
    props
  );
  const [local, others] = splitProps(merged, [
    "preset",
    "color1",
    "color2",
    "color3",
    "rotation",
    "proportion",
    "scale",
    "speed",
    "distortion",
    "swirl",
    "swirlIterations",
    "softness",
    "offset",
    "shape",
    "shapeSize",
    "palette",
    "cell",
  ]);

  const params = createMemo((): AnimatedGradientParams => {
    const preset =
      ANIMATED_GRADIENT_PRESETS[local.preset] ?? ANIMATED_GRADIENT_PRESETS.Prism;
    return {
      color1: local.color1 ?? preset.color1,
      color2: local.color2 ?? preset.color2,
      color3: local.color3 ?? preset.color3,
      rotation: local.rotation ?? preset.rotation,
      proportion: local.proportion ?? preset.proportion,
      scale: local.scale ?? preset.scale,
      speed: local.speed ?? preset.speed,
      distortion: local.distortion ?? preset.distortion,
      swirl: local.swirl ?? preset.swirl,
      swirlIterations: local.swirlIterations ?? preset.swirlIterations,
      softness: local.softness ?? preset.softness,
      offset: local.offset ?? preset.offset,
      shape: local.shape ?? preset.shape,
      shapeSize: local.shapeSize ?? preset.shapeSize,
    };
  });

  const colors = createMemo(
    () =>
      local.palette ??
      gradientPalette(params().color1, params().color2, params().color3)
  );

  const uniforms = createMemo(() => {
    const p = params();
    return {
      gradientCell: local.cell ?? 3,
      gradientDistortion: p.distortion / 50,
      gradientIterations: p.swirl === 0 ? 0 : clamp(Math.ceil(p.swirlIterations), 1, 30),
      gradientOffset: p.offset * 0.01,
      gradientProportion: p.proportion / 100,
      gradientRate: (p.speed / 100) * 5,
      gradientRotation: (p.rotation * Math.PI) / 180,
      gradientScale: p.scale,
      gradientShape: SHAPES[p.shape] ?? 0,
      gradientShapeScale: p.shapeSize / 100,
      gradientSoftness: p.softness / 100,
      gradientSwirl: p.swirl / 100,
    };
  });

  const fallbackStyle = createMemo(() => {
    const [first, , middle, , last] = colors();
    return {
      "background-image": `linear-gradient(${90 - params().rotation}deg, ${cssColor(first)}, ${cssColor(middle ?? first)}, ${cssColor(last ?? first)})`,
    };
  });

  return (
    <DitherShader
      field={FIELD}
      palette={colors()}
      cell={local.cell}
      uniforms={uniforms()}
      fallback={<div class="absolute inset-0" style={fallbackStyle()} />}
      {...others}
    />
  );
};
