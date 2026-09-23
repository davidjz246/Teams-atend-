import React, { useState } from 'react';
import officialLogoImg from '../assets/images/wadi_degla_official_logo_1787130969864.jpg';

interface WadiDeglaLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'image' | 'vector';
}

/**
 * Official Wadi Degla Shield Crest Emblem
 * High-definition, authentic representation matching the official Wadi Degla Clubs logo.
 */
export const WadiDeglaLogo: React.FC<WadiDeglaLogoProps> = ({
  className = 'w-10 h-12',
  variant = 'image',
}) => {
  const [imageError, setImageError] = useState(false);

  if (variant === 'image' && !imageError) {
    return (
      <div className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-black ${className}`}>
        <img
          src={officialLogoImg}
          alt="Wadi Degla Official Logo"
          className="w-full h-full object-contain filter drop-shadow-sm select-none"
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Precision Vector SVG matching official proportions
  return (
    <svg
      viewBox="0 0 320 420"
      className={`${className} drop-shadow-md select-none`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id="shieldInnerClip">
          <path d="M 20 40 C 95 24 225 24 300 40 C 308 130 295 260 160 400 C 25 260 12 130 20 40 Z" />
        </clipPath>
      </defs>

      {/* Outer Shield Boundary (Black) */}
      <path
        d="M 6 30 C 90 10 230 10 314 30 C 322 130 308 275 160 415 C 12 275 -2 130 6 30 Z"
        fill="#000000"
      />

      {/* Gold Outer Border */}
      <path
        d="M 12 36 C 92 18 228 18 308 36 C 315 132 302 268 160 408 C 18 268 5 132 12 36 Z"
        fill="#FFC700"
      />

      {/* Inner Shield (Black) */}
      <path
        d="M 19 42 C 94 26 226 26 301 42 C 307 134 295 262 160 402 C 25 262 13 134 19 42 Z"
        fill="#0a0a0a"
      />

      {/* Clipped Inner Content */}
      <g clipPath="url(#shieldInnerClip)">
        {/* 2x2 Checkered Quadrant */}
        {/* Top-Right: Yellow */}
        <rect x="160" y="220" width="160" height="95" fill="#FFC700" />
        {/* Top-Left: Black */}
        <rect x="0" y="220" width="160" height="95" fill="#0a0a0a" />
        {/* Bottom-Left: Yellow */}
        <rect x="0" y="315" width="160" height="110" fill="#FFC700" />
        {/* Bottom-Right: Black */}
        <rect x="160" y="315" width="160" height="110" fill="#0a0a0a" />

        {/* Quadrant Divider Grid */}
        <line x1="160" y1="220" x2="160" y2="410" stroke="#0a0a0a" strokeWidth="3" />
        <line x1="10" y1="315" x2="310" y2="315" stroke="#0a0a0a" strokeWidth="3" />

        {/* Realistic Official Gazelle Silhouette */}
        <g fill="#FFC700">
          {/* Horns */}
          <path d="M 198 48 C 188 62 174 82 170 98 C 174 96 186 78 198 64 C 204 56 208 50 198 48 Z" />
          <path d="M 206 54 C 196 68 182 86 178 100 C 182 98 194 82 206 70 C 212 62 216 56 206 54 Z" />

          {/* Ears */}
          <path d="M 174 95 C 166 90 156 88 154 94 C 158 98 166 100 172 100 Z" />

          {/* Head & Muzzle */}
          <path d="M 176 96 C 186 94 204 100 210 108 C 208 114 196 118 184 114 C 178 118 174 128 172 136 L 164 134 C 166 122 170 106 176 96 Z" />

          {/* Neck & Chest */}
          <path d="M 172 125 C 174 138 180 154 188 164 C 176 164 164 154 158 136 Z" />

          {/* Body */}
          <path d="M 190 158 C 180 155 140 155 106 160 C 96 162 92 168 94 174 C 98 182 112 186 142 186 C 170 186 190 180 190 166 Z" />

          {/* Tail */}
          <path d="M 95 164 C 88 170 85 178 88 184 C 92 180 94 174 98 170 Z" />

          {/* Legs */}
          {/* Foreleg 1 */}
          <path d="M 180 174 L 183 205 L 180 220 L 176 220 L 174 205 L 172 178 Z" />
          {/* Foreleg 2 */}
          <path d="M 168 178 L 170 203 L 168 220 L 164 220 L 162 203 L 162 180 Z" />

          {/* Hind leg 1 */}
          <path d="M 118 172 C 116 182 108 194 110 204 L 112 220 L 108 220 L 104 204 C 102 192 110 178 116 172 Z" />
          {/* Hind leg 2 */}
          <path d="M 132 176 C 130 186 124 198 126 208 L 128 220 L 124 220 L 120 208 C 118 196 124 182 130 176 Z" />
        </g>

        {/* 'WADI DEGLA' Bold Typography */}
        <text
          x="160"
          y="208"
          textAnchor="middle"
          fill="#FFC700"
          fontFamily="'Arial Black', -apple-system, sans-serif"
          fontWeight="900"
          fontSize="24"
          letterSpacing="1.8"
        >
          WADI DEGLA
        </text>
      </g>
    </svg>
  );
};

export default WadiDeglaLogo;
