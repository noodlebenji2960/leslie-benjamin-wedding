// app/components/Icon.tsx
import React from "react";
import type { IconType } from "react-icons";

import {
  IoTrash,
  IoAdd,
  IoChevronBack,
  IoChevronForward,
  IoChevronUp,
  IoChevronDown,
  IoClose,
  IoEllipsisHorizontal,
  IoHeartOutline,
  IoSunny,
  IoCloudy,
  IoRainy,
  IoThunderstorm,
  IoSnow,
  IoFastFoodOutline,
} from "react-icons/io5";
import { RiExternalLinkLine } from "react-icons/ri";
import { MdEdit, MdLocationPin } from "react-icons/md";
import { WiFog } from "react-icons/wi";
import { CiStickyNote } from "react-icons/ci";

type IconProps = {
  size?: number;
  color?: string;
  className?: string;
};

const ICON_DEFAULT_SIZE = 24;

/* ======================================================
   Centralized icon map
   ====================================================== */
const ICONS: Record<string, IconType> = {
  // UI
  Delete: IoTrash,
  Add: IoAdd,
  Back: IoChevronBack,
  Next: IoChevronForward,
  Up: IoChevronUp,
  Down: IoChevronDown,
  Edit: MdEdit,
  Close: IoClose,
  More: IoEllipsisHorizontal,
  Heart: IoHeartOutline,
  ExternalLink: RiExternalLinkLine,
  Food: IoFastFoodOutline,
  Note: CiStickyNote,
  location: MdLocationPin,

  // Weather
  Sun: IoSunny,
  Cloud: IoCloudy,
  Rain: IoRainy,
  Storm: IoThunderstorm,
  Snow: IoSnow,
  Fog: WiFog,
};

const IconComponent: React.FC<{ icon: IconType } & IconProps> = ({
  icon: Icon,
  size = ICON_DEFAULT_SIZE,
  color = "currentColor",
  className,
}) => <Icon size={size} color={color} className={className} />;

/* ======================================================
   Namespace export (Icon.X)
   ====================================================== */
export const Icon = Object.keys(ICONS).reduce(
  (acc, key) => {
    const Component = ICONS[key];
    acc[key as keyof typeof ICONS] = (props: IconProps) => (
      <IconComponent icon={Component} {...props} />
    );
    return acc;
  },
  {} as { [K in keyof typeof ICONS]: React.FC<IconProps> },
);

export default IconComponent;
