import React from "react";
import {
  IoTrash,
  IoAdd,
  IoChevronBack,
  IoChevronForward,
  IoChevronUp,
  IoChevronDown,
  IoClose,
  IoEllipsisHorizontal,
} from "react-icons/io5";
import { MdEdit } from "react-icons/md";
import type { IconType } from "react-icons";

type IconProps = {
  size?: number;
  color?: string;
  className?: string;
};

// Default size for icons
const ICON_DEFAULT_SIZE = 24;

// Centralized icon map
const ICONS: Record<string, IconType> = {
  Delete: IoTrash,
  Add: IoAdd,
  Back: IoChevronBack,
  Next: IoChevronForward,
  Up: IoChevronUp, // 👈 Added
  Down: IoChevronDown, // 👈 Added
  Edit: MdEdit,
  Close: IoClose,
  More: IoEllipsisHorizontal,
};

const IconComponent: React.FC<{ icon: IconType } & IconProps> = ({
  icon: Icon,
  size = ICON_DEFAULT_SIZE,
  color = "currentColor",
  className,
}) => {
  return <Icon size={size} color={color} className={className} />;
};

// Namespace exports for convenience
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
