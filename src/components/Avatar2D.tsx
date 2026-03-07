// src/components/Avatar2D.tsx — PNG layer compositor
import type { CSSProperties } from 'react';

export interface AvatarConfig {
    gender: 'man';
    pants: 'calca-bege' | 'calca-preta';
    shirt: 'camisa-branca' | 'camisa-preta';
    footwear: 'chinelo' | 'tenis' | 'none';
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
    gender: 'man',
    pants: 'calca-bege',
    shirt: 'camisa-branca',
    footwear: 'chinelo',
};

interface Avatar2DProps {
    config?: Partial<AvatarConfig>;
    /** 'bust' shows ~top 55% of the avatar (chest up), 'full' shows entire body */
    mode?: 'bust' | 'full';
    /** If true, renders everything as a black silhouette */
    silhouette?: boolean;
    /** Width in px. Height auto-calculated from aspect ratio. */
    width?: number;
    className?: string;
}

// Natural PNG dimensions (boy.png is portrait, layers share same canvas)
const NATURAL_ASPECT = 0.5; // width / height ≈ 0.5 (portrait character)

/**
 * Returns the src path for each layer based on config.
 * Layer order (bottom → top): base → pants → shirt → footwear
 */
function getLayers(cfg: AvatarConfig): string[] {
    const base = `/avatars/man/boy.png`;
    const layers = [base];

    // Pants layer
    if (cfg.pants) layers.push(`/avatars/man/${cfg.pants}.png`);

    // Shirt layer
    if (cfg.shirt) layers.push(`/avatars/man/${cfg.shirt}.png`);

    // Footwear (mutually exclusive: chinelo OR tenis)
    if (cfg.footwear && cfg.footwear !== 'none') {
        layers.push(`/avatars/man/${cfg.footwear}.png`);
    }

    return layers;
}

export function Avatar2D({
    config = {},
    mode = 'full',
    silhouette = false,
    width = 160,
    className = '',
}: Avatar2DProps) {
    const cfg: AvatarConfig = { ...DEFAULT_AVATAR_CONFIG, ...config };
    const layers = getLayers(cfg);

    const height = width / NATURAL_ASPECT;

    // For bust mode: show top ~52% of the character (head + shoulders + chest)
    const containerHeight = mode === 'bust' ? height * 0.52 : height;

    const imgStyle: CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        objectPosition: 'top center',
        filter: silhouette ? 'brightness(0)' : undefined,
        userSelect: 'none',
        pointerEvents: 'none',
    };

    return (
        <div
            className={className}
            style={{
                position: 'relative',
                width,
                height: containerHeight,
                overflow: 'hidden',
                flexShrink: 0,
            }}
        >
            {/* Fixed-size inner container so bust crop works correctly */}
            <div style={{ position: 'absolute', top: 0, left: 0, width, height }}>
                {layers.map((src, i) => (
                    <img
                        key={src}
                        src={src}
                        alt=""
                        style={{ ...imgStyle, zIndex: i }}
                        draggable={false}
                    />
                ))}
            </div>
        </div>
    );
}

export default Avatar2D;
