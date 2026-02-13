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
  IoHeart,
  IoSunny,
  IoCloudy,
  IoRainy,
  IoThunderstorm,
  IoSnow,
  IoFastFoodOutline,
  IoMusicalNotesOutline,
  IoMusicalNotes,
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
   Icon wrapper component
   ====================================================== */
const IconComponent: React.FC<{ icon: IconType } & IconProps> = ({
  icon: Icon,
  size = ICON_DEFAULT_SIZE,
  color = "currentColor",
  className,
}) => <Icon size={size} color={color} className={className} />;

/* ======================================================
   Icon map with optional nested variants
   ====================================================== */
const ICONS = {
  Add: IoAdd,
  Delete: IoTrash,
  Back: IoChevronBack,
  Next: IoChevronForward,
  Up: IoChevronUp,
  Down: IoChevronDown,
  Edit: MdEdit,
  Close: IoClose,
  More: IoEllipsisHorizontal,
  Heart: {
    default: IoHeartOutline,
    on: IoHeart,
    off: IoHeartOutline,
  },
  ExternalLink: RiExternalLinkLine,
  Food: IoFastFoodOutline,
  Note: CiStickyNote,
  Music: {
    default: IoMusicalNotesOutline,
    on: IoMusicalNotes,
    off: IoMusicalNotesOutline,
  },
  location: MdLocationPin,
  Sun: IoSunny,
  Cloud: IoCloudy,
  Rain: IoRainy,
  Storm: IoThunderstorm,
  Snow: IoSnow,
  Fog: WiFog,
};

/* ======================================================
   Recursive builder to support nested icons
   ====================================================== */
function buildIconComponents(map: any): any {
  const result: Record<string, any> = {};

  for (const key in map) {
    const value = map[key];
    if (typeof value === "function") {
      // Single icon
      result[key] = (props: IconProps) => (
        <IconComponent icon={value} {...props} />
      );
    } else if (typeof value === "object") {
      // Nested icon variants (on/off/default)
      const { default: defaultIcon, ...variants } = value;

      // Create default function that renders `defaultIcon`
      const nested: Record<string, any> = {
        ...Object.fromEntries(
          Object.entries(variants).map(([variantKey, IconFunc]) => [
            variantKey,
            (props: IconProps) => <IconComponent icon={IconFunc} {...props} />,
          ]),
        ),
        // Default render if no variant specified
        default: (props: IconProps) => (
          <IconComponent icon={defaultIcon} {...props} />
        ),
      };

      // Proxy to allow <Icon.Heart /> to render default automatically
      result[key] = new Proxy(nested, {
        get(target, prop) {
          if (prop === "then") return undefined; // Prevent issues with async/await
          return prop in target
            ? target[prop as keyof typeof target]
            : target.default;
        },
        apply(_target, _thisArg, args) {
          return nested.default(...args);
        },
      });
    }
  }

  return result;
}

/* ======================================================
   Export Icon namespace
   ====================================================== */
export const Icon = buildIconComponents(ICONS);

export default IconComponent;
