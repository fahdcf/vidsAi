export async function api<T = any>(
    url: string,
    data?: unknown,
    method = "POST",
): Promise<T> {
    const multipart = data instanceof FormData;
    const response = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: {
            ...(multipart ? {} : { "Content-Type": "application/json" }),
            Accept: "application/json",
            "X-CSRF-TOKEN":
                document.querySelector<HTMLMetaElement>(
                    'meta[name="csrf-token"]',
                )?.content || "",
        },
        ...(data === undefined
            ? {}
            : { body: multipart ? data : JSON.stringify(data) }),
    });
    const body = await response.json();
    if (!response.ok)
        throw new Error(
            response.status === 409
                ? "This project changed. Reload to get the latest version."
                : body.message ||
                  body.error ||
                  Object.values(body.errors || {})
                      .flat()
                      .join(" ") ||
                  "Request failed",
        );
    return body;
}
