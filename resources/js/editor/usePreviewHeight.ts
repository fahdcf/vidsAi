import { useEffect, useState } from "react";
export default function usePreviewHeight() {
    const [height, setHeight] = useState(() =>
        window.innerWidth <= 700 ? 240 : 340,
    );
    useEffect(() => {
        const resize = () => setHeight(window.innerWidth <= 700 ? 240 : 340);
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);
    return height;
}
