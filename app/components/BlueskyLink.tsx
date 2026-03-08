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
    ? "inline-flex items-center justify-center items-center text-blue-600 dark:text-blue-400 hover:underline"
    : "inline-flex items-center justify-center items-center";

  const finalClassName = className || defaultClassName;

  if (!asLink) {
    return (
      <span className={finalClassName}>
        {children}
        <span className="px-1">
          <BlueskyIcon />
        </span>
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
      <span className="px-1">
        <BlueskyIcon />
      </span>
    </a>
  );
}
