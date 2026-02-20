// app/components/Icon.tsx
import React from "react";
import type { IconType } from "react-icons";

import {
  IoTrashOutline,
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
  IoPlayOutline,
  IoPersonOutline,
  IoPeopleOutline,
  IoStopOutline,
} from "react-icons/io5";
import { IoMdPaperPlane } from "react-icons/io";
import { RiExternalLinkLine } from "react-icons/ri";
import { MdLocationPin } from "react-icons/md";
import { WiFog } from "react-icons/wi";
import { CiStickyNote } from "react-icons/ci";
import { PiPencilLineLight } from "react-icons/pi";
import { BsEnvelopePaperHeart, BsSuitHeartFill } from "react-icons/bs";
import { FaCheck, FaMoon } from "react-icons/fa6";
import { VscChecklist } from "react-icons/vsc";

type IconProps = {
  size?: number;
  color?: string;
  className?: string;
};

const ICON_DEFAULT_SIZE = 24;

/* ======================================================
   Fallback — renders a visible ⓘ and logs the missing key
   ====================================================== */
const FallbackIcon: React.FC<IconProps & { iconName: string }> = ({
  size = ICON_DEFAULT_SIZE,
  iconName,
}) => {
  if (import.meta.env.DEV) {
    console.error(
      `[Icon] "${iconName}" is not in the ICONS map. ` +
        `Add it to Icon.tsx or check for a typo.`,
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={`Missing icon: ${iconName}`}
      style={{ color: "var(--color-error, #ef4444)" }}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
};

/* ======================================================
   Icon wrapper component
   ====================================================== */
const IconComponent: React.FC<{ icon: IconType } & IconProps> = ({
  icon: Icon,
  size = ICON_DEFAULT_SIZE,
  className,
}) => <Icon size={size} className={className} />;

/* ======================================================
   Icon map with optional nested variants
   ====================================================== */
const ICONS = {
  Add: IoAdd,
  Delete: IoTrashOutline,
  Back: IoChevronBack,
  Next: IoChevronForward,
  Up: IoChevronUp,
  Down: IoChevronDown,
  Edit: PiPencilLineLight,
  Close: IoClose,
  More: IoEllipsisHorizontal,
  Heart: {
    default: IoHeartOutline,
    full: BsSuitHeartFill,
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
  Moon: FaMoon,
  Cloud: IoCloudy,
  Rain: IoRainy,
  Storm: IoThunderstorm,
  Snow: IoSnow,
  Fog: WiFog,
  Play: IoPlayOutline,
  Stop: IoStopOutline,
  Tick: FaCheck,
  Check: FaCheck,
  Checklist: VscChecklist,
  Contact: IoPersonOutline,
  People: IoPeopleOutline,
  LoveLetter: BsEnvelopePaperHeart,
  Send: IoMdPaperPlane,
};

/* ======================================================
   Recursive builder to support nested icons
   ====================================================== */
function buildIconComponents(map: any): any {
  const result: Record<string, any> = {};

  for (const key in map) {
    const value = map[key];
    if (typeof value === "function") {
      result[key] = (props: IconProps) => (
        <IconComponent icon={value} {...props} />
      );
    } else if (typeof value === "object") {
      const { default: defaultIcon, ...variants } = value;

      const nested: Record<string, any> = {
        ...Object.fromEntries(
          Object.entries(variants).map(([variantKey, IconFunc]) => [
            variantKey,
            (props: IconProps) => (
              <IconComponent icon={IconFunc as IconType} {...props} />
            ),
          ]),
        ),
        default: (props: IconProps) => (
          <IconComponent icon={defaultIcon} {...props} />
        ),
      };

      result[key] = new Proxy(nested, {
        get(target, prop) {
          if (prop === "then") return undefined;
          return prop in target ? target[prop as string] : target.default;
        },
        apply(_target, _thisArg, args) {
          return nested.default(...args);
        },
      });
    }
  }

  // ← Top-level Proxy: unknown keys return FallbackIcon instead of undefined
  return new Proxy(result, {
    get(target, prop: string) {
      if (prop === "then" || prop === "$$typeof" || prop === "__esModule") {
        return undefined;
      }
      if (prop in target) return target[prop];
      return (props: IconProps) => <FallbackIcon iconName={prop} {...props} />;
    },
  });
}

/* ======================================================
   Export Icon namespace
   ====================================================== */
export const Icon = buildIconComponents(ICONS);

export default IconComponent;
