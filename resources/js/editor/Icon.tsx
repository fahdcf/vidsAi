import React from "react";
const paths: Record<string, string> = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    film: "M4 3h16v18H4z M4 8h16 M4 16h16 M8 3v18 M16 3v18",
    plus: "M12 5v14 M5 12h14",
    sparkles: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
    arrowLeft: "m14 6-6 6 6 6 M8 12h13",
    arrowRight: "m10 6 6 6-6 6 M3 12h13",
    check: "m5 12 4 4L19 6",
    close: "m6 6 12 12 M6 18 18 6",
    play: "m9 5 11 7-11 7V5Z",
    pause: "M8 5v14 M16 5v14",
    upload: "M12 16V3 m-5 5 5-5 5 5 M4 15v6h16v-6",
    download: "M12 3v13 m-5-5 5 5 5-5 M4 18v3h16v-3",
    scissors:
        "m8 8 12 12 M8 16 20 4 M4 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M4 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    caption: "M3 5h18v14H3z M10 10H7v4h3 M18 10h-3v4h3",
    music: "M9 18V5l11-2v13 M9 8l11-2 M6 16a3 2 0 1 0 0 4 3 2 0 0 0 0-4 M17 14a3 2 0 1 0 0 4 3 2 0 0 0 0-4",
    clock: "M12 8v5l3 2 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
    search: "m16 16 5 5 M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14",
    settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
    undo: "M8 4 3 9l5 5 M3 9h11a6 6 0 0 1 0 12",
    redo: "m16 4 5 5-5 5 M21 9H10a6 6 0 0 0 0 12",
    photo: "M3 3h18v18H3z m0 14 6-6 4 4 3-3 5 5 M15 7h.01",
    user: "M4 21v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3 M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
    refresh:
        "M20 7V2l-4 4 M4 17v5l4-4 M20 7a9 9 0 0 0-15-1 M4 17a9 9 0 0 0 15 1",
};
export default function Icon({
    name,
    size = 18,
    ...props
}: {
    name: string;
    size?: number;
    className?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d={paths[name] || paths.sparkles} />
        </svg>
    );
}
