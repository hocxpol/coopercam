import { Request, Response } from "express";
import { getWbot } from "../libs/wbot";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);
  await StartWhatsAppSession(whatsapp, companyId);

  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const { whatsapp } = await UpdateWhatsAppService({
    whatsappId,
    companyId,
    whatsappData: { session: "" }
  });

  await StartWhatsAppSession(whatsapp, companyId);

  return res.status(200).json({ message: "Starting session." });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  if (whatsapp.session) {
    await UpdateWhatsAppService({
      whatsappId,
      companyId,
      whatsappData: { status: "DISCONNECTED", session: "" }
    });
    const wbot = getWbot(whatsapp.id);
    await wbot.logout();
  }

  return res.status(200).json({ message: "Session disconnected." });
};

const forceReset = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  // Remove a sessão atual do WhatsApp
  if (whatsapp.session) {
    await UpdateWhatsAppService({
      whatsappId,
      companyId,
      whatsappData: { status: "DISCONNECTED", session: "" }
    });
    const wbot = getWbot(whatsapp.id);
    await wbot.logout();
  }

  // Inicia uma nova sessão
  await StartWhatsAppSession(whatsapp, companyId);

  return res.status(200).json({ message: "Session force reset completed." });
};

export default { store, remove, update, forceReset };
