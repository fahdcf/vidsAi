import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useRemotionEnvironment,
  useVideoConfig,
} from 'remotion';

import {AnimatedMediaClip, MediaSettings} from './AnimatedMediaClip';
import {CompositionMedia, compositionMediaUrl} from './CompositionMedia';
import {getClipSequenceTiming} from '../contracts/clip-sequence';
import {MotionLayer} from './MotionLayer';
import type {MotionAssetFiles} from '../motion/assets';
import {
  EditState,
  TimelineAudioItem,
  TimelineOverlayItem,
  TimelineSubtitleItem,
  TransitionType,
} from '../timeline';

import {ProgressiveHighlightSubtitle} from './subtitles/ProgressiveHighlightSubtitle';
import {TikTokTrendingSubtitle} from './subtitles/TikTokTrendingSubtitle';
import {ArabicBannerSubtitle} from './subtitles/ArabicBannerSubtitle';
import {RectangularSubtitle} from './subtitles/RectangularSubtitle';
import {RoundedProgressiveSubtitle} from './subtitles/RoundedProgressiveSubtitle';
import {RectangularBannerSubtitle} from './subtitles/RectangularBannerSubtitle';

type SupportedTransition = Extract<
  TransitionType,
  'fade' | 'zoom-in' | 'zoom-out' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'none'
>;

function clipLayer(transition: SupportedTransition, index: number) {
  if (transition === 'zoom-in' || transition === 'zoom-out') return 200 + index;
  if (transition.startsWith('slide-')) return 150 + index;
  return 100 + index;
}

const normalizeTransition = (value: string | undefined): SupportedTransition => {
  switch (value) {
    case 'fade':
    case 'zoom-in':
    case 'zoom-out':
    case 'slide-left':
    case 'slide-right':
    case 'slide-up':
    case 'slide-down':
    case 'none':
      return value;
    default:
      return 'none';
  }
};

const mapMediaType = (mediaType: 'video' | 'image' | 'generated' | undefined): 'video' | 'image' => {
  if (mediaType === 'image' || mediaType === 'generated') {
    return 'image';
  }
  return 'video';
};

const ZoomClip: React.FC<{
  src: string;
  transitionType: 'zoom-in' | 'zoom-out';
  videoWidth: number;
  videoHeight: number;
  leftOffset: number;
  topOffset: number;
  clipIndex: number;
  clipDurationFrames: number;
  transitionFrames: number;
  isFirstClip: boolean;
  isLastClip: boolean;
  mediaType: 'video' | 'image';
  animation: 'zoom-in' | 'zoom-out' | 'none';
  startFrom: number;
  playbackRate: number;
  clipDuration: number;
}> = ({
  src,
  transitionType,
  videoWidth,
  videoHeight,
  leftOffset,
  topOffset,
  clipIndex,
  clipDurationFrames,
  transitionFrames,
  isFirstClip,
  isLastClip,
  mediaType,
  animation,
  startFrom,
  playbackRate,
  clipDuration,
}) => {
  const frame = useCurrentFrame();

  const opacity = 1;
  let scale = 1;

  if (!isFirstClip && frame < transitionFrames) {
    const progress = Math.min(1, Math.max(0, frame / transitionFrames));
    if (transitionType === 'zoom-in') {
      scale = 0.7 + 0.3 * progress;
    } else {
      scale = 1.4 - 0.4 * progress;
    }
  } else if (!isLastClip && frame >= clipDurationFrames - transitionFrames) {
    const exitFrame = frame - (clipDurationFrames - transitionFrames);
    const progress = Math.min(1, Math.max(0, exitFrame / transitionFrames));
    if (transitionType === 'zoom-in') {
      scale = 1 + 0.2 * progress;
    } else {
      scale = 1 - 0.3 * progress;
    }
  }

  return (
    <AbsoluteFill
      style={{
        width: videoWidth,
        height: videoHeight,
        left: leftOffset,
        top: topOffset,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        perspective: 1000,
        transformStyle: 'preserve-3d',
        filter: 'none',
        contain: 'layout style paint',
        isolation: 'isolate',
        zIndex: clipLayer(transitionType, clipIndex),
      }}
    >
      <AnimatedMediaClip
        src={src}
        mediaType={mediaType}
        animation={animation}
        duration={clipDuration}
        startFrom={startFrom}
        playbackRate={playbackRate}
      />
    </AbsoluteFill>
  );
};

