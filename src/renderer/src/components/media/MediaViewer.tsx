import { Match, Switch, type Component } from 'solid-js'
import { ImageViewer } from './ImageViewer'
import { MediaPlayer } from './MediaPlayer'
import type { MediaKind } from './mediaKind'
import './media.css'

interface MediaViewerProps {
  path: string
  kind: MediaKind
  /** Short summary for the status bar ("1920 × 1080", "3:24"), null while loading. */
  onInfo: (info: string | null) => void
  /** Present for formats that also have an editable source (SVG). */
  onViewSource?: () => void
}

/** Entry point of the media module: picks the right surface for a file. */
export const MediaViewer: Component<MediaViewerProps> = (props) => (
  <div class="media-viewer relative w-full h-full">
    <Switch>
      <Match when={props.kind === 'image'}>
        <ImageViewer path={props.path} onInfo={props.onInfo} onViewSource={props.onViewSource} />
      </Match>
      <Match when={props.kind === 'video' || props.kind === 'audio'}>
        <MediaPlayer
          path={props.path}
          kind={props.kind as 'video' | 'audio'}
          onInfo={props.onInfo}
        />
      </Match>
    </Switch>
  </div>
)

export default MediaViewer
