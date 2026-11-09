import "../server/env";
import { publicMotionInventory } from "../server/motion/providers/inventory";

console.log(JSON.stringify(publicMotionInventory(), null, 2));
