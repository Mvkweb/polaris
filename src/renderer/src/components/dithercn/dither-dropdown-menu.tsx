import { DropdownMenu as DropdownMenuPrimitive } from "@kobalte/core/dropdown-menu";
import { useMenuContext } from "@kobalte/core/menu";
import { usePopperContext } from "@kobalte/core/popper";
import {
  createContext,
  createEffect,
  createMemo,
  mergeProps,
  Show,
  splitProps,
  useContext,
  type ComponentProps,
  type JSX,
  type ValidComponent,
} from "solid-js";
import { createStore } from "solid-js/store";

const CheckIcon = (props: { class?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const RadioDotIcon = (props: { class?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    class={props.class}
  >
    <circle cx="12" cy="12" r="6" />
  </svg>
);

const ChevronRightIcon = (props: { class?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
import {
  bloomFilter,
  cssColor,
  fillStyle,
} from "@/lib/dither";
import type {
  Bloom,
  DitherColor,
  DitherMatrix,
} from "@/lib/dither";
import { cn } from "@/lib/utils";

/*
 * DitherDropdownMenu is an accessible floating menu built on Kobalte DropdownMenu.
 *
 * It combines crisp typography and precise keyboard navigation with authentic
 * dithercn surfaces:
 * - Floating popovers with deep dark translucent backdrops, dithered ambient corner
 *   glows, and pixel-aligned borders.
 * - Interactive items with multiple highlight styles:
 *     - "pill": Elevated beveled surface matching DitherButton & DitherTabs.
 *     - "dither": Authentic Bayer matrix texture with a retro focus pip on the edge,
 *                 calibrated so labels remain 100% legible.
 *     - "hatched": Fine 45° diagonal scanline texture.
 *     - "dotted": Perforated dot lattice.
 *     - "outline": Crisp geometric pixel-art frame.
 *     - "glow": Soft ambient radial color bloom.
 * - Separators with stepped Bayer dither falloff towards their ends.
 */

export type DitherMenuItemVariant =
  | "pill"
  | "dither"
  | "hatched"
  | "dotted"
  | "outline"
  | "glow";

export type DitherMenuContainerVariant =
  | "card"
  | "glow"
  | "pixel"
  | "solid";

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";
type Placement = Side | `${Side}-start` | `${Side}-end`;

interface MenuConfig {
  placement: Placement;
  gutter: number;
  shift: number;
  overflowPadding: number;
  flip: boolean;
  slide: boolean;
  hideWhenDetached: boolean;
}

interface MenuConfigContextValue {
  config: MenuConfig;
  setConfig: (config: Partial<MenuConfig>) => void;
}

interface SubMenuConfig {
  gutter: number;
  shift: number;
  overflowPadding: number;
  hideWhenDetached: boolean;
}

interface SubMenuConfigContextValue {
  config: SubMenuConfig;
  setConfig: (config: Partial<SubMenuConfig>) => void;
}

const MenuConfigContext = createContext<MenuConfigContextValue>();
const SubMenuConfigContext = createContext<SubMenuConfigContextValue>();

const reposition = () => {
  if (typeof window === "undefined") {
    return;
  }
  requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
};

const getPlacement = (side: Side, align: Align): Placement =>
  align === "center" ? side : (`${side}-${align}` as Placement);

export interface DitherMenuLook {
  variant: () => DitherMenuItemVariant;
  menuVariant: () => DitherMenuContainerVariant;
  color: () => DitherColor;
  matrix: () => DitherMatrix;
  cell: () => number;
  bloom: () => Bloom;
}

const DitherMenuContext = createContext<DitherMenuLook | null>(null);

const useDitherMenuLook = (): DitherMenuLook => {
  const look = useContext(DitherMenuContext);
  if (!look) {
    return {
      bloom: () => "off",
      cell: () => 2,
      color: () => "ink",
      matrix: () => "bayer4",
      menuVariant: () => "card",
      variant: () => "pill",
    };
  }
  return look;
};

/* -------------------------------------------------------------------------
 * Root
 * ------------------------------------------------------------------------- */

export type DitherDropdownMenuProps = ComponentProps<
  typeof DropdownMenuPrimitive
> & {
  variant?: DitherMenuItemVariant;
  menuVariant?: DitherMenuContainerVariant;
  color?: DitherColor;
  matrix?: DitherMatrix;
  cell?: number;
  bloom?: Bloom;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  avoidCollisions?: boolean;
};

export const DitherDropdownMenu = (props: DitherDropdownMenuProps) => {
  const merged = mergeProps(
    {
      align: "start" as Align,
      alignOffset: 0,
      avoidCollisions: true,
      bloom: "off" as Bloom,
      cell: 2,
      color: "ink" as DitherColor,
      collisionPadding: 8,
      matrix: "bayer4" as DitherMatrix,
      menuVariant: "card" as DitherMenuContainerVariant,
      side: "bottom" as Side,
      sideOffset: 6,
      variant: "pill" as DitherMenuItemVariant,
    },
    props
  );

  const [local, others] = splitProps(merged, [
    "children",
    "variant",
    "menuVariant",
    "color",
    "matrix",
    "cell",
    "bloom",
    "side",
    "align",
    "sideOffset",
    "alignOffset",
    "collisionPadding",
    "avoidCollisions",
  ]);

  const [config, setConfig] = createStore<MenuConfig>({
    flip: local.avoidCollisions,
    gutter: local.sideOffset,
    hideWhenDetached: false,
    overflowPadding: local.collisionPadding,
    placement: getPlacement(local.side, local.align),
    shift: local.alignOffset,
    slide: local.avoidCollisions,
  });

  createEffect(() => {
    setConfig({
      flip: local.avoidCollisions,
      gutter: local.sideOffset,
      overflowPadding: local.collisionPadding,
      placement: getPlacement(local.side, local.align),
      shift: local.alignOffset,
      slide: local.avoidCollisions,
    });
    reposition();
  });

  const look: DitherMenuLook = {
    bloom: () => local.bloom,
    cell: () => local.cell,
    color: () => local.color,
    matrix: () => local.matrix,
    menuVariant: () => local.menuVariant,
    variant: () => local.variant,
  };

  return (
    <DitherMenuContext.Provider value={look}>
      <MenuConfigContext.Provider value={{ config, setConfig }}>
        <DropdownMenuPrimitive
          data-slot="dither-dropdown-menu"
          flip={config.flip}
          gutter={config.gutter}
          hideWhenDetached={config.hideWhenDetached}
          overflowPadding={config.overflowPadding}
          placement={config.placement}
          shift={config.shift}
          slide={config.slide}
          {...others}
        >
          {local.children}
        </DropdownMenuPrimitive>
      </MenuConfigContext.Provider>
    </DitherMenuContext.Provider>
  );
};

/* -------------------------------------------------------------------------
 * Trigger & Portal
 * ------------------------------------------------------------------------- */

export type DitherDropdownMenuTriggerProps<T extends ValidComponent = "button"> =
  ComponentProps<typeof DropdownMenuPrimitive.Trigger<T>>;

export const DitherDropdownMenuTrigger = <T extends ValidComponent = "button">(
  props: DitherDropdownMenuTriggerProps<T>
) => (
  <DropdownMenuPrimitive.Trigger
    data-slot="dither-dropdown-menu-trigger"
    {...props}
  />
);

export const DitherDropdownMenuPortal = DropdownMenuPrimitive.Portal;

/* -------------------------------------------------------------------------
 * Content
 * ------------------------------------------------------------------------- */

export type DitherDropdownMenuContentProps = ComponentProps<
  typeof DropdownMenuPrimitive.Content
> & {
  menuVariant?: DitherMenuContainerVariant;
  color?: DitherColor;
  bloom?: Bloom;
};

const MENU_STYLES = [
  "@keyframes dcn-menu-in{from{opacity:0;transform:scale(0.95) translateY(-6px)}to{opacity:1;transform:scale(1) translateY(0)}}",
  "@keyframes dcn-menu-out{from{opacity:1;transform:scale(1) translateY(0)}to{opacity:0;transform:scale(0.95) translateY(-4px)}}",
  ".dcn-menu-content{transform-origin:var(--kb-menu-content-transform-origin,top)}",
  ".dcn-menu-content[data-state=open]{animation:dcn-menu-in 160ms cubic-bezier(0.16,1,0.3,1) forwards}",
  ".dcn-menu-content[data-state=closed]{animation:dcn-menu-out 100ms cubic-bezier(0.16,1,0.3,1) forwards}",
  "@media (prefers-reduced-motion:reduce){.dcn-menu-content[data-state=open],.dcn-menu-content[data-state=closed]{animation:none}}",
].join("");

const CONTAINER_CLASSES: Record<DitherMenuContainerVariant, string> = {
  card: "rounded-2xl bg-background text-foreground shadow-2xl",
  glow: "rounded-2xl bg-background text-foreground shadow-2xl overflow-hidden",
  pixel: "rounded-[4px] bg-background text-foreground shadow-2xl",
  solid: "rounded-2xl bg-[#09090b] text-foreground shadow-2xl",
};

export const DitherDropdownMenuContent = (
  props: DitherDropdownMenuContentProps
) => {
  const look = useDitherMenuLook();
  const context = useMenuContext();
  const popperContext = usePopperContext();

  const [local, others] = splitProps(props, [
    "class",
    "children",
    "menuVariant",
    "color",
    "bloom",
  ]);

  const activeMenuVariant = () => local.menuVariant ?? look.menuVariant();
  const activeColor = () => local.color ?? look.color();
  const currentSide = () =>
    popperContext.currentPlacement().split("-")[0] as Side;

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dither-dropdown-menu-content"
        data-variant={activeMenuVariant()}
        data-state={context.isOpen() ? "open" : "closed"}
        data-side={currentSide()}
        class={cn(
          "dcn-menu-content relative z-50 min-w-[13rem] p-1.5 outline-none select-none",
          CONTAINER_CLASSES[activeMenuVariant()],
          "origin-(--kb-menu-content-transform-origin)",
          local.class
        )}
        {...others}
      >
        <style>{MENU_STYLES}</style>
        <Show when={activeMenuVariant() === "glow"}>
          <span
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] overflow-hidden"
            style={{
              background: `radial-gradient(circle at top right, color-mix(in oklab, ${cssColor(activeColor())} 22%, transparent) 0%, transparent 65%)`,
            }}
          />
        </Show>
        <div class="relative z-10 flex flex-col gap-0.5">
          {local.children}
        </div>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
};

/* -------------------------------------------------------------------------
 * Group & Label
 * ------------------------------------------------------------------------- */

export type DitherDropdownMenuGroupProps = ComponentProps<
  typeof DropdownMenuPrimitive.Group
>;

export const DitherDropdownMenuGroup = (
  props: DitherDropdownMenuGroupProps
) => (
  <DropdownMenuPrimitive.Group
    data-slot="dither-dropdown-menu-group"
    class="flex flex-col gap-0.5"
    {...props}
  />
);

export type DitherDropdownMenuLabelProps = JSX.IntrinsicElements["div"] & {
  inset?: boolean;
};

export const DitherDropdownMenuLabel = (
  props: DitherDropdownMenuLabelProps
) => {
  const [local, others] = splitProps(props, ["class", "inset"]);

  return (
    <div
      data-slot="dither-dropdown-menu-label"
      data-inset={local.inset}
      class={cn(
        "px-2.5 pt-2 pb-1 font-mono text-[10px] font-medium tracking-widest uppercase text-muted-foreground/60 data-[inset]:pl-8",
        local.class
      )}
      {...others}
    />
  );
};

/* -------------------------------------------------------------------------
 * Item Highlights Helper
 * ------------------------------------------------------------------------- */

interface ItemHighlightProps {
  variant: DitherMenuItemVariant;
  color: DitherColor;
  destructive?: boolean;
  cell: number;
  matrix: DitherMatrix;
  bloom?: Bloom;
}

const ItemHighlight = (props: ItemHighlightProps) => {
  const col = createMemo(() =>
    props.destructive ? "oklch(0.68 0.2 24)" : cssColor(props.color)
  );

  const bloomFilterStyle = createMemo<string | undefined>(() => {
    if (!props.bloom || props.bloom === "off") return undefined;
    return bloomFilter(props.destructive ? "red" : props.color, props.bloom);
  });

  const ditherPattern = createMemo(() =>
    fillStyle("gradient", {
      cell: props.cell,
      color: props.destructive ? "red" : props.color,
      edge: "right",
      from: 0.65,
      length: 28,
      matrix: props.matrix,
      to: 0.0625,
    })
  );

  return (
    <span
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-100 group-data-[highlighted]/item:opacity-100"
    >
      {/* Main highlight surface clipped to item border radius */}
      <span class="absolute inset-0 rounded-[inherit] overflow-hidden">
        <Show
          when={props.variant === "glow"}
          fallback={
            <Show
              when={props.variant === "outline"}
              fallback={
                <Show
                  when={props.variant === "dotted"}
                  fallback={
                    <Show
                      when={props.variant === "hatched"}
                      fallback={
                        <Show
                          when={props.variant === "dither"}
                          fallback={
                            /* "pill": Clean elevated tint */
                            <span
                              class="absolute inset-0 rounded-[inherit]"
                              style={{
                                background: props.destructive
                                  ? "color-mix(in oklab, oklch(0.68 0.2 24) 18%, transparent)"
                                  : `color-mix(in oklab, ${col()} 16%, transparent)`,
                                filter: bloomFilterStyle(),
                              }}
                            />
                          }
                        >
                          {/* "dither": Unified Bayer dither gradient with glowing cells */}
                          <span
                            class="absolute inset-0 rounded-[inherit]"
                            style={{
                              background: props.destructive
                                ? "color-mix(in oklab, oklch(0.68 0.2 24) 14%, transparent)"
                                : `color-mix(in oklab, ${col()} 13%, transparent)`,
                            }}
                          />
                          <div
                            class="absolute inset-0 rounded-[inherit]"
                            style={{
                              filter: bloomFilterStyle(),
                            }}
                          >
                            <span
                              class="absolute inset-0 rounded-[inherit]"
                              style={{
                                ...ditherPattern(),
                                opacity:
                                  props.bloom === "high"
                                    ? 0.75
                                    : props.bloom === "low"
                                      ? 0.55
                                      : 0.4,
                              }}
                            />
                          </div>
                        </Show>
                      }
                    >
                      {/* "hatched": 45° diagonal scanlines across the pill */}
                      <span
                        class="absolute inset-0 rounded-[inherit]"
                        style={{
                          background: props.destructive
                            ? "color-mix(in oklab, oklch(0.68 0.2 24) 12%, transparent)"
                            : `color-mix(in oklab, ${col()} 12%, transparent)`,
                        }}
                      />
                      <div
                        class="absolute inset-0 rounded-[inherit]"
                        style={{
                          filter: bloomFilterStyle(),
                        }}
                      >
                        <span
                          class="absolute inset-0 rounded-[inherit]"
                          style={{
                            ...fillStyle("hatched", {
                              cell: props.cell,
                              color: props.destructive ? "red" : props.color,
                            }),
                            opacity:
                              props.bloom === "high"
                                ? 0.6
                                : props.bloom === "low"
                                  ? 0.45
                                  : 0.3,
                          }}
                        />
                      </div>
                    </Show>
                  }
                >
                  {/* "dotted": staggered dot lattice across the pill */}
                  <span
                    class="absolute inset-0 rounded-[inherit]"
                    style={{
                      background: props.destructive
                        ? "color-mix(in oklab, oklch(0.68 0.2 24) 12%, transparent)"
                        : `color-mix(in oklab, ${col()} 12%, transparent)`,
                    }}
                  />
                  <div
                    class="absolute inset-0 rounded-[inherit]"
                    style={{
                      filter: bloomFilterStyle(),
                    }}
                  >
                    <span
                      class="absolute inset-0 rounded-[inherit]"
                      style={{
                        ...fillStyle("dotted", {
                          cell: props.cell,
                          color: props.destructive ? "red" : props.color,
                        }),
                        opacity:
                          props.bloom === "high"
                            ? 0.65
                            : props.bloom === "low"
                              ? 0.5
                              : 0.35,
                      }}
                    />
                  </div>
                </Show>
              }
            >
              {/* "outline": crisp 1px pixel frame */}
              <span
                class="absolute inset-0 rounded-[inherit]"
                style={{
                  border: `1px solid color-mix(in oklab, ${col()} 45%, transparent)`,
                  background: `color-mix(in oklab, ${col()} 8%, transparent)`,
                  filter: bloomFilterStyle(),
                }}
              />
            </Show>
          }
        >
          {/* "glow": soft radial ambient color bloom */}
          <span
            class="absolute inset-0 rounded-[inherit]"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, color-mix(in oklab, ${col()} 36%, transparent) 0%, transparent 80%)`,
              filter: bloomFilterStyle(),
            }}
          />
        </Show>
      </span>
    </span>
  );
};

/* -------------------------------------------------------------------------
 * Item
 * ------------------------------------------------------------------------- */

export type DitherDropdownMenuItemProps = ComponentProps<
  typeof DropdownMenuPrimitive.Item
> & {
  inset?: boolean;
  destructive?: boolean;
  variant?: DitherMenuItemVariant;
  color?: DitherColor;
  bloom?: Bloom;
  asChild?: boolean;
};

export const DitherDropdownMenuItem = (props: DitherDropdownMenuItemProps) => {
  const look = useDitherMenuLook();

  const [local, others] = splitProps(props, [
    "class",
    "children",
    "inset",
    "destructive",
    "variant",
    "color",
    "bloom",
    "asChild",
  ]);

  const activeVariant = () => local.variant ?? look.variant();
  const activeColor = (): DitherColor =>
    local.destructive ? "red" : (local.color ?? look.color());
  const activeBloom = () => local.bloom ?? look.bloom();

  return (
    <DropdownMenuPrimitive.Item
      data-slot="dither-dropdown-menu-item"
      data-variant={activeVariant()}
      data-destructive={local.destructive ? "" : undefined}
      class={cn(
        "group/item relative flex cursor-default items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] outline-none select-none transition-colors",
        "font-sans font-normal",
        local.destructive
          ? "text-red-400 dark:text-red-400 data-[highlighted]:text-white font-medium"
          : "text-[oklch(0.9_0.005_260)] data-[highlighted]:text-white",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        "data-[inset]:pl-8",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        local.destructive
          ? "[&_svg]:text-red-400 group-data-[highlighted]/item:[&_svg]:text-white"
          : "[&_svg:not([class*='text-'])]:text-muted-foreground group-data-[highlighted]/item:[&_svg:not([class*='text-'])]:text-white",
        local.class
      )}
      {...others}
    >
      <ItemHighlight
        variant={activeVariant()}
        color={activeColor()}
        destructive={local.destructive}
        cell={look.cell()}
        matrix={look.matrix()}
        bloom={activeBloom()}
      />

      {local.children}
    </DropdownMenuPrimitive.Item>
  );
};

/* -------------------------------------------------------------------------
 * Shortcut
 * ------------------------------------------------------------------------- */

export type DitherDropdownMenuShortcutProps = JSX.HTMLAttributes<HTMLSpanElement>;

export const DitherDropdownMenuShortcut = (
  props: DitherDropdownMenuShortcutProps
) => {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <span
      data-slot="dither-dropdown-menu-shortcut"
      class={cn(
        "ml-auto font-mono text-[11px] tracking-wider tabular-nums transition-colors",
        "text-muted-foreground/60 group-data-[highlighted]/item:text-foreground/80",
        "group-data-[destructive]/item:text-red-400/60 group-data-[highlighted]/item:group-data-[destructive]/item:text-white/80",
        local.class
      )}
      {...others}
    >
      {local.children}
    </span>
  );
};

/* -------------------------------------------------------------------------
 * Separator
 * ------------------------------------------------------------------------- */

export type DitherDropdownMenuSeparatorProps = ComponentProps<
  typeof DropdownMenuPrimitive.Separator
> & {
  color?: DitherColor;
};

export const DitherDropdownMenuSeparator = (
  props: DitherDropdownMenuSeparatorProps
) => {
  const [local, others] = splitProps(props, ["class", "color"]);

  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dither-dropdown-menu-separator"
      class={cn(
        "my-1 -mx-1 h-px bg-white/10 dark:bg-white/10",
        local.class
      )}
      {...others}
    />
  );
};

/* -------------------------------------------------------------------------
 * Checkbox Item
 * ------------------------------------------------------------------------- */

export type DitherDropdownMenuCheckboxItemProps = Omit<
  ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>,
  "checked" | "onChange"
> & {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
  onChange?: (checked: boolean) => void;
  variant?: DitherMenuItemVariant;
  color?: DitherColor;
  bloom?: Bloom;
  asChild?: boolean;
};

export const DitherDropdownMenuCheckboxItem = (
  props: DitherDropdownMenuCheckboxItemProps
) => {
  const look = useDitherMenuLook();

  const [local, others] = splitProps(props, [
    "class",
    "children",
    "checked",
    "defaultChecked",
    "indeterminate",
    "onChange",
    "onCheckedChange",
    "variant",
    "color",
    "bloom",
    "asChild",
  ]);

  const activeVariant = () => local.variant ?? look.variant();
  const activeColor = () => local.color ?? look.color();
  const activeBloom = () => local.bloom ?? look.bloom();

  const isIndeterminate = () =>
    local.indeterminate || local.checked === "indeterminate";

  const isChecked = () =>
    typeof local.checked === "boolean" ? local.checked : undefined;

  const handleChange = (checked: boolean) => {
    local.onChange?.(checked);
    local.onCheckedChange?.(isIndeterminate() ? "indeterminate" : checked);
  };

  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dither-dropdown-menu-checkbox-item"
      data-variant={activeVariant()}
      class={cn(
        "group/item relative flex cursor-default items-center gap-2.5 rounded-[6px] py-1.5 pr-2.5 pl-8 text-[13px] outline-none select-none transition-colors",
        "font-sans font-normal",
        "text-[oklch(0.9_0.005_260)] data-[highlighted]:text-white",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        local.class
      )}
      checked={isChecked()}
      defaultChecked={local.defaultChecked}
      indeterminate={isIndeterminate()}
      onChange={handleChange}
      {...others}
    >
      <ItemHighlight
        variant={activeVariant()}
        color={activeColor()}
        cell={look.cell()}
        matrix={look.matrix()}
        bloom={activeBloom()}
      />

      <span class="pointer-events-none absolute left-2.5 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon class="size-3.5 text-white" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>

      {local.children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
};

/* -------------------------------------------------------------------------
 * Radio Group & Radio Item
 * ------------------------------------------------------------------------- */

export type DitherDropdownMenuRadioGroupProps = Omit<
  ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>,
  "onChange"
> & {
  onValueChange?: (value: string) => void;
  onChange?: (value: string) => void;
  asChild?: boolean;
};

export const DitherDropdownMenuRadioGroup = (
  props: DitherDropdownMenuRadioGroupProps
) => {
  const [local, others] = splitProps(props, [
    "onChange",
    "onValueChange",
    "asChild",
  ]);

  const handleChange = (value: string) => {
    local.onChange?.(value);
    local.onValueChange?.(value);
  };

  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dither-dropdown-menu-radio-group"
      class="flex flex-col gap-0.5"
      onChange={handleChange}
      {...others}
    />
  );
};

export type DitherDropdownMenuRadioItemProps = ComponentProps<
  typeof DropdownMenuPrimitive.RadioItem
> & {
  variant?: DitherMenuItemVariant;
  color?: DitherColor;
  bloom?: Bloom;
  asChild?: boolean;
};

export const DitherDropdownMenuRadioItem = (
  props: DitherDropdownMenuRadioItemProps
) => {
  const look = useDitherMenuLook();

  const [local, others] = splitProps(props, [
    "class",
    "children",
    "variant",
    "color",
    "bloom",
    "asChild",
  ]);

  const activeVariant = () => local.variant ?? look.variant();
  const activeColor = () => local.color ?? look.color();
  const activeBloom = () => local.bloom ?? look.bloom();

  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dither-dropdown-menu-radio-item"
      data-variant={activeVariant()}
      class={cn(
        "group/item relative flex cursor-default items-center gap-2.5 rounded-[6px] py-1.5 pr-2.5 pl-8 text-[13px] outline-none select-none transition-colors",
        "font-sans font-normal",
        "text-[oklch(0.9_0.005_260)] data-[highlighted]:text-white",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        local.class
      )}
      {...others}
    >
      <ItemHighlight
        variant={activeVariant()}
        color={activeColor()}
        cell={look.cell()}
        matrix={look.matrix()}
        bloom={activeBloom()}
      />

      <span class="pointer-events-none absolute left-2.5 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <RadioDotIcon class="size-2 text-white" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>

      {local.children}
    </DropdownMenuPrimitive.RadioItem>
  );
};

/* -------------------------------------------------------------------------
 * Submenu (Sub, SubTrigger, SubContent)
 * ------------------------------------------------------------------------- */

export type DitherDropdownMenuSubProps = ComponentProps<
  typeof DropdownMenuPrimitive.Sub
>;

export const DitherDropdownMenuSub = (props: DitherDropdownMenuSubProps) => {
  const [local, others] = splitProps(props, [
    "gutter",
    "shift",
    "overflowPadding",
    "hideWhenDetached",
  ]);

  const [config, setConfig] = createStore<SubMenuConfig>({
    gutter: local.gutter ?? 4,
    hideWhenDetached: local.hideWhenDetached ?? false,
    overflowPadding: local.overflowPadding ?? 8,
    shift: local.shift ?? -2,
  });

  return (
    <SubMenuConfigContext.Provider value={{ config, setConfig }}>
      <DropdownMenuPrimitive.Sub
        data-slot="dither-dropdown-menu-sub"
        gutter={local.gutter ?? config.gutter}
        shift={local.shift ?? config.shift}
        overflowPadding={local.overflowPadding ?? config.overflowPadding}
        hideWhenDetached={local.hideWhenDetached ?? config.hideWhenDetached}
        {...others}
      />
    </SubMenuConfigContext.Provider>
  );
};

export type DitherDropdownMenuSubTriggerProps = ComponentProps<
  typeof DropdownMenuPrimitive.SubTrigger
> & {
  inset?: boolean;
  variant?: DitherMenuItemVariant;
  color?: DitherColor;
  bloom?: Bloom;
  asChild?: boolean;
};

export const DitherDropdownMenuSubTrigger = (
  props: DitherDropdownMenuSubTriggerProps
) => {
  const look = useDitherMenuLook();
  const context = useMenuContext();
  const [local, others] = splitProps(props, [
    "class",
    "children",
    "inset",
    "variant",
    "color",
    "bloom",
    "asChild",
  ]);

  const activeVariant = () => local.variant ?? look.variant();
  const activeColor = () => local.color ?? look.color();
  const activeBloom = () => local.bloom ?? look.bloom();

  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dither-dropdown-menu-sub-trigger"
      data-inset={local.inset}
      data-variant={activeVariant()}
      data-state={context.isOpen() ? "open" : "closed"}
      class={cn(
        "group/item relative flex cursor-default items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] outline-none select-none transition-colors",
        "font-sans font-normal",
        "text-[oklch(0.9_0.005_260)] data-[highlighted]:text-white data-[state=open]:text-white",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        "data-[inset]:pl-8",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "[&_svg:not([class*='text-'])]:text-muted-foreground group-data-[highlighted]/item:[&_svg:not([class*='text-'])]:text-white",
        local.class
      )}
      {...others}
    >
      <ItemHighlight
        variant={activeVariant()}
        color={activeColor()}
        cell={look.cell()}
        matrix={look.matrix()}
        bloom={activeBloom()}
      />

      {local.children}
      <ChevronRightIcon class="ml-auto size-3.5 text-muted-foreground transition-transform group-data-[highlighted]/item:text-white" />
    </DropdownMenuPrimitive.SubTrigger>
  );
};

export type DitherDropdownMenuSubContentProps = ComponentProps<
  typeof DropdownMenuPrimitive.SubContent
> & {
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  hideWhenDetached?: boolean;
  asChild?: boolean;
};

export const DitherDropdownMenuSubContent = (
  props: DitherDropdownMenuSubContentProps
) => {
  const look = useDitherMenuLook();
  const context = useMenuContext();
  const popperContext = usePopperContext();
  const configContext = useContext(SubMenuConfigContext);

  const [local, others] = splitProps(props, [
    "class",
    "children",
    "sideOffset",
    "alignOffset",
    "collisionPadding",
    "hideWhenDetached",
    "asChild",
  ]);

  const currentSide = () =>
    popperContext.currentPlacement().split("-")[0] as Side;

  createEffect(() => {
    configContext?.setConfig({
      gutter: local.sideOffset ?? 4,
      hideWhenDetached: local.hideWhenDetached ?? false,
      overflowPadding: local.collisionPadding ?? 8,
      shift: local.alignOffset ?? -2,
    });
    reposition();
  });

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        data-slot="dither-dropdown-menu-sub-content"
        data-variant={look.menuVariant()}
        data-state={context.isOpen() ? "open" : "closed"}
        data-side={currentSide()}
        class={cn(
          "dcn-menu-content relative z-50 min-w-[11rem] p-1.5 outline-none select-none",
          CONTAINER_CLASSES[look.menuVariant()],
          "origin-(--kb-menu-content-transform-origin)",
          local.class
        )}
        {...others}
      >
        <Show when={look.menuVariant() === "glow"}>
          <span
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] overflow-hidden"
            style={{
              background: `radial-gradient(circle at top right, color-mix(in oklab, ${cssColor(look.color())} 22%, transparent) 0%, transparent 65%)`,
            }}
          />
        </Show>
        <div class="relative z-10 flex flex-col gap-0.5">
          {local.children}
        </div>
      </DropdownMenuPrimitive.SubContent>
    </DropdownMenuPrimitive.Portal>
  );
};
