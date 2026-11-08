import React, { useMemo } from 'react';
import { Img, useCurrentFrame, useVideoConfig, AbsoluteFill, Loop } from 'remotion';
import {CompositionMedia, compositionMediaUrl} from './CompositionMedia';
export const MediaSettings = React.createContext<{endAt?:number;volume:number}>({volume:0});

interface AnimatedMediaClipProps {
  src?: string;
  clip_url?: string;
  startFrom?: number;
  trim_in?: number;
  trim_out?: number; // Frame offset into source clip to stop playing at
  style?: React.CSSProperties;
  mediaType?: 'video' | 'image' | 'generated';
  media_type?: 'video' | 'image' | 'generated';
  animation?: 'zoom-in' | 'zoom-out' | 'none';
  duration?: number; // Duration of this clip for animation calculations
  playbackRate?: number;
  speed?: number;
}

export const AnimatedMediaClip: React.FC<AnimatedMediaClipProps> = ({
  src,
  clip_url,
  style = {},
  startFrom = 0,
  trim_in,
  trim_out,
  mediaType,
  media_type,
  animation = 'none',
  duration = 3,
  playbackRate,
  speed,
}) => {
  const frame = useCurrentFrame();
  const settings = React.useContext(MediaSettings);
  const {Video} = React.useContext(CompositionMedia);
  const { fps } = useVideoConfig();

  const resolvedSrc = src || clip_url || '';
  const resolvedMediaType = mediaType || media_type;
  const resolvedStartFrom = trim_in ?? startFrom;
  const resolvedEndAt = trim_out ?? settings.endAt;
  const resolvedPlaybackRate = speed ?? playbackRate ?? 1;

  const detectedMediaType = useMemo(() => {
    if (resolvedMediaType === 'image' || resolvedMediaType === 'generated') return 'image';
    if (resolvedMediaType === 'video') return 'video';

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];

    const urlLower = resolvedSrc.toLowerCase();

    if (imageExtensions.some(ext => urlLower.includes(ext))) {
      return 'image';
    }
    if (videoExtensions.some(ext => urlLower.includes(ext))) {
      return 'video';
    }
    if (urlLower.includes('picsum.photos') ||
        urlLower.includes('unsplash.com') ||
        urlLower.includes('images.unsplash.com') ||
        urlLower.includes('via.placeholder.com') ||
        urlLower.includes('placeholder.com')) {
      return 'image';
    }
    return 'video';
  }, [resolvedSrc, resolvedMediaType]);

  const mediaSrc = compositionMediaUrl(resolvedSrc);

  // Calculate animation scale based on current frame
  const animationScale = useMemo(() => {
    if (animation === 'none') return 1;

    const totalFrames = duration * fps;
    const progress = Math.min(frame / totalFrames, 1); // Progress from 0 to 1

    // Use easing function for smoother animation
    const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easedProgress = easeInOutCubic(progress);

    if (animation === 'zoom-in') {
      // Start at 1.0, end at 1.3 (30% zoom in) with easing
      return 1 + (0.3 * easedProgress);
    } else if (animation === 'zoom-out') {
      // Start at 1.3, end at 1.0 (zoom out from 30% to normal) with easing
      return 1.3 - (0.3 * easedProgress);
    }

    return 1;
  }, [frame, fps, duration, animation]);

  // Calculate transform for animation
  const transformStyle = useMemo(() => {
    if (animation === 'none') return '';

    const scale = animationScale;
    return `scale(${scale})`;
  }, [animationScale, animation]);

  const baseStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    willChange: 'transform',
    transform: transformStyle,
    backfaceVisibility: 'hidden',
    // Fix rendering artifacts
    imageRendering: 'auto', // Smooth scaling instead of crisp-edges
    WebkitBackfaceVisibility: 'hidden',
    WebkitTransform: transformStyle,
    // Prevent edge artifacts
    overflow: 'hidden',
    // Better anti-aliasing
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    // Ensure smooth scaling
    transformOrigin: 'center center',
    ...style,
  };

  if (detectedMediaType === 'image') {
    return (
      <AbsoluteFill
        style={{
          overflow: 'hidden',
          transformOrigin: 'center center',
        }}
      >
        <Img
          src={mediaSrc}
          style={{
            ...baseStyle,
            imageRendering: 'auto', // Use smooth scaling for images too
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        transformOrigin: 'center center',
      }}
    >
      <Loop durationInFrames={Math.max(1,Math.ceil(((resolvedEndAt ?? resolvedStartFrom+duration*fps)-resolvedStartFrom)/resolvedPlaybackRate))}>
      <Video
        src={mediaSrc}
        trimBefore={resolvedStartFrom}
        trimAfter={resolvedEndAt}
        playbackRate={resolvedPlaybackRate}
        muted={settings.volume===0}
        volume={settings.volume}
        style={{
          ...baseStyle,
          imageRendering: 'auto',
        }}
      />
      </Loop>
    </AbsoluteFill>
  );
};
