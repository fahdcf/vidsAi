import {createContext, type ComponentType, type ComponentProps} from 'react';
import {Audio, OffthreadVideo, staticFile} from 'remotion';

type VideoProps = Pick<
  ComponentProps<typeof OffthreadVideo>,
  'src' | 'trimBefore' | 'trimAfter' | 'playbackRate' | 'muted' | 'volume' | 'style'
>;
type AudioProps = {src: string; volume?: ComponentProps<typeof Audio>['volume']};

export const CompositionMedia = createContext<{
  Video: ComponentType<VideoProps>;
  Audio: ComponentType<AudioProps>;
}>({Video: OffthreadVideo, Audio});

export function compositionMediaUrl(src: string) {
  return /^(https?:|blob:)/i.test(src) ? src : staticFile(src);
}
