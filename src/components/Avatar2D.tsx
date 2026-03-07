// src/components/Avatar2D.tsx — PNG layer compositor
import type { CSSProperties } from 'react';

export interface AvatarConfig {
    gender: 'man';
    pants: 'calca-bege' | 'calca-preta' | 'none';
    shirt: 'camisa-branca' | 'camisa-preta' | 'none';
    footwear: 'chinelo' | 'tenis' | 'none';
    headwear?: 'bone-azul' | 'none';
    unlocked_items?: string[];
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
    gender: 'man',
    pants: 'calca-bege',
    shirt: 'camisa-branca',
    footwear: 'chinelo',
    headwear: 'none',
};

const VALID_PANTS = ['calca-bege', 'calca-preta', 'none'];
const VALID_SHIRTS = ['camisa-branca', 'camisa-preta', 'none'];
const VALID_FOOTWEAR = ['chinelo', 'tenis', 'none'];
const VALID_HEADWEAR = ['bone-azul', 'none'];

interface Avatar2DProps {
    config?: Partial<AvatarConfig>;
    /** 'bust' shows ~top 45% of the avatar (chest up), 'full' shows entire body */
    mode?: 'bust' | 'full';
    /** If true, renders everything as a black silhouette */
    silhouette?: boolean;
    /** Optional fixed width. If omitted, use className for responsive sizing (e.g. w-full, h-full w-auto) */
    width?: number | string;
    className?: string;
    style?: CSSProperties;
}

// Natural PNG dimensions (boy.png is portrait, layers share same canvas)

/**
 * Returns the src path for each layer based on config.
 * Layer order (bottom → top): base → pants → shirt → footwear
 */
function getLayers(cfg: AvatarConfig): string[] {
    const base = `/avatars/man/boy.png`;
    const layers = [base];

    // Avatar (Base Layer) is already pushed

    // "chinelo" footwear goes UNDER pants
    const safeFootwear = VALID_FOOTWEAR.includes(cfg.footwear as string) ? cfg.footwear : DEFAULT_AVATAR_CONFIG.footwear;
    if (safeFootwear === 'chinelo') {
        layers.push(`/avatars/man/chinelo.png`);
    }

    // Pants layer
    const safePants = VALID_PANTS.includes(cfg.pants) ? cfg.pants : DEFAULT_AVATAR_CONFIG.pants;
    if (safePants && safePants !== 'none') layers.push(`/avatars/man/${safePants}.png`);

    // Shirt layer
    const safeShirt = VALID_SHIRTS.includes(cfg.shirt) ? cfg.shirt : DEFAULT_AVATAR_CONFIG.shirt;
    if (safeShirt && safeShirt !== 'none') layers.push(`/avatars/man/${safeShirt}.png`);

    // "tenis" footwear goes OVER pants and shirts
    if (safeFootwear === 'tenis') {
        layers.push(`/avatars/man/tenis.png`);
    }

    // Headwear
    const safeHeadwear = VALID_HEADWEAR.includes(cfg.headwear as string) ? cfg.headwear : DEFAULT_AVATAR_CONFIG.headwear;
    if (safeHeadwear && safeHeadwear !== 'none') {
        layers.push(`/avatars/man/${safeHeadwear}.png`);
    }

    return layers;
}

export function Avatar2D({
    config = {},
    mode = 'full',
    silhouette = false,
    width,
    className = '',
    style = {},
}: Avatar2DProps) {
    const cfg: AvatarConfig = { ...DEFAULT_AVATAR_CONFIG, ...config };
    const layers = getLayers(cfg);

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
                aspectRatio: mode === 'bust' ? '1 / 0.9' : '1 / 2',
                overflow: 'hidden',
                flexShrink: 0,
                ...(width !== undefined ? { width } : {}),
                ...style
            }}
        >
            {/* Inner responsive scaling layer that preserves the natural portrait proportion */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                aspectRatio: '1 / 2',
            }}>
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
