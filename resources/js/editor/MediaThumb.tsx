import React, { useEffect, useState } from "react";
import Icon from "./Icon";
export default function MediaThumb({
    url,
    type = "video",
    label = "",
}: {
    url?: string;
    type?: string;
    label?: string;
}) {
    const [failed, setFailed] = useState(false),
        [ready, setReady] = useState(false);
    useEffect(() => {
        setFailed(false);
        setReady(false);
    }, [url, type]);
    return (
        <span className="media-thumb" aria-hidden="true">
            {url &&
                !failed &&
                (type === "image" ? (
                    <img
                        key={url}
                        src={url}
                        alt=""
                        loading="lazy"
                        style={{ opacity: ready ? 1 : 0 }}
                        onLoad={() => setReady(true)}
                        onError={() => setFailed(true)}
                    />
                ) : (
                    <video
                        key={url}
                        src={url + (url.includes("#") ? "" : "#t=0.1")}
                        muted
                        playsInline
                        preload="metadata"
                        style={{ opacity: ready ? 1 : 0 }}
                        onLoadedMetadata={(e) => {
                            const video = e.currentTarget;
                            if (video.duration > 0.1) video.currentTime = 0.1;
                        }}
                        onLoadedData={() => setReady(true)}
                        onSeeked={() => setReady(true)}
                        onError={() => setFailed(true)}
                    />
                ))}
            {(!url || failed || !ready) && (
                <span className="thumb-fallback">
                    <Icon name="film" size={25} />
                    {label && <small>{label}</small>}
                </span>
            )}
        </span>
    );
}
