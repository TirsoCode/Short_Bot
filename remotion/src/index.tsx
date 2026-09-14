import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { ShortComposition, type ShortStyleProps } from './compositions/Short';

const DEFAULT_PROPS = {
  hookText: '',
  media: [],
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 900,
  style: {} as Partial<ShortStyleProps>,
};

const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ShortComposition"
      component={ShortComposition}
      durationInFrames={DEFAULT_PROPS.durationInFrames}
      fps={DEFAULT_PROPS.fps}
      width={DEFAULT_PROPS.width}
      height={DEFAULT_PROPS.height}
      defaultProps={DEFAULT_PROPS}
    />
  );
};

registerRoot(RemotionRoot);