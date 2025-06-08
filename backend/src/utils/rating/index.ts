import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import TicketTraking from "../../models/TicketTraking";
import UserRating from "../../models/UserRating";
import ShowWhatsAppService from "../../services/WhatsappService/ShowWhatsAppService";
import SendWhatsAppMessage from "../../services/WbotServices/SendWhatsAppMessage";
import moment from "moment";
import formatBody from "../../helpers/Mustache";
import * as Sentry from "@sentry/node";
import Message from "../../models/Message";
import { Op } from "sequelize";

// Número máximo de tentativas de avaliação
const MAX_RATING_ATTEMPTS = 3;

/**
 * Verifica se um ticket está elegível para avaliação
 * @param ticketTraking - O objeto de tracking do ticket
 * @returns boolean indicando se o ticket pode ser avaliado
 */
export const verifyRating = (ticketTraking: TicketTraking): boolean => {
  try {
    if (
      ticketTraking &&
      ticketTraking.ratingAt !== null &&
      ticketTraking.rated === false &&
      ticketTraking.ratingAttempts < MAX_RATING_ATTEMPTS
    ) {
      return true;
    }
    return false;
  } catch (error) {
    Sentry.captureException(error);
    return false;
  }
};

/**
 * Verifica se o cliente excedeu o limite de tentativas de avaliação
 * @param ticket - O ticket sendo verificado
 * @param ticketTraking - O objeto de tracking do ticket
 */
export const checkMessagesWithoutRating = async (
  ticket: Ticket,
  ticketTraking: TicketTraking
): Promise<void> => {
  try {
    if (!ticketTraking.ratingAt) return;

    // Incrementa o contador de tentativas
    const attempts = (ticketTraking.ratingAttempts || 0) + 1;
    await ticketTraking.update({
      ratingAttempts: attempts
    });

    // Se excedeu o limite de tentativas, encerra o modo de avaliação
    if (attempts >= MAX_RATING_ATTEMPTS) {
      await endRatingMode(ticket, ticketTraking);
    } else {
      // Envia nova solicitação de avaliação
      const { ratingMessage } = await ShowWhatsAppService(
        ticket.whatsappId,
        ticket.companyId
      );

      if (ratingMessage) {
        const body = formatBody(`\u200e${ratingMessage}`, ticket.contact);
        await SendWhatsAppMessage({ body, ticket });
      }
    }
  } catch (error) {
    Sentry.captureException(error);
  }
};

/**
 * Encerra o modo de avaliação e retorna o ticket ao fluxo normal
 * @param ticket - O ticket sendo atualizado
 * @param ticketTraking - O objeto de tracking do ticket
 */
const endRatingMode = async (
  ticket: Ticket,
  ticketTraking: TicketTraking
): Promise<void> => {
  try {
    const io = getIO();

    // Atualiza o tracking
    await ticketTraking.update({
      ratingAt: null,
      rated: true,
      ratingAttempts: 0
    });

    // Atualiza o ticket para permitir atendimento normal
    await ticket.update({
      status: "pending"
    });

    // Notifica os clientes conectados
    io.to(`company-${ticket.companyId}-${ticket.status}`)
      .to(`queue-${ticket.queueId}-${ticket.status}`)
      .to(ticket.id.toString())
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id
      });
  } catch (error) {
    Sentry.captureException(error);
  }
};

/**
 * Processa a avaliação do atendimento
 * @param rate - A nota da avaliação (1-3)
 * @param ticket - O ticket sendo avaliado
 * @param ticketTraking - O objeto de tracking do ticket
 */
export const handleRating = async (
  rate: number,
  ticket: Ticket,
  ticketTraking: TicketTraking
): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    const io = getIO();

    const { complationMessage } = await ShowWhatsAppService(
      ticket.whatsappId,
      ticket.companyId
    );

    // Garante que a nota esteja entre 1 e 3
    let finalRate = rate;
    if (rate < 1) finalRate = 1;
    if (rate > 3) finalRate = 3;

    // Cria o registro de avaliação
    await UserRating.create({
      ticketId: ticketTraking.ticketId,
      companyId: ticketTraking.companyId,
      userId: ticketTraking.userId,
      rate: finalRate,
    });

    // Envia mensagem de conclusão se existir
    if (complationMessage) {
      const body = formatBody(`\u200e${complationMessage}`, ticket.contact);
      await SendWhatsAppMessage({ body, ticket });
    }

    // Atualiza o tracking do ticket
    await ticketTraking.update({
      finishedAt: moment().toDate(),
      rated: true,
      ratingAttempts: 0
    });

    // Atualiza o ticket
    await ticket.update({
      queueId: null,
      chatbot: null,
      queueOptionId: null,
      userId: null,
      status: "closed",
    });

    // Notifica os clientes conectados sobre as mudanças
    io.to(`company-${ticket.companyId}-open`)
      .to(`queue-${ticket.queueId}-open`)
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "delete",
        ticket,
        ticketId: ticket.id,
      });

    io.to(`company-${ticket.companyId}-${ticket.status}`)
      .to(`queue-${ticket.queueId}-${ticket.status}`)
      .to(ticket.id.toString())
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id,
      });
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
};

/**
 * Reseta o modo de avaliação quando o atendente reabre o ticket
 * @param ticket - O ticket sendo atualizado
 * @param ticketTraking - O objeto de tracking do ticket
 */
export const resetRatingOnReopen = async (
  ticket: Ticket,
  ticketTraking: TicketTraking
): Promise<void> => {
  try {
    // Reseta o tracking da avaliação
    await ticketTraking.update({
      ratingAt: null,
      rated: true,
      ratingAttempts: 0
    });

    // Atualiza o ticket para o novo atendimento
    await ticket.update({
      status: "pending"
    });

    // Notifica os clientes conectados
    const io = getIO();
    io.to(`company-${ticket.companyId}-${ticket.status}`)
      .to(`queue-${ticket.queueId}-${ticket.status}`)
      .to(ticket.id.toString())
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id
      });
  } catch (error) {
    Sentry.captureException(error);
  }
};