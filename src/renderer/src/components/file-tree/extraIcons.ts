// Polaris additions to the Pierre set, drawn in the same 16px two-tone style
// (".bg" at reduced opacity, ".fg" solid). Pierre ships no video/audio glyphs.

export const EXTRA_SYMBOLS =
  '<symbol id="file-tree-builtin-video" viewBox="0 0 16 16">' +
  '<path fill="currentColor" opacity=".5" d="M1.5 4.5A2 2 0 0 1 3.5 2.5h6A2 2 0 0 1 11.5 4.5v7a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2z"/>' +
  '<path fill="currentColor" d="M12.5 6.1 14.7 4.6a.5.5 0 0 1 .8.4v6a.5.5 0 0 1-.8.4l-2.2-1.5zM5 6.2v3.6a.4.4 0 0 0 .6.35l3-1.8a.4.4 0 0 0 0-.7l-3-1.8A.4.4 0 0 0 5 6.2"/>' +
  '</symbol>' +
  '<symbol id="file-tree-builtin-audio" viewBox="0 0 16 16">' +
  '<path fill="currentColor" opacity=".5" d="M6 3.6 13 2v8.5h-1.5V4.1L7.5 5v7H6z"/>' +
  '<circle fill="currentColor" cx="4.25" cy="12" r="2.25"/><circle fill="currentColor" cx="11.25" cy="10.5" r="2.25"/>' +
  '</symbol>'

const VIDEO = ['mp4', 'm4v', 'webm', 'mov', 'ogv', 'mkv', 'avi']
const AUDIO = ['mp3', 'wav', 'ogg', 'oga', 'opus', 'flac', 'm4a', 'aac']

export const EXTRA_EXTENSION_TOKENS: Record<string, string> = Object.fromEntries([
  ...VIDEO.map((e) => [e, 'video']),
  ...AUDIO.map((e) => [e, 'audio'])
])

export const EXTRA_TOKEN_COLORS: Record<string, string> = {
  video: '#d568ea', // Pierre purple
  audio: '#64d1db' // Pierre teal
}
