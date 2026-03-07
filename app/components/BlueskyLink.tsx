import BlueskyIcon from "./BlueskyIcon";

interface BlueskyLinkProps {
  href?: string;
  children?: React.ReactNode;
  className?: string;
  asLink?: boolean;
}

export default function BlueskyLink({
  href = "https://bsky.app",
  children = "Bluesky",
  className,
  asLink = true,
}: BlueskyLinkProps) {
  const defaultClassName = asLink
    ? "inline-flex items-center gap-1 justify-center items-center text-blue-600 dark:text-blue-400 hover:underline"
    : "inline-flex items-center gap-1 justify-center items-center";

  const finalClassName = className || defaultClassName;

  if (!asLink) {
    return (
      <span className={finalClassName}>
        {children}
        <a href="https://bsky.app/" className="pr-1 horver:text-blue-600 dark:hover:text-blue-400" target="_blank" rel="noopener noreferrer">
          <BlueskyIcon />
        </a>
      </span>
    );
  }

  return (
    <a
      href={href}
      className={finalClassName}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <span className="pl-1">
        <BlueskyIcon />
      </span>
    </a>
  );
}
