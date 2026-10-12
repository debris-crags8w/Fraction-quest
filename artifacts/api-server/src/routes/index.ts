import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import progressRouter from "./progress";
import familyRouter from "./family";
import privacyRouter from "./privacy";
import voiceRouter from "./voice";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(progressRouter);
router.use(familyRouter);
router.use(privacyRouter);
router.use(voiceRouter);

export default router;
