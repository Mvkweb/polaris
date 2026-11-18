export const timeAgo = (unixSecs: number): string => {
  if (!unixSecs) return ''
  const diffSecs = Math.floor(Date.now() / 1000) - unixSecs
  if (diffSecs < 60) return 'now'
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m`
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h`
  return `${Math.floor(diffSecs / 86400)}d`
}
