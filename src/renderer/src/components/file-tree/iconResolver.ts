// Dynamically import all JetBrains New UI icons through Vite's eager glob
import themeData from '../../assets/icons/jetbrains/theme.json'

interface IconThemeDefinition {
  themes: Array<{
    name: string
    appearance: string
    directory_icons?: {
      collapsed?: string
      expanded?: string
    }
    file_stems?: Record<string, string>
    file_suffixes?: Record<string, string>
    file_icons?: Record<string, { path: string }>
  }>
}

const themeConfig = themeData as unknown as IconThemeDefinition
const activeTheme = themeConfig.themes[0]

// Eagerly glob all JetBrains SVGs so Vite bundles them with optimal asset URLs
const iconModules = import.meta.glob<string>('../../assets/icons/jetbrains/*.svg', {
  eager: true,
  import: 'default'
})

// Build fast lookup map from filename/stem to resolved asset URL
const iconUrlMap = new Map<string, string>()

for (const [filePath, url] of Object.entries(iconModules)) {
  const fileName = filePath.split('/').pop() || ''
  if (fileName) {
    iconUrlMap.set(fileName.toLowerCase(), url)
    iconUrlMap.set(fileName.replace(/\.svg$/, '').toLowerCase(), url)
  }
}

// Helper to look up SVG by filename or key
function resolveIconUrl(target: string): string | undefined {
  if (!target) return undefined
  const cleaned = target
    .replace(/^\.\/icons\//, '')
    .replace(/^\//, '')
    .toLowerCase()
  return iconUrlMap.get(cleaned) || iconUrlMap.get(cleaned.replace(/\.svg$/, ''))
}

// Built-in theme mappings from theme.json
const themeStems = activeTheme?.file_stems || {}
const themeSuffixes = activeTheme?.file_suffixes || {}
const themeIcons = activeTheme?.file_icons || {}

// Custom folder icons map
const CUSTOM_FOLDERS: Record<string, string> = {
  src: 'folder_src.svg',
  source: 'folder_src.svg',
  components: 'folder_components.svg',
  node_modules: 'folder_node.svg',
  '.github': 'folder_github.svg',
  '.git': 'folder_github.svg',
  assets: 'image_dark.svg',
  images: 'image_dark.svg',
  img: 'image_dark.svg',
  icons: 'image_dark.svg',
  '.vscode': 'config_dark.svg',
  config: 'config_dark.svg',
  '.config': 'config_dark.svg',
  dots: 'config_dark.svg',
  quickshell: 'folder_src.svg',
  modules: 'folder_components.svg',
  backend: 'shell_dark.svg'
}

// Common file stems
const CUSTOM_STEMS: Record<string, string> = {
  makefile: 'makefile_dark.svg',
  'cmakelists.txt': 'cmake.svg',
  dockerfile: 'docker_dark.svg',
  'docker-compose.yml': 'docker_dark.svg',
  'docker-compose.yaml': 'docker_dark.svg',
  '.gitignore': 'gitignore.svg',
  '.gitattributes': 'gitignore.svg',
  '.gitmodules': 'gitignore.svg',
  'package.json': 'config_dark.svg',
  'tsconfig.json': 'config_dark.svg',
  'tsconfig.web.json': 'config_dark.svg',
  'tsconfig.node.json': 'config_dark.svg',
  'bun.lock': 'config_dark.svg',
  'bun.lockb': 'config_dark.svg',
  'package-lock.json': 'config_dark.svg',
  'pnpm-lock.yaml': 'config_dark.svg',
  '.env': 'config_dark.svg',
  '.env.local': 'config_dark.svg',
  '.env.production': 'config_dark.svg',
  '.eslintrc': 'eslint.svg',
  '.eslintrc.json': 'eslint.svg',
  '.eslintrc.js': 'eslint.svg',
  '.oxlintrc.json': 'config_dark.svg'
}

// Comprehensive file suffixes
const CUSTOM_SUFFIXES: Record<string, string> = {
  // QML / Qt
  qml: 'qml_dark.svg',

  // TypeScript / JavaScript / React
  ts: 'typescript_dark.svg',
  mts: 'typescript_dark.svg',
  cts: 'typescript_dark.svg',
  tsx: 'tsx_dark.svg',
  js: 'javascript_dark.svg',
  mjs: 'javascript_dark.svg',
  cjs: 'javascript_dark.svg',
  jsx: 'tsx_dark.svg',

  // Web & Styles
  css: 'css.svg',
  scss: 'css.svg',
  sass: 'css.svg',
  less: 'css.svg',
  html: 'anytype_dark.svg',
  htm: 'anytype_dark.svg',
  vue: 'vuejs.svg',

  // Config & Data
  json: 'json_dark.svg',
  jsonc: 'json_dark.svg',
  toml: 'toml_dark.svg',
  yaml: 'config_dark.svg',
  yml: 'config_dark.svg',
  xml: 'config_dark.svg',
  ini: 'config_dark.svg',

  // Systems & Languages
  rs: 'rustfile_dark.svg',
  py: 'python.svg',
  pyw: 'python.svg',
  go: 'go_dark.svg',
  c: 'c_dark.svg',
  h: 'h_dark.svg',
  cpp: 'cpp_dark.svg',
  hpp: 'h_dark.svg',
  cs: 'csharp_dark.svg',
  dart: 'dart_dark.svg',
  zig: 'zig_dark.svg',
  lua: 'lua.svg',
  java: 'java_dark.svg',
  kt: 'kotlin_dark.svg',
  kts: 'kotlin_dark.svg',
  swift: 'swift.svg',
  rb: 'ruby_dark.svg',
  php: 'php_dark.svg',
  scala: 'scala_dark.svg',
  sh: 'shell_dark.svg',
  bash: 'shell_dark.svg',
  zsh: 'shell_dark.svg',
  fish: 'shell_dark.svg',
  bat: 'shell_dark.svg',
  cmd: 'shell_dark.svg',

  // Documents
  md: 'text_dark.svg',
  markdown: 'text_dark.svg',
  txt: 'text_dark.svg',
  log: 'text_dark.svg',

  // Media
  png: 'image_dark.svg',
  jpg: 'image_dark.svg',
  jpeg: 'image_dark.svg',
  gif: 'image_dark.svg',
  svg: 'image_dark.svg',
  webp: 'image_dark.svg',
  ico: 'image_dark.svg',
  icns: 'image_dark.svg',
  bmp: 'image_dark.svg',
  avif: 'image_dark.svg',
  woff: 'font_dark.svg',
  woff2: 'font_dark.svg',
  ttf: 'font_dark.svg',
  otf: 'font_dark.svg'
}

const DEFAULT_FILE_ICON = resolveIconUrl('anyType_dark.svg') || ''
const DEFAULT_FOLDER_COLLAPSED = resolveIconUrl('folder_dark.svg') || ''
const DEFAULT_FOLDER_EXPANDED = resolveIconUrl('folder_open_dark.svg') || DEFAULT_FOLDER_COLLAPSED

/**
 * Resolves the appropriate JetBrains New UI icon URL for any file or folder.
 */
export function getFileIcon(name: string, isDirectory: boolean, isExpanded = false): string {
  const lowerName = name.toLowerCase()

  // 1. Directory resolution
  if (isDirectory) {
    // Check custom folder icon first
    const customFolder = CUSTOM_FOLDERS[lowerName]
    if (customFolder) {
      const resolved = resolveIconUrl(customFolder)
      if (resolved) return resolved
    }

    return isExpanded ? DEFAULT_FOLDER_EXPANDED : DEFAULT_FOLDER_COLLAPSED
  }

  // 2. Custom file stems (exact filename match)
  const customStem = CUSTOM_STEMS[lowerName]
  if (customStem) {
    const resolved = resolveIconUrl(customStem)
    if (resolved) return resolved
  }

  // 3. Theme JSON file stems
  const themeStemKey = themeStems[name] || themeStems[lowerName]
  if (themeStemKey) {
    const iconDef = themeIcons[themeStemKey]
    if (iconDef?.path) {
      const resolved = resolveIconUrl(iconDef.path)
      if (resolved) return resolved
    }
  }

  // 4. File extension / suffix match
  const parts = lowerName.split('.')
  const ext = parts.length > 1 ? parts.pop() || '' : ''

  if (ext) {
    const customSuffix = CUSTOM_SUFFIXES[ext]
    if (customSuffix) {
      const resolved = resolveIconUrl(customSuffix)
      if (resolved) return resolved
    }

    const themeSuffixKey = themeSuffixes[ext]
    if (themeSuffixKey) {
      const iconDef = themeIcons[themeSuffixKey]
      if (iconDef?.path) {
        const resolved = resolveIconUrl(iconDef.path)
        if (resolved) return resolved
      }
    }
  }

  return DEFAULT_FILE_ICON
}
