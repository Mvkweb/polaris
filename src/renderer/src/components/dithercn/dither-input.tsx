import { TextField as TextFieldPrimitive } from "@kobalte/core/text-field";
import {
  type ComponentProps,
  createEffect,
  createSignal,
  type JSX,
  mergeProps,
  Show,
  splitProps,
} from "solid-js";

import {
  cssColor,
  type DitherColor,
  type DitherMatrix,
  type FillVariant,
  fillStyle,
} from "@/lib/dither";
import { cn } from "@/lib/utils";

export type DitherInputFill = FillVariant;
export type DitherInputSize = "sm" | "md" | "lg";

export interface DitherInputProps
  extends Omit<ComponentProps<typeof TextFieldPrimitive.Input>, "size"> {
  /** Authentic dithercn floor texture variant */
  fill?: DitherInputFill;
  /** Accent color token or CSS color */
  color?: DitherColor;
  /** Threshold matrix used when fill="gradient" */
  matrix?: DitherMatrix;
  /** Pixel size per dither dot (default: 2) */
  cell?: number;
  /** Input height & icon scale */
  size?: DitherInputSize;
  /** Uppercase monospace field label */
  label?: string;
  /** Helper text below the input */
  description?: string;
  /** Validation error message (forces red accent & invalid state) */
  errorMessage?: string;
  /** Left icon slot */
  leadingIcon?: JSX.Element;
  /** Right icon slot */
  trailingIcon?: JSX.Element;
  /** Shows a clear button (and enables Escape to clear) when non-empty */
  clearable?: boolean;
  /** Callback fired when input is cleared */
  onClear?: () => void;
  /** Additional classes for the root Kobalte TextField wrapper */
  containerClass?: string;
}

const SIZE_CLASSES: Record<DitherInputSize, string> = {
  sm: "h-9 px-3 text-xs gap-2 rounded-xl",
  md: "h-11 px-3.5 text-sm gap-2.5 rounded-xl",
  lg: "h-13 px-4 text-base gap-3 rounded-2xl",
};

const ICON_SIZE_PX: Record<DitherInputSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

const FLOOR_HEIGHT_REST: Record<DitherInputSize, number> = {
  sm: 5,
  md: 6,
  lg: 7,
};

const FLOOR_HEIGHT_ACTIVE: Record<DitherInputSize, number> = {
  sm: 8,
  md: 10,
  lg: 12,
};

