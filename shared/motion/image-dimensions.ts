export function imageDimensions(bytes: Uint8Array, sourceBytes: number) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (pngSignature.every((byte, i) => bytes[i] === byte)) {
        if (bytes.length < 33 || view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452) {
            throw new Error("The PNG header is invalid.");
        }
        // acTL precedes the first IDAT in animated PNGs.
        for (let offset = 33; offset + 8 <= bytes.length;) {
            const length = view.getUint32(offset);
            const type = view.getUint32(offset + 4);
            if (offset + length + 12 > sourceBytes) break;
            if (type === 0x6163544c) throw new Error("Use a still PNG instead of an animated PNG.");
            if (type === 0x49444154) {
                return { width: view.getUint32(16), height: view.getUint32(20) };
            }
            offset += length + 12;
        }
    } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
        for (let offset = 2; offset + 4 <= bytes.length;) {
            if (bytes[offset++] !== 0xff) break;
            while (bytes[offset] === 0xff) offset++;
            const marker = bytes[offset++];
            if (offset + 2 > bytes.length || marker === 0xda || marker === 0xd9) break;
            const length = view.getUint16(offset);
            if (length < 2 || offset + length > bytes.length) break;
            if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker) && length >= 8) {
                return { width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) };
            }
            offset += length;
        }
    }
    throw new Error("Use a JPEG or still PNG with readable image metadata.");
}
