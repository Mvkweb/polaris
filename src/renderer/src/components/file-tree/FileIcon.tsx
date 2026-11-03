import type { Component } from 'solid-js'
import { getFileIcon } from './iconResolver'

interface FileIconProps {
  name: string
  isDirectory: boolean
  isExpanded?: boolean
  class?: string
}

export const FileIcon: Component<FileIconProps> = (props) => {
  const iconSrc = () => getFileIcon(props.name, props.isDirectory, props.isExpanded)

  return (
    <img
      src={iconSrc()}
      alt=""
      aria-hidden="true"
      draggable={false}
      class={`w-4 h-4 shrink-0 select-none object-contain pointer-events-none ${props.class || ''}`}
    />
  )
}

export default FileIcon
