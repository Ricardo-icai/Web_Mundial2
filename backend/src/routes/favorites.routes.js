import { Router } from "express";
import { deleteFavorite, listFavorites, upsertFavorite } from "../controllers/favorites.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(listFavorites));
router.post("/", requireAuth, asyncHandler(upsertFavorite));
router.delete("/:id", requireAuth, asyncHandler(deleteFavorite));

export default router;
