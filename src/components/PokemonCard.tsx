import React, { useRef, useState, useEffect } from 'react';
import { CardData } from '@/types/pokemon';
import { cn } from '@/lib/utils';
import cardBackImage from '@/assets/pokemon-card-back.png';
import gsap from 'gsap';
import { CardSkeleton } from './CardSkeleton';
import { preloadImage, createImagePlaceholder } from '@/lib/imageUtils';
import { getCardDimensions, getImageContainerClasses, getImageClasses } from '@/lib/cardUtils';

// Preload card back image as soon as this component is imported
const preloadCardBack = () => {
  const img = new Image();
  img.src = cardBackImage;
};
preloadCardBack();

// Define the three required sizes: 'grid', 'small', and 'large'
type CardSize = 'grid' | 'small' | 'large';

interface PokemonCardProps {
  card: CardData;
  className?: string;
  style?: React.CSSProperties;
  showBack?: boolean;
  size?: CardSize;
  onClick?: () => void;
}

const rarityColors: Record<string, string> = {
  common: 'from-blue-400 to-blue-600',
  uncommon: 'from-blue-500 to-blue-700',
  rare: 'from-blue-600 to-blue-800',
  'ultra-rare': 'from-blue-700 via-blue-800 to-blue-900',
};

// 1. Helper function to get the correct size classes using utility
const getSizeClasses = (size: CardSize) => {
  return getCardDimensions(size).className;
};

export const PokemonCard = ({ card, className, style, showBack = false, size = 'grid', onClick }: PokemonCardProps) => {
  const { card: tcgCard, rarity } = card;
  const elRef = useRef<HTMLDivElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);

  // UPDATED LOGIC: Interactive effect is enabled for 'grid' and 'large' sizes.
  // It is only disabled for 'small' and when the card back is showing.
  const isInteractive = size !== 'small' && !showBack;

  useEffect(() => {
    if (!isInteractive) return;
    const el = elRef.current;
    if (!el) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      const ry = px * 10;
      const rx = -py * 8;
      gsap.to(el, { rotationY: ry, rotationX: rx, scale: 1.02, duration: 0.25, ease: 'power3.out' });
    };

    const handlePointerLeave = () => {
      gsap.to(el, { rotationY: 0, rotationX: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1,0.6)' });
    };

    el.addEventListener('pointermove', handlePointerMove);
    el.addEventListener('pointerleave', handlePointerLeave);
    el.addEventListener('pointercancel', handlePointerLeave);

    return () => {
      el.removeEventListener('pointermove', handlePointerMove);
      el.removeEventListener('pointerleave', handlePointerLeave);
      el.removeEventListener('pointercancel', handlePointerLeave);
    };
  }, [isInteractive]);

  const cardSizeClasses = getSizeClasses(size);

  const imgSmall = tcgCard.images.small;
  const imgLarge = tcgCard.images.large || imgSmall;

  // UPDATED LOGIC: Only use small image for 'small' size.
  // 'grid' and 'large' now prioritize the large image for high quality.
  const imgSrc = (size === 'small') ? imgSmall || imgLarge : imgLarge;

  // Preload image with progress tracking
  useEffect(() => {
    // Only try to preload if we need to show the card front
    if (!showBack && imgSrc) {
      setShowSkeleton(true);
      setLoadingProgress(0);
      setLoaded(false);

      preloadImage(imgSrc, (progress) => {
        setLoadingProgress(progress);
      })
        .then(() => {
          setLoaded(true);
          setShowSkeleton(false);
        })
        .catch((error) => {
          console.error('Failed to load card image:', error);
          setShowSkeleton(false);
          setLoaded(true); // Show the image anyway, even if preload failed
        });
    } else {
      // Make sure we don't show skeleton for card backs
      setShowSkeleton(false);
      setLoaded(true);
    }
  }, [imgSrc, showBack]);

  // We need to prepare the content before any conditional return statements
  const renderContent = () => {
    // Show skeleton while loading
    if (showSkeleton) {
      return <CardSkeleton size={size} className={className} />;
    }

    return (
      <div
        ref={elRef}
        onClick={onClick}
        {...(onClick ? {
          role: "button",
          tabIndex: 0,
          "aria-label": "Pokémon card - click to interact"
        } : {})}
        className={cn(
          'relative rounded-2xl overflow-hidden shadow-2xl bg-card transform will-change-transform',
          'transition-transform',
          cardSizeClasses,
          className
        )}
        style={{ perspective: '1000px', ...(style || {}) }}
      >
        <div className={cn(getImageContainerClasses(), 'rounded-xl overflow-hidden relative')}>
          {/* Progress indicator */}
          {!loaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">{Math.round(loadingProgress)}%</p>
              </div>
            </div>
          )}

          {/* low-res placeholder underneath (blurred) - Now enabled for 'grid' and 'large' */}
          {imgSmall && imgLarge && imgSmall !== imgLarge && size !== 'small' && (
            <img
              src={imgSmall}
              aria-hidden="true"
              alt=""
              className={cn('absolute inset-0', getImageClasses(), 'transition-opacity duration-500', loaded ? 'opacity-0' : 'opacity-100')}
            />
          )}

          <img
            src={imgSrc}
            alt={tcgCard.name}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={cn(getImageClasses(), 'transition-all duration-500', loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105')}
          />
        </div>
      </div>
    );
  };

  // Render based on whether we're showing the card back or front
  if (showBack) {
    // This is unchanged - still an early return, but we've declared all hooks before this point
    return (
      <div className={cn('relative rounded-2xl overflow-hidden shadow-2xl', cardSizeClasses, className)} style={style}>
        <img
          src={cardBackImage}
          alt="Pokémon Card Back"
          className="w-full h-full object-contain bg-card"
          loading="eager"
          decoding="sync"
        />
      </div>
    );
  }

  // For the front of the card, use our renderContent function that contains all the card front logic
  return renderContent();
};

export default PokemonCard;
