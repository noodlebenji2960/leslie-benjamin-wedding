// app/components/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonState = "idle" | "loading" | "success" | "error";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: ButtonState;
  /** Marks the button as the currently-selected option in a group (e.g. the active page in pagination). */
  selected?: boolean;
  /** Children shown while state is "loading" — defaults to children. */
  loadingChildren?: ReactNode;
  /** Children shown while state is "success" — defaults to children. */
  successChildren?: ReactNode;
  /** Children shown while state is "error" — defaults to children. */
  errorChildren?: ReactNode;
  children: ReactNode;
}

type ButtonAsButton = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & {
    to?: undefined;
  };

type ButtonAsLink = ButtonOwnProps &
  Omit<LinkProps, keyof ButtonOwnProps> & {
    to: LinkProps["to"];
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({
  variant = "primary",
  size = "md",
  state = "idle",
  selected = false,
  loadingChildren,
  successChildren,
  errorChildren,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const stateChildren =
    state === "loading"
      ? (loadingChildren ?? children)
      : state === "success"
        ? (successChildren ?? children)
        : state === "error"
          ? (errorChildren ?? children)
          : children;

  const classes = [
    "btn",
    `btn--${variant}`,
    size !== "md" && `btn--${size}`,
    state !== "idle" && `btn--${state}`,
    selected && "btn--selected",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if ("to" in rest && rest.to !== undefined) {
    const { to, ...linkRest } = rest as Omit<ButtonAsLink, keyof ButtonOwnProps | "className">;
    return (
      <Link to={to} className={classes} {...linkRest}>
        {state === "loading" && <span className="btn__spinner" aria-hidden="true" />}
        <span className="btn__label">{stateChildren}</span>
      </Link>
    );
  }

  const { disabled, ...buttonRest } = rest as Omit<
    ButtonAsButton,
    keyof ButtonOwnProps | "className"
  >;

  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || state === "loading"}
      {...buttonRest}
    >
      {state === "loading" && <span className="btn__spinner" aria-hidden="true" />}
      <span className="btn__label">{stateChildren}</span>
    </button>
  );
}
