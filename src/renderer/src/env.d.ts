/// <reference types="vite/client" />

declare module 'solid-thinking-orbs' {
  import type { Component, JSX } from 'solid-js'

  export interface AnimatedGradientPresetConfig {
    preset:
      | 'Prism'
      | 'Lava'
      | 'Plasma'
      | 'Pulse'
      | 'Vortex'
      | 'Mist'
      | 'Aurora'
      | 'Cyberpunk'
      | 'Velvet'
      | 'Sunset'
      | 'DeepOcean'
      | 'Amber'
      | 'Neon'
      | 'CottonCandy'
      | 'Emerald'
      | 'Opal'
      | 'Electric'
      | 'Retro'
      | 'Flare'
      | 'Magma'
    speed?: number
  }

  export interface AnimatedGradientCustomConfig {
    preset: 'custom'
    color1: string
    color2: string
    color3: string
    rotation?: number
    proportion?: number
    scale?: number
    speed?: number
    distortion?: number
    swirl?: number
    swirlIterations?: number
    softness?: number
    offset?: number
    shape?: 'Checks' | 'Stripes' | 'Edge' | 'Noise' | 'Waves'
    shapeSize?: number
  }

  export interface AnimatedGradientNoiseConfig {
    opacity: number
    scale?: number
  }

  export interface AnimatedGradientProps {
    config?: AnimatedGradientPresetConfig | AnimatedGradientCustomConfig
    noise?: AnimatedGradientNoiseConfig
    radius?: string
    theme?: 'light' | 'dark' | 'auto'
    class?: string
    style?: JSX.CSSProperties | string
    [key: string]: any
  }

  export type OrbState =
    | 'working'
    | 'searching'
    | 'solving'
    | 'listening'
    | 'composing'
    | 'shaping'
    | 'syncing'
    | 'evolving'
    | 'building'
    | 'hypercube'
    | 'conjuring'
    | 'conjuring_static'
    | 'assembling'
    | 'blooming'
    | 'glacio'
    | 'flower'
    | 'sandglass'
    | 'sand_orbs'

  export interface ThinkingOrbProps {
    state?: OrbState
    size?: number
    speed?: number
    paused?: boolean
    theme?: 'auto' | 'dark' | 'light'
    style?: JSX.CSSProperties | string
    class?: string
    [key: string]: any
  }

  export const AnimatedGradient: Component<AnimatedGradientProps>
  export const ThinkingOrb: Component<ThinkingOrbProps>
  export const BorderBeam: Component<any>
  export const MetalFx: Component<any>
  export const BotAvatar: Component<any>
  export const LightRays: Component<any>
  export const Rays: Component<any>
  export const Liquid: Component<any>
  export const TodoList: Component<any>
  export const AgentThinking: Component<any>
  export const WebSearch: Component<any>
  export const ActivityHeatmap: Component<any>
  export const ActivityHeatmapV2: Component<any>
}