const FadeClip: React.FC<{
  src: string;
  videoWidth: number;
  videoHeight: number;
  leftOffset: number;
  topOffset: number;
  clipIndex: number;
  clipDurationFrames: number;
  transitionFrames: number;
  isFirstClip: boolean;
  isLastClip: boolean;
  mediaType: 'video' | 'image';
  animation: 'zoom-in' | 'zoom-out' | 'none';
  startFrom: number;
  playbackRate: number;
  clipDuration: number;
}> = ({
  src,
  videoWidth,
  videoHeight,
  leftOffset,
  topOffset,
  clipIndex,
  clipDurationFrames,
  transitionFrames,
  isFirstClip,
  isLastClip,
  mediaType,
  animation,
  startFrom,
  playbackRate,
  clipDuration,
}) => {
  const frame = useCurrentFrame();

  let opacity = 1;
  if (!isFirstClip && frame < transitionFrames) {
    opacity = Math.min(1, Math.max(0, frame / transitionFrames));
  } else if (!isLastClip && frame >= clipDurationFrames - transitionFrames) {
    const exitFrame = frame - (clipDurationFrames - transitionFrames);
    const progress = Math.min(1, Math.max(0, exitFrame / transitionFrames));
    opacity = 1 - progress;
  }

  if (opacity < 0.001) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        width: videoWidth,
        height: videoHeight,
        left: leftOffset,
        top: topOffset,
        opacity,
        zIndex: clipLayer('fade', clipIndex),
        willChange: 'opacity',
      }}
    >
      <AnimatedMediaClip
        src={src}
        mediaType={mediaType}
        animation={animation}
        duration={clipDuration}
        startFrom={startFrom}
        playbackRate={playbackRate}
      />
    </AbsoluteFill>
  );
};

const SlideClip: React.FC<{
  src: string;
  transitionType: 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down';
  videoWidth: number;
  videoHeight: number;
  leftOffset: number;
  topOffset: number;
  clipIndex: number;
  clipDurationFrames: number;
  transitionFrames: number;
  isFirstClip: boolean;
  isLastClip: boolean;
  mediaType: 'video' | 'image';
  animation: 'zoom-in' | 'zoom-out' | 'none';
  startFrom: number;
  playbackRate: number;
  clipDuration: number;
}> = ({
  src,
  transitionType,
  videoWidth,
  videoHeight,
  leftOffset,
  topOffset,
  clipIndex,
  clipDurationFrames,
  transitionFrames,
  isFirstClip,
  isLastClip,
  mediaType,
  animation,
  startFrom,
  playbackRate,
  clipDuration,
}) => {
  const frame = useCurrentFrame();

  let translateX = 0;
  let translateY = 0;

  if (!isFirstClip && frame < transitionFrames) {
    const progress = Math.min(1, Math.max(0, frame / transitionFrames));
    switch (transitionType) {
      case 'slide-left':
        translateX = (1 - progress) * videoWidth;
        break;
      case 'slide-right':
        translateX = -(1 - progress) * videoWidth;
        break;
      case 'slide-up':
        translateY = (1 - progress) * videoHeight;
        break;
      case 'slide-down':
        translateY = -(1 - progress) * videoHeight;
        break;
    }
  } else if (!isLastClip && frame >= clipDurationFrames - transitionFrames) {
    const exitFrame = frame - (clipDurationFrames - transitionFrames);
    const progress = Math.min(1, Math.max(0, exitFrame / transitionFrames));
    switch (transitionType) {
      case 'slide-left':
        translateX = -progress * videoWidth;
        break;
      case 'slide-right':
        translateX = progress * videoWidth;
        break;
      case 'slide-up':
        translateY = -progress * videoHeight;
        break;
      case 'slide-down':
        translateY = progress * videoHeight;
        break;
    }
  }

  return (
    <AbsoluteFill
      style={{
        width: videoWidth,
        height: videoHeight,
        left: leftOffset,
        top: topOffset,
        transform: `translateX(${translateX}px) translateY(${translateY}px)`,
        zIndex: clipLayer(transitionType, clipIndex),
        willChange: 'transform',
      }}
    >
      <AnimatedMediaClip
        src={src}
        mediaType={mediaType}
        animation={animation}
        duration={clipDuration}
        startFrom={startFrom}
        playbackRate={playbackRate}
      />
    </AbsoluteFill>
  );
};

