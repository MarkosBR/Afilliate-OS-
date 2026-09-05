import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  createCampaignController,
  deleteCampaignController,
  getCampaignController,
  listCampaignsController,
  updateCampaignController,
} from "./campaigns.controller.js";

export const campaignsRouter = Router();

campaignsRouter.use(requireAuth);
campaignsRouter.get("/", listCampaignsController);
campaignsRouter.post("/", createCampaignController);
campaignsRouter.get("/:id", getCampaignController);
campaignsRouter.patch("/:id", updateCampaignController);
campaignsRouter.delete("/:id", deleteCampaignController);
