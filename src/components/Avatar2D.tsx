// src/components/Avatar2D.tsx — PNG layer compositor
import type { CSSProperties } from 'react';

export interface AvatarConfig {
    gender: 'man' | 'woman' | string;
    pants: string;
    shirt: string;
    footwear: string;
    headwear?: string;
    coat?: string;
    unlocked_items?: string[];
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
    gender: 'man',
    pants: 'calca-bege',
    shirt: 'camisa-branca',
    footwear: 'chinelo',
    headwear: 'none',
    coat: 'none',
};

const VALID_PANTS = ['calca-bege', 'calca-preta', 'none'];
const VALID_SHIRTS = ['camisa-branca', 'camisa-preta', 'none'];
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
    const isWoman = cfg.gender === 'woman';
    const base = isWoman ? `/avatars/woman/girl.png` : `/avatars/man/boy.png`;
    const layers = [base];

    // Helper to resolve layer path
    const resolvePath = (val: string | undefined, validList: string[], def: string) => {
        if (!val || val === 'none') return null;
        if (val.startsWith('http') || val.startsWith('/')) return val; // Dynamic image
        const safe = validList.includes(val) ? val : def;
        return safe !== 'none' ? `/avatars/man/${safe}.png` : null;
    };

    const genderFolder = isWoman ? 'woman' : 'man';

    // "chinelo" footwear goes UNDER pants
    const footerPath = cfg.footwear;
    if (footerPath === 'chinelo' || footerPath?.includes('chinelo')) {
        layers.push(footerPath.startsWith('http') || footerPath.startsWith('/') ? footerPath : `/avatars/${genderFolder}/chinelo.png`);
    }

    // Pants layer
    const pants = resolvePath(cfg.pants, VALID_PANTS, DEFAULT_AVATAR_CONFIG.pants);
    if (pants) layers.push(pants);

    // Shirt layer
    const shirt = resolvePath(cfg.shirt, VALID_SHIRTS, DEFAULT_AVATAR_CONFIG.shirt);
    if (shirt) layers.push(shirt);

    // Coat layer (Casacos) goes over shirt
    if (cfg.coat && cfg.coat !== 'none') {
        layers.push((cfg.coat.startsWith('http') || cfg.coat.startsWith('/')) ? cfg.coat : `/avatars/${genderFolder}/${cfg.coat}.png`);
    }

    // "tenis" and other footwear goes OVER pants and shirts/coats
    if (footerPath && footerPath !== 'none' && footerPath !== 'chinelo' && !footerPath.includes('chinelo')) {
        layers.push((footerPath.startsWith('http') || footerPath.startsWith('/')) ? footerPath : `/avatars/${genderFolder}/${footerPath}.png`);
    }

    // Headwear
    const headwear = resolvePath(cfg.headwear, VALID_HEADWEAR, DEFAULT_AVATAR_CONFIG.headwear || 'none');
    if (headwear) layers.push(headwear);

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
