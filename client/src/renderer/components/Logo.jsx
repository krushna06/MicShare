import React from 'react';

const logoUrl = `${import.meta.env.BASE_URL}micshare.png`;

export default function Logo({ className = 'w-10 h-10' }) {
  return (
    <img
      src={logoUrl}
      alt="Mic Share logo"
      draggable={false}
      className={`${className} rounded-xl object-cover select-none`}
      style={{ WebkitUserDrag: 'none' }}
    />
  );
}
