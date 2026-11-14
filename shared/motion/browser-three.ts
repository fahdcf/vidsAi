import { AmbientLight, BoxGeometry, BufferGeometry, DirectionalLight, Float32BufferAttribute, Mesh, MeshStandardMaterial,
    PerspectiveCamera, Scene, SphereGeometry, SRGBColorSpace, Texture, WebGLRenderer } from "three";
import { motionThreeCapability, motionThreeScene, type MotionThreeScene } from "./three-scene";
import type { MotionDrawingContext } from "./registry";

export function prepareMotionThree(raw: MotionThreeScene, images: Readonly<Record<string, ImageBitmap>>) {
    const spec = motionThreeScene.parse(raw);
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl || gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) < motionThreeCapability.maxTargetEdge ||
        gl.getParameter(gl.MAX_TEXTURE_SIZE) < motionThreeCapability.maxTextureEdge) {
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
        throw new Error("This browser cannot prepare the bounded WebGL2 motion renderer.");
    }
    const geometries: BufferGeometry[] = [], materials: MeshStandardMaterial[] = [];
    const textures = new Map<string, Texture>();
    let renderer: WebGLRenderer | undefined;
    let closed = false;
    const release = () => {
        if (closed) return;
        closed = true;
        for (const geometry of geometries) geometry.dispose();
        for (const material of materials) material.dispose();
        for (const texture of textures.values()) texture.dispose();
        renderer?.dispose();
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        canvas.width = canvas.height = 1;
    };
    try {
        const output = renderer = new WebGLRenderer({ canvas, context: gl, alpha: true, antialias: false });
        output.setClearColor(0, 0);
        const scene = new Scene();
        const camera = new PerspectiveCamera(spec.camera.fov, 1, 0.05, 64);
        camera.position.set(...spec.camera.position);
        camera.lookAt(...spec.camera.target);
        scene.add(new AmbientLight(spec.ambient.color, spec.ambient.intensity));
        const key = new DirectionalLight(spec.keyLight.color, spec.keyLight.intensity);
        key.position.set(...spec.keyLight.position);
        scene.add(key);
        const objects = spec.objects.map((item) => {
            const { shape, material: paint } = item;
            const geometry = shape.kind === "box" ? new BoxGeometry(1, 1, 1)
                : shape.kind === "sphere" ? new SphereGeometry(0.5, shape.segments, shape.segments)
                    : new BufferGeometry().setAttribute("position", new Float32BufferAttribute(shape.positions, 3)).setIndex(shape.indices);
            geometries.push(geometry);
            if (shape.kind === "mesh") {
                if (shape.uv) geometry.setAttribute("uv", new Float32BufferAttribute(shape.uv, 2));
                geometry.computeVertexNormals();
            }
            let texture = paint.textureId ? textures.get(paint.textureId) : undefined;
            if (paint.textureId && !texture) {
                const image = images[paint.textureId];
                if (!image || Math.max(image.width, image.height) > motionThreeCapability.maxTextureEdge) {
                    throw new Error("A 3D texture needs an owned image of 512 pixels per edge or less.");
                }
                texture = new Texture(image);
                texture.colorSpace = SRGBColorSpace;
                texture.needsUpdate = true;
                textures.set(paint.textureId, texture);
            }
            const material = new MeshStandardMaterial({ color: paint.color, roughness: paint.roughness, metalness: paint.metalness, map: texture ?? null });
            materials.push(material);
            const mesh = new Mesh(geometry, material);
            mesh.position.set(...item.position);
            mesh.scale.set(...item.scale);
            scene.add(mesh);
            return { mesh, item };
        });
        function draw(ctx: MotionDrawingContext, width: number, height: number, progress: number) {
            if (closed || output.getContext().isContextLost()) throw new Error("The 3D motion graphics context was lost.");
            const scale = Math.min(1, motionThreeCapability.maxTargetEdge / Math.max(width, height));
            const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
            if (canvas.width !== w || canvas.height !== h) output.setSize(w, h, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            for (const { mesh, item } of objects) {
                const angle = (axis: 0 | 1 | 2) => item.rotation[axis] * Math.PI / 180 + item.spin[axis] * progress * Math.PI * 2;
                mesh.rotation.set(angle(0), angle(1), angle(2));
            }
            output.render(scene, camera);
            ctx.drawImage(canvas, 0, 0, width, height);
        }
        return { draw, release };
    } catch (error) { release(); throw error; }
}
export type BrowserMotionThree = ReturnType<typeof prepareMotionThree>;