export function DitherInput(rawProps: DitherInputProps) {
  const props = mergeProps(
    {
      fill: "gradient" as DitherInputFill,
      color: "ink" as DitherColor,
      matrix: "bayer4" as DitherMatrix,
      cell: 2,
      size: "md" as DitherInputSize,
      clearable: false,
    },
    rawProps,
  );

  const [local, inputProps] = splitProps(props, [
    "fill",
    "color",
    "matrix",
    "cell",
    "size",
    "label",
    "description",
    "errorMessage",
    "leadingIcon",
    "trailingIcon",
    "clearable",
    "onClear",
    "containerClass",
    "class",
    "type",
    "value",
    "defaultValue",
    "disabled",
    "onInput",
    "onFocus",
    "onBlur",
    "onKeyDown",
    "ref",
  ]);

  let inputEl: HTMLInputElement | undefined;

  const initialText = () => {
    if (local.value !== undefined && local.value !== null) {
      return String(local.value);
    }
    if (local.defaultValue !== undefined && local.defaultValue !== null) {
      return String(local.defaultValue);
    }
    return "";
  };

  const [textValue, setTextValue] = createSignal(initialText());
  const [isFocused, setIsFocused] = createSignal(false);
  const [isHovered, setIsHovered] = createSignal(false);
  const [showPassword, setShowPassword] = createSignal(false);

  createEffect(() => {
    if (local.value !== undefined) {
      setTextValue(local.value === null ? "" : String(local.value));
    }
  });

  const isInvalid = () => Boolean(local.errorMessage);
  const activeColor = (): DitherColor => (isInvalid() ? "red" : local.color);
  const resolvedColor = () => cssColor(activeColor());
  const isPasswordType = () => local.type === "password";
  const effectiveInputType = () =>
    isPasswordType() ? (showPassword() ? "text" : "password") : local.type;

  const handleInput: JSX.EventHandlerUnion<HTMLInputElement, InputEvent> = (
    e,
  ) => {
    setTextValue(e.currentTarget.value);
    if (typeof local.onInput === "function") {
      local.onInput(e);
    }
  };

  const handleFocus: JSX.EventHandlerUnion<HTMLInputElement, FocusEvent> = (
    e,
  ) => {
    setIsFocused(true);
    if (typeof local.onFocus === "function") {
      local.onFocus(e);
    }
  };

  const handleBlur: JSX.EventHandlerUnion<HTMLInputElement, FocusEvent> = (
    e,
  ) => {
    setIsFocused(false);
    if (typeof local.onBlur === "function") {
      local.onBlur(e);
    }
  };

  const handleClear = () => {
    if (local.disabled) return;
    setTextValue("");
    if (inputEl) {
      inputEl.value = "";
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      inputEl.focus();
    }
    local.onClear?.();
  };

  const handleKeyDown: JSX.EventHandlerUnion<HTMLInputElement, KeyboardEvent> =
    (e) => {
      if (
        e.key === "Escape" &&
        local.clearable &&
        !local.disabled &&
        textValue().length > 0
      ) {
        e.preventDefault();
        handleClear();
      }
      if (typeof local.onKeyDown === "function") {
        local.onKeyDown(e);
      }
    };

  /**
   * Hairline inset border matching the outline aesthetic:
   * - Resting: subtle 8% white hairline
   * - Hover: 14% white hairline
   * - Focus: 40% oklab mix of active dither color
   * - Invalid: 55% oklab mix of red
   */
  const boxShadowStyle = (): string => {
    const baseShadow = "0 2px 12px rgba(0, 0, 0, 0.55)";
    if (isInvalid()) {
      return `inset 0 0 0 1px color-mix(in oklab, ${cssColor("red")} 55%, transparent), ${baseShadow}`;
    }
    if (isFocused()) {
      return `inset 0 0 0 1px color-mix(in oklab, ${resolvedColor()} 40%, transparent), ${baseShadow}`;
    }
    if (isHovered() && !local.disabled) {
      return `inset 0 0 0 1px rgba(255, 255, 255, 0.14), ${baseShadow}`;
    }
    return `inset 0 0 0 1px rgba(255, 255, 255, 0.08), ${baseShadow}`;
  };

  /**
   * Floor-constrained dither texture style.
   * CRITICAL: to: 0 ensures zero stray dots pollute the upper typing area.
   */
  const floorTextureStyle = (): JSX.CSSProperties => {
    const color = activeColor();
    const cell = Math.max(1, local.cell);
    const active = isFocused() || isInvalid();

    if (local.fill === "gradient") {
      return fillStyle("gradient", {
        color,
        cell,
        edge: "bottom",
        from: active ? 0.95 : 0.5,
        to: 0,
        length: active ? 5 : 3,
        matrix: local.matrix,
      });
    }

    if (local.fill === "dotted") {
      return {
        ...fillStyle("dotted", { cell, color }),
        opacity: active ? 0.85 : 0.45,
      };
    }

    if (local.fill === "hatched") {
      return {
        ...fillStyle("hatched", { cell, color }),
        opacity: active ? 0.85 : 0.45,
      };
    }

    // "solid"
    return {
      "background-color": resolvedColor(),
      opacity: active ? 0.9 : 0.45,
    };
  };

  const floorHeightPx = (): string => {
    const active = isFocused() || isInvalid();
    if (local.fill === "solid") {
      return active ? "3px" : "2px";
    }
    const px = active
      ? FLOOR_HEIGHT_ACTIVE[local.size]
      : FLOOR_HEIGHT_REST[local.size];
    return `${px}px`;
  };

  const showClear = () =>
    Boolean(local.clearable && !local.disabled && textValue().length > 0);

  const iconPx = () => `${ICON_SIZE_PX[local.size]}px`;

  return (
    <TextFieldPrimitive
      validationState={isInvalid() ? "invalid" : undefined}
      disabled={local.disabled}
      class={cn("flex w-full flex-col gap-1.5", local.containerClass)}
    >
      <Show when={local.label}>
        <TextFieldPrimitive.Label class="select-none font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
          {local.label}
        </TextFieldPrimitive.Label>
      </Show>

      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ "box-shadow": boxShadowStyle() }}
        class={cn(
          "group/input relative flex w-full items-center overflow-hidden bg-black",
          "transition-[box-shadow,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          SIZE_CLASSES[local.size],
          local.disabled && "cursor-not-allowed opacity-40",
        )}
      >
        {/* Leading Icon */}
        <Show when={local.leadingIcon}>
          <span
            style={{ width: iconPx(), height: iconPx() }}
            class="relative z-10 flex shrink-0 items-center justify-center text-muted-foreground/60 transition-colors duration-200 group-focus-within/input:text-white"
          >
            {local.leadingIcon}
          </span>
        </Show>

        {/* Native Input */}
        <TextFieldPrimitive.Input
          {...inputProps}
          type={effectiveInputType()}
          ref={(el: HTMLInputElement) => {
            inputEl = el;
            if (typeof local.ref === "function") {
              local.ref(el);
            }
          }}
          value={local.value}
          defaultValue={local.defaultValue}
          disabled={local.disabled}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          class={cn(
            "relative z-10 h-full w-full min-w-0 flex-1 bg-transparent font-sans text-white caret-white outline-none",
            "selection:bg-white/25 selection:text-white",
            "placeholder:text-muted-foreground/35",
            "disabled:cursor-not-allowed",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            local.class,
          )}
        />

        {/* Clear Button (with scale/opacity spring transition and preventDefault on blur prevention) */}
        <Show when={local.clearable}>
          <button
            type="button"
            tabIndex={showClear() ? 0 : -1}
            aria-label="Clear input"
            aria-hidden={!showClear()}
            disabled={!showClear()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            class={cn(
              "relative z-10 flex shrink-0 items-center justify-center rounded-md p-1",
              "text-muted-foreground/60 hover:bg-white/10 hover:text-white cursor-pointer",
              "transition-[opacity,transform,color,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
              showClear()
                ? "pointer-events-auto scale-100 opacity-100"
                : "pointer-events-none scale-75 opacity-0 w-0 p-0 overflow-hidden",
            )}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              style={{ width: iconPx(), height: iconPx() }}
            >
              <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
            </svg>
          </button>
        </Show>

        {/* Built-in Password Toggle (when type="password" and no custom trailingIcon) */}
        <Show when={isPasswordType() && !local.trailingIcon}>
          <button
            type="button"
            tabIndex={-1}
            aria-label={showPassword() ? "Hide password" : "Show password"}
            disabled={local.disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowPassword((prev) => !prev)}
            class="relative z-10 flex shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground/60 transition-colors duration-150 hover:bg-white/10 hover:text-white disabled:pointer-events-none cursor-pointer"
          >
            <Show
              when={showPassword()}
              fallback={
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  style={{ width: iconPx(), height: iconPx() }}
                >
                  <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8Z" />
                  <circle cx="8" cy="8" r="2" />
                </svg>
              }
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                style={{ width: iconPx(), height: iconPx() }}
              >
                <path d="M2 2l12 12M6.5 6.5a2 2 0 0 0 2.8 2.8" />
                <path d="M4.2 4.3C2.6 5.4 1.5 8 1.5 8s2.5 4.5 6.5 4.5c1.4 0 2.6-.5 3.6-1.2M11.8 9.5C13.4 8.3 14.5 8 14.5 8s-2.5-4.5-6.5-4.5c-.6 0-1.2.1-1.7.3" />
              </svg>
            </Show>
          </button>
        </Show>

        {/* Custom Trailing Icon */}
        <Show when={local.trailingIcon}>
          <span
            style={{ width: iconPx(), height: iconPx() }}
            class="relative z-10 flex shrink-0 items-center justify-center text-muted-foreground/60 transition-colors duration-200 group-focus-within/input:text-white"
          >
            {local.trailingIcon}
          </span>
        </Show>

        {/* Floor-Constrained Dither Track (6px rest -> 10px active) */}
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden rounded-b-[inherit] transition-[height,opacity] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
          style={{
            height: floorHeightPx(),
            ...floorTextureStyle(),
          }}
        />
      </div>

      <Show when={local.description && !isInvalid()}>
        <TextFieldPrimitive.Description class="select-none font-sans text-[11px] text-muted-foreground/60">
          {local.description}
        </TextFieldPrimitive.Description>
      </Show>

      <Show when={local.errorMessage}>
        <TextFieldPrimitive.ErrorMessage class="select-none font-mono text-[11px] text-red-400">
          {local.errorMessage}
        </TextFieldPrimitive.ErrorMessage>
      </Show>
    </TextFieldPrimitive>
  );
}

export default DitherInput;
