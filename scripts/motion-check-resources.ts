process.env.NODE_DATABASE_PATH = ":memory:";
process.env.NODE_SKIP_LEGACY_IMPORT = "1";
const { validateMotionResources } = await import("../server/motion/resource-check");
console.log(JSON.stringify(validateMotionResources()));