const SimpleClip: React.FC<{
  src: string;
  videoWidth: number;
  videoHeight: number;
  leftOffset: number;
  topOffset: number;
  clipIndex: number;
  mediaType: 'video' | 'image';
  animation: 'zoom-in' | 'zoom-out' | 'none';
  startFrom: number;
  playbackRate: number;
  clipDuration: number;
}> = ({
  src,
  videoWidth,
  videoHeight,
  leftOffset,
  topOffset,
  clipIndex,
  mediaType,
  animation,
  startFrom,
  playbackRate,
  clipDuration,
}) => {
  return (
    <AbsoluteFill
      style={{
        width: videoWidth,
        height: videoHeight,
        left: leftOffset,
        top: topOffset,
        zIndex: clipLayer('none', clipIndex),
      }}
    >
      <AnimatedMediaClip
        src={src}
        mediaType={mediaType}
        animation={animation}
        duration={clipDuration}
        startFrom={startFrom}
        playbackRate={playbackRate}
      />
    </AbsoluteFill>
  );
};

function resolveSubtitlePosition(subtitle: TimelineSubtitleItem): 'top' | 'center' | 'bottom' {
  const pos =
    (subtitle.config as Record<string, unknown>)?.position ?? subtitle.position ?? 'bottom';
  if (pos === 'top' || pos === 'center' || pos === 'bottom') {
    return pos;
  }
  return 'bottom';
}

const subtitlePositionStyles: Record<'top' | 'center' | 'bottom', React.CSSProperties> = {
  top: {top: '8%', bottom: 'auto', transform: 'none'},
  center: {top: '50%', bottom: 'auto', transform: 'translateY(-50%)'},
  bottom: {bottom: '8%', top: 'auto', transform: 'none'},
};

