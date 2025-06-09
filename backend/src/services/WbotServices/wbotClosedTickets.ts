import { Op } from "sequelize";
import Ticket from "../../models/Ticket"
import Whatsapp from "../../models/Whatsapp"
import { getIO } from "../../libs/socket"
import formatBody from "../../helpers/Mustache";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import moment from "moment";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { verifyMessage } from "../../utils/message/handlers";
import TicketTraking from "../../models/TicketTraking";
import logger from "../../utils/logger";
import Sentry from "../../utils/sentry";


export const ClosedAllOpenTickets = async (companyId: number): Promise<void> => {
  const closeTicket = async (ticket: any, currentStatus: any, body: any) => {
    if (currentStatus === 'nps') {
      await ticket.update({
        status: "closed",
        lastMessage: body,
        unreadMessages: 0,
        amountUseBotQueues: 0
      });
    } else if (currentStatus === 'open') {
      await ticket.update({
        status: "closed",
        lastMessage: body,
        unreadMessages: 0,
        amountUseBotQueues: 0
      });
    } else {
      await ticket.update({
        status: "closed",
        unreadMessages: 0
      });
    }
  };

  const io = getIO();
  try {
    const { rows: tickets } = await Ticket.findAndCountAll({
      where: { 
        status: { [Op.in]: ["open"] }, 
        companyId,
        isGroup: false
      },
      order: [["updatedAt", "DESC"]]
    });

    for (const ticket of tickets) {
      try {
        const showTicket = await ShowTicketService(ticket.id, companyId);
        const whatsapp = await Whatsapp.findByPk(showTicket?.whatsappId);
        const ticketTraking = await TicketTraking.findOne({
          where: {
            ticketId: ticket.id,
            finishedAt: null,
          }
        });

        if (!whatsapp) continue;

        const {
          expiresInactiveMessage,
          expiresTicket
        } = whatsapp;

        if (!expiresTicket || expiresTicket === "" || expiresTicket === "0" || Number(expiresTicket) <= 0) {
          continue;
        }

        const bodyExpiresMessageInactive = formatBody(`\u200e${expiresInactiveMessage || "Atendimento encerrado por inatividade."}`, showTicket.contact);

        const dataUltimaInteracaoChamado = new Date(showTicket.updatedAt);
        const dataLimite = new Date(dataUltimaInteracaoChamado);
        dataLimite.setMinutes(dataLimite.getMinutes() + Number(expiresTicket));

        if (new Date() > dataLimite) {
          await closeTicket(showTicket, showTicket.status, bodyExpiresMessageInactive);

          if (expiresInactiveMessage && expiresInactiveMessage !== "") {
            const sentMessage = await SendWhatsAppMessage({ body: bodyExpiresMessageInactive, ticket: showTicket });
            await verifyMessage(sentMessage, showTicket, showTicket.contact);
          }

          if (ticketTraking) {
            await ticketTraking.update({
              finishedAt: moment().toDate(),
              closedAt: moment().toDate(),
              whatsappId: ticket.whatsappId,
              userId: ticket.userId,
            });
          }

          io.to("open").emit(`company-${companyId}-ticket`, {
            action: "delete",
            ticketId: showTicket.id
          });

          logger.info(`Ticket ${showTicket.id} fechado automaticamente por inatividade`);
        }
      } catch (err) {
        logger.error(`Erro ao processar ticket ${ticket.id}: ${err.message}`);
        Sentry.captureException(err);
      }
    }
  } catch (e: any) {
    logger.error(`Erro ao fechar tickets automaticamente: ${e.message}`);
    Sentry.captureException(e);
  }
};