const SubtitleRenderer: React.FC<{
  subtitles: TimelineSubtitleItem[];
  fps: number;
}> = ({subtitles, fps}) => {
  return (
    <AbsoluteFill>
      {subtitles.map((subtitle) => {
        const durationFrames = Math.max(1, subtitle.end_frame - subtitle.start_frame);
        if (durationFrames <= 0) {
          return null;
        }

        return (
          <Sequence key={subtitle.id} from={subtitle.start_frame} durationInFrames={durationFrames} layout='none'>
            <SubtitleItemRenderer subtitle={subtitle} fps={fps} durationFrames={durationFrames} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const SubtitleItemRenderer: React.FC<{
  subtitle: TimelineSubtitleItem;
  fps: number;
  durationFrames: number;
}> = ({subtitle, fps, durationFrames}) => {
  const frame = useCurrentFrame();
  const subtitleStyle = subtitle.style || 'default';
  const resolvedPosition = resolveSubtitlePosition(subtitle);
  const subtitleConfig = (subtitle.config ?? {}) as Record<string, unknown>;
  const configBackgroundColor = subtitleConfig.backgroundColor as string | undefined;
  const configTextColor =
    (subtitleConfig.textColor as string | undefined) || (subtitleConfig.color as string | undefined);
  const configFontFamily = subtitleConfig.fontFamily as string | undefined;
  const configFontSize = subtitleConfig.fontSize as string | undefined;
  const configBold = Boolean(subtitleConfig.bold);

  const renderSubtitle = () => {
    switch (subtitleStyle) {
      case 'progressive_highlight':
        return (
          <ProgressiveHighlightSubtitle
            text={subtitle.text}
            backgroundColor={configBackgroundColor || '#007acc'}
            startFrame={0}
            endFrame={durationFrames}
            fontFamily={configFontFamily}
            config={subtitleConfig}
            words={subtitle.words}
          />
        );

      case 'tiktok_trending':
        return (
          <TikTokTrendingSubtitle
            text={subtitle.text}
            backgroundColor={configBackgroundColor}
            animationFrame={frame}
            fontFamily={configFontFamily}
            config={subtitleConfig}
          />
        );

      case 'arabic_banner':
        return (
          <ArabicBannerSubtitle
            text={subtitle.text}
            backgroundColor={configBackgroundColor}
            animationFrame={frame}
            fontFamily={configFontFamily}
            config={subtitleConfig}
          />
        );

      case 'rectangular':
        return (
          <RectangularSubtitle
            text={subtitle.text}
            backgroundColor={configBackgroundColor || '#000000'}
            textColor={configTextColor || '#ffffff'}
            fontFamily={configFontFamily}
            fontWeight={configBold ? '900' : 'bold'}
            config={subtitleConfig}
          />
        );

      case 'rounded_progressive':
        return (
          <RoundedProgressiveSubtitle
            text={subtitle.text}
            backgroundColor={configBackgroundColor}
            startFrame={0}
            endFrame={durationFrames}
            config={subtitleConfig}
            words={subtitle.words}
          />
        );

      case 'rectangular_banner':
        return (
          <RectangularBannerSubtitle
            text={subtitle.text}
            backgroundColor={configBackgroundColor}
            animationFrame={frame}
            fontFamily={configFontFamily}
            config={subtitleConfig}
          />
        );

      case 'default':
      default: {
        const transitionFrames = Math.max(1, Math.round(0.3 * fps));
        let opacity = 1;

        if (frame < transitionFrames) {
          const fadeIn = frame / transitionFrames;
          opacity = Math.max(0, Math.min(1, fadeIn));
        } else if (frame > durationFrames - transitionFrames) {
          const fadeOut = (durationFrames - frame) / transitionFrames;
          opacity = Math.max(0, Math.min(1, fadeOut));
        }

        return (
          <div
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: configTextColor || '#ffffff',
              fontSize: configFontSize || '32px',
              fontWeight: configBold ? 900 : 'bold',
              textAlign: 'center',
              opacity,
              fontFamily: configFontFamily || 'Arial, sans-serif',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              maxWidth: '80%',
              wordWrap: 'break-word',
            }}
          >
            {subtitle.text}
          </div>
        );
      }
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 40px',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        zIndex: 1000,
        ...subtitlePositionStyles[resolvedPosition],
      }}
    >
      {renderSubtitle()}
    </div>
  );
};

const OverlayRenderer: React.FC<{
  overlays: TimelineOverlayItem[];
}> = ({overlays}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      {overlays.map((overlay) => {
        const isVisible = frame >= overlay.start_frame && frame <= overlay.end_frame;
        if (!isVisible) {
          return null;
        }

        const progress =
          overlay.end_frame === overlay.start_frame
            ? 1
            : (frame - overlay.start_frame) / (overlay.end_frame - overlay.start_frame);
        let opacity = overlay.opacity;

        if (overlay.animation === 'fade') {
          opacity = (Math.sin(progress * Math.PI * 4) * 0.3 + 0.7) * overlay.opacity;
        }

        let positionStyle: React.CSSProperties = {};
        switch (overlay.position) {
          case 'top-left':
            positionStyle = {top: '20px', left: '20px'};
            break;
          case 'top-right':
            positionStyle = {top: '20px', right: '20px'};
            break;
          case 'bottom-left':
            positionStyle = {bottom: '20px', left: '20px'};
            break;
          case 'bottom-right':
            positionStyle = {bottom: '20px', right: '20px'};
            break;
          case 'center':
            positionStyle = {
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            };
            break;
          default:
            positionStyle = {top: '20px', right: '20px'};
            break;
        }

        return (
          <div
            key={overlay.id}
            style={{
              position: 'absolute',
              ...positionStyle,
              opacity,
              zIndex: 500,
            }}
          >
            <Img
              src={overlay.src}
              style={{
                width: overlay.width,
                objectFit: 'contain',
              }}
              alt='Overlay'
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const AudioTrackRenderer: React.FC<{
  audioTracks: TimelineAudioItem[];
  projectId: string;
}> = ({audioTracks, projectId}) => {
  const frame = useCurrentFrame();
  const {Audio} = React.useContext(CompositionMedia);

  return (
    <>
      {audioTracks.map((track) => {
        const asset = /^asset:([a-f0-9-]{36})$/i.exec(track.url)?.[1];
        const src = asset ? `/projects/${encodeURIComponent(projectId)}/assets/${asset}` : compositionMediaUrl(track.url);
        const volume = (() => {
          if (frame < track.start_frame || frame > track.end_frame) {
            return 0;
          }

          let v = track.volume;

          if (track.fade_in_frames > 0 && frame < track.start_frame + track.fade_in_frames) {
            const fadeInFactor = interpolate(
              frame,
              [track.start_frame, track.start_frame + track.fade_in_frames],
              [0, 1],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              },
            );
            v *= fadeInFactor;
          }

          if (track.fade_out_frames > 0 && frame > track.end_frame - track.fade_out_frames) {
            const fadeOutFactor = interpolate(
              frame,
              [track.end_frame - track.fade_out_frames, track.end_frame],
              [1, 0],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              },
            );
            v *= fadeOutFactor;
          }

          return Math.max(0, v);
        })();

        return <Sequence key={track.id} from={track.start_frame} durationInFrames={track.end_frame-track.start_frame} layout="none"><Audio src={src} volume={volume} /></Sequence>;
      })}
    </>
  );
};

export const VideoMerger: React.FC<{editState: EditState; motionAssets?: MotionAssetFiles; motionScale?: number}> = ({editState, motionAssets, motionScale = 1}) => {
  const {isClientSideRendering} = useRemotionEnvironment();

  const {width: canvasWidth, height: canvasHeight, fps: compositionFps, durationInFrames: compositionDuration} = useVideoConfig();
  const fps = editState.fps || compositionFps;

  const finalVideoWidth = editState.width || canvasWidth;
  const finalVideoHeight = editState.height || canvasHeight;
  const leftOffset = Math.round((canvasWidth - finalVideoWidth) / 2);
  const topOffset = Math.round((canvasHeight - finalVideoHeight) / 2);

  const videoTrack = [...(editState.tracks.video || [])].sort(
    (a, b) => a.start_frame - b.start_frame,
  );
  const subtitles = editState.tracks.subtitles || [];
  const overlays = editState.tracks.overlays || [];
  const audioTracks = editState.tracks.audio || [];
  const motionGraphics = [...(editState.tracks.motion_graphics || [])].sort((a, b) => a.layer - b.layer || a.start_frame - b.start_frame);

  const renderedClips = videoTrack.map((clip, index) => {
    const clipDurationFrames = Math.max(1, clip.end_frame - clip.start_frame);
    const prevClip = index > 0 ? videoTrack[index - 1] : null;

    const isLastClip = index === videoTrack.length - 1;
    const {from, durationInFrames, enterTransitionFrames, exitTransitionFrames} =
      getClipSequenceTiming(clip, prevClip, isLastClip);

    const enterType = normalizeTransition(prevClip?.transition_out?.type);
    const exitType = normalizeTransition(clip.transition_out?.type);
    const transitionType: SupportedTransition = exitType !== 'none' ? exitType : enterType;
    const transitionFrames = Math.max(1, enterTransitionFrames, exitTransitionFrames);

    const isFirstClip = index === 0;

    const animation = clip.animation === 'zoom-in' || clip.animation === 'zoom-out' ? clip.animation : 'none';
    const playbackRate = clip.speed && clip.speed > 0 ? clip.speed : 1;
    const mediaType = mapMediaType(clip.media_type);
    const trimIn = Math.max(0, clip.trim_in || 0);
    const effectiveSourceDurationFrames = Math.max(1, (clip.trim_out || clipDurationFrames) - trimIn);
    const clipDurationSeconds = effectiveSourceDurationFrames / fps;
    const layered = (node: React.ReactNode) => ({
      clip,
      layer: clipLayer(transitionType, index),
      node,
    });

    if (transitionType === 'zoom-in' || transitionType === 'zoom-out') {
      return layered(
        <Sequence key={clip.id} from={from} durationInFrames={durationInFrames} layout='none' showInTimeline>
          <ZoomClip
            src={clip.clip_url}
            transitionType={transitionType}
            videoWidth={finalVideoWidth}
            videoHeight={finalVideoHeight}
            leftOffset={leftOffset}
            topOffset={topOffset}
            clipIndex={index}
            clipDurationFrames={durationInFrames}
            transitionFrames={transitionFrames}
            isFirstClip={isFirstClip}
            isLastClip={isLastClip}
            mediaType={mediaType}
            animation={animation}
            startFrom={trimIn}
            playbackRate={playbackRate}
            clipDuration={clipDurationSeconds}
          />
        </Sequence>
      );
    }

    if (transitionType === 'fade') {
      return layered(
        <Sequence key={clip.id} from={from} durationInFrames={durationInFrames} layout='none' showInTimeline>
          <FadeClip
            src={clip.clip_url}
            videoWidth={finalVideoWidth}
            videoHeight={finalVideoHeight}
            leftOffset={leftOffset}
            topOffset={topOffset}
            clipIndex={index}
            clipDurationFrames={durationInFrames}
            transitionFrames={transitionFrames}
            isFirstClip={isFirstClip}
            isLastClip={isLastClip}
            mediaType={mediaType}
            animation={animation}
            startFrom={trimIn}
            playbackRate={playbackRate}
            clipDuration={clipDurationSeconds}
          />
        </Sequence>
      );
    }

    if (
      transitionType === 'slide-left' ||
      transitionType === 'slide-right' ||
      transitionType === 'slide-up' ||
      transitionType === 'slide-down'
    ) {
      return layered(
        <Sequence key={clip.id} from={from} durationInFrames={durationInFrames} layout='none' showInTimeline>
          <SlideClip
            src={clip.clip_url}
            transitionType={transitionType}
            videoWidth={finalVideoWidth}
            videoHeight={finalVideoHeight}
            leftOffset={leftOffset}
            topOffset={topOffset}
            clipIndex={index}
            clipDurationFrames={durationInFrames}
            transitionFrames={transitionFrames}
            isFirstClip={isFirstClip}
            isLastClip={isLastClip}
            mediaType={mediaType}
            animation={animation}
            startFrom={trimIn}
            playbackRate={playbackRate}
            clipDuration={clipDurationSeconds}
          />
        </Sequence>
      );
    }

    return layered(
      <Sequence key={clip.id} from={from} durationInFrames={durationInFrames} layout='none' showInTimeline>
        <SimpleClip
          src={clip.clip_url}
          videoWidth={finalVideoWidth}
          videoHeight={finalVideoHeight}
          leftOffset={leftOffset}
          topOffset={topOffset}
          clipIndex={index}
          mediaType={mediaType}
          animation={animation}
          startFrom={trimIn}
          playbackRate={playbackRate}
          clipDuration={clipDurationSeconds}
        />
      </Sequence>
    );
  });

  // The browser exporter paints siblings in DOM order. Match the CSS layers
  // used by the editor preview and server reference when clips overlap.
  if (isClientSideRendering) renderedClips.sort((a, b) => a.layer - b.layer);
  const captions = subtitles.length > 0 ? <SubtitleRenderer subtitles={subtitles} fps={fps} /> : null;

  return (
    <Sequence durationInFrames={Math.max(1, compositionDuration, editState.total_frames)} layout='none'>
      <AbsoluteFill
        style={{
          backgroundColor: '#000000',
          willChange: 'auto',
          transform: 'translateZ(0)',
        }}
      >
        {renderedClips.map(({clip, node}) => (
          <MediaSettings.Provider key={clip.id} value={{endAt: clip.trim_out, volume: clip.volume}}>
            {node}
          </MediaSettings.Provider>
        ))}

        {audioTracks.length > 0 ? <AudioTrackRenderer audioTracks={audioTracks} projectId={String(editState.project_id)} /> : null}

        {motionGraphics.map((scene) => (
          <Sequence key={scene.id} from={scene.start_frame} durationInFrames={scene.end_frame - scene.start_frame} layout='none'>
            <MotionLayer scene={scene} projectId={editState.project_id} width={finalVideoWidth} height={finalVideoHeight}
              left={leftOffset} top={topOffset} fps={fps} scale={motionScale} preloaded={motionAssets} />
          </Sequence>
        ))}

        {!isClientSideRendering ? captions : null}

        {overlays.length > 0 ? <OverlayRenderer overlays={overlays} /> : null}
        {isClientSideRendering ? captions : null}

      </AbsoluteFill>
    </Sequence>
  );
};
